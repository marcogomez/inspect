import type { Surface } from "./surface";
import type { Widget } from "./widget";

/** A captured pointer and the widget currently receiving its move/up events. */
interface ActivePointer {
  id: number;
  widget: Widget | null;
}

const MAX_POINTERS = 10;
const MAX_HOVER_CHAIN_DEPTH = 64;

/**
 * Routes pointer, wheel, and keyboard events from a canvas to the widget tree.
 * Manages pointer capture, focus, and hover chain diffing.
 */
export class InputDispatcher {
  private surface: Surface;
  private focusedWidget: Widget | null = null;
  private activePointers: ActivePointer[] = Array.from({ length: MAX_POINTERS }, () => ({ id: 0, widget: null }));
  private activePointerCount = 0;
  private cachedRect: DOMRect | null = null;
  private rectFrameId = -1;
  private _localX = 0;
  private _localY = 0;

  private oldHoverChain: (Widget | null)[] = new Array<Widget | null>(MAX_HOVER_CHAIN_DEPTH).fill(null);
  private newHoverChain: (Widget | null)[] = new Array<Widget | null>(MAX_HOVER_CHAIN_DEPTH).fill(null);
  private oldHoverLength = 0;
  private newHoverLength = 0;

  private onPointerDownBound: (event: PointerEvent) => void;
  private onPointerUpBound: (event: PointerEvent) => void;
  private onPointerMoveBound: (event: PointerEvent) => void;
  private onPointerCancelBound: (event: PointerEvent) => void;
  private onPointerLeaveBound: () => void;
  private onWheelBound: (event: WheelEvent) => void;
  private onKeyDownBound: (event: KeyboardEvent) => void;
  private onKeyUpBound: (event: KeyboardEvent) => void;

  /** binds and attaches the canvas pointer, wheel, and keyboard listeners, and makes the canvas focusable. */
  constructor(surface: Surface) {
    this.surface = surface;

    this.onPointerDownBound = this.handlePointerDown.bind(this);
    this.onPointerUpBound = this.handlePointerUp.bind(this);
    this.onPointerMoveBound = this.handlePointerMove.bind(this);
    this.onPointerCancelBound = this.handlePointerCancel.bind(this);
    this.onPointerLeaveBound = this.clearHoverChain.bind(this);
    this.onWheelBound = this.handleWheel.bind(this);
    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onKeyUpBound = this.handleKeyUp.bind(this);

    const canvas = surface.canvas;
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", this.onPointerDownBound);
    canvas.addEventListener("pointerup", this.onPointerUpBound);
    canvas.addEventListener("pointermove", this.onPointerMoveBound);
    canvas.addEventListener("pointercancel", this.onPointerCancelBound);
    canvas.addEventListener("pointerleave", this.onPointerLeaveBound);
    canvas.addEventListener("wheel", this.onWheelBound, { passive: false });
    canvas.addEventListener("keydown", this.onKeyDownBound);
    canvas.addEventListener("keyup", this.onKeyUpBound);
    canvas.tabIndex = 0;
  }

  /** Transfers keyboard focus to the given widget, firing blur/focus callbacks. */
  public setFocus(widget: Widget | null): void {
    if (this.focusedWidget === widget) {
      return;
    }
    if (this.focusedWidget) {
      this.focusedWidget.focused = false;
      this.focusedWidget.onBlur();
    }
    this.focusedWidget = widget;
    if (widget) {
      widget.focused = true;
      widget.onFocus();
    }
  }

  /** Returns the number of currently captured pointers (active drags). */
  public getActivePointerCount(): number {
    return this.activePointerCount;
  }

  /** Removes all event listeners and clears hover/pointer state. */
  public dispose(): void {
    const canvas = this.surface.canvas;
    canvas.removeEventListener("pointerdown", this.onPointerDownBound);
    canvas.removeEventListener("pointerup", this.onPointerUpBound);
    canvas.removeEventListener("pointermove", this.onPointerMoveBound);
    canvas.removeEventListener("pointercancel", this.onPointerCancelBound);
    canvas.removeEventListener("pointerleave", this.onPointerLeaveBound);
    canvas.removeEventListener("wheel", this.onWheelBound);
    canvas.removeEventListener("keydown", this.onKeyDownBound);
    canvas.removeEventListener("keyup", this.onKeyUpBound);
    this.activePointerCount = 0;
    this.clearHoverChain();
  }

  /**
   * Returns the canvas's screen rect for client-to-local coordinate mapping.
   *
   * The rect is cached to keep the high-frequency pointermove and wheel path
   * off `getBoundingClientRect`, which can force a synchronous layout. The
   * canvas's on-screen position can change with no content repaint (the panel
   * is `position: fixed` and slides via a CSS transition, the page scrolls, the
   * browser zooms), so a cache keyed only to `frameId` (which advances only on a
   * repaint) goes stale and every hit test misses until something repaints. To
   * stay correct, each interaction forces a fresh read at pointerdown via
   * `forceRefresh`; the cache still serves drags and hover, and refreshes
   * whenever a repaint advances `frameId`.
   */
  private getRect(forceRefresh = false): DOMRect {
    const frameId = this.surface.frameId;
    if (!forceRefresh && this.cachedRect && this.rectFrameId === frameId) {
      return this.cachedRect;
    }
    this.cachedRect = this.surface.canvas.getBoundingClientRect();
    this.rectFrameId = frameId;
    return this.cachedRect;
  }

  /** maps a pointer event's client coordinates into canvas-local coordinates, stored in _localX/_localY. */
  private computeLocalCoords(event: PointerEvent, forceRefresh = false): void {
    const rect = this.getRect(forceRefresh);
    this._localX = event.clientX - rect.left;
    this._localY = event.clientY - rect.top;
  }

  /** index of the active pointer with the given id, or -1 when it is not captured. */
  private findActivePointer(pointerId: number): number {
    for (let index = 0; index < this.activePointerCount; index++) {
      if (this.activePointers[index].id === pointerId) {
        return index;
      }
    }
    return -1;
  }

  /** fills chain with the ancestor path from the root down to widget and returns its depth. */
  private buildChain(widget: Widget | null, chain: (Widget | null)[]): number {
    let depth = 0;
    let current = widget;
    while (current && depth < MAX_HOVER_CHAIN_DEPTH) {
      chain[depth++] = current;
      current = current.parent;
    }
    for (let left = 0, right = depth - 1; left < right; left++, right--) {
      const swapTemp = chain[left];
      chain[left] = chain[right];
      chain[right] = swapTemp;
    }
    return depth;
  }

  /**
   * Diffs the previous hover chain against the chain for the newly hit widget:
   * everything below the shared prefix in the old chain gets a pointer-leave,
   * and everything below it in the new chain gets a pointer-enter. The chains
   * are then swapped so the new one becomes current.
   */
  private updateHover(hit: Widget | null): void {
    this.newHoverLength = this.buildChain(hit, this.newHoverChain);

    const commonLength = Math.min(this.oldHoverLength, this.newHoverLength);
    let divergencePoint = 0;
    while (
      divergencePoint < commonLength &&
      this.oldHoverChain[divergencePoint] === this.newHoverChain[divergencePoint]
    ) {
      divergencePoint++;
    }

    for (let index = this.oldHoverLength - 1; index >= divergencePoint; index--) {
      const widget = this.oldHoverChain[index];
      if (widget) {
        widget.onPointerLeave();
      }
    }

    for (let index = divergencePoint; index < this.newHoverLength; index++) {
      const widget = this.newHoverChain[index];
      if (widget) {
        widget.onPointerEnter();
      }
    }

    const swapChain = this.oldHoverChain;
    this.oldHoverChain = this.newHoverChain;
    this.newHoverChain = swapChain;
    this.oldHoverLength = this.newHoverLength;

    for (let index = 0; index < this.newHoverLength; index++) {
      this.newHoverChain[index] = null;
    }
  }

  /** fires pointer-leave up the current hover chain and empties it, used on pointerleave and dispose. */
  private clearHoverChain(): void {
    for (let index = this.oldHoverLength - 1; index >= 0; index--) {
      const widget = this.oldHoverChain[index];
      if (widget) {
        widget.onPointerLeave();
      }
      this.oldHoverChain[index] = null;
    }
    this.oldHoverLength = 0;
  }

  /**
   * Hit tests the press point, then walks up from the hit widget offering the
   * event to each ancestor until one claims it. The claimer captures the
   * pointer, is recorded as active, and receives focus when focusable.
   */
  private handlePointerDown(event: PointerEvent): void {
    if (this.activePointerCount >= MAX_POINTERS) {
      return;
    }
    // start of an interaction: re-read the canvas rect so a click is never
    // mapped through a stale position (e.g. after the panel slid via CSS)
    this.computeLocalCoords(event, true);
    const x = this._localX;
    const y = this._localY;
    const hit = this.findHit(x, y);
    if (!hit) {
      return;
    }

    let handler: Widget | null = hit;
    while (handler) {
      const localX = x - this.widgetGlobalX(handler);
      const localY = y - this.widgetGlobalY(handler);
      if (handler.onPointerDown(event.pointerId, localX, localY, event.button)) {
        this.surface.canvas.setPointerCapture(event.pointerId);
        const slot = this.activePointers[this.activePointerCount];
        slot.id = event.pointerId;
        slot.widget = handler;
        this.activePointerCount++;
        if (handler.focusable) {
          this.setFocus(handler);
        }
        return;
      }
      handler = handler.parent;
    }
  }

  /** delivers pointer-up to the capturing widget, then releases the capture and frees the active-pointer slot. */
  private handlePointerUp(event: PointerEvent): void {
    const pointerIndex = this.findActivePointer(event.pointerId);
    if (pointerIndex === -1) {
      return;
    }

    const activePointer = this.activePointers[pointerIndex];
    this.computeLocalCoords(event);
    const x = this._localX;
    const y = this._localY;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const capturedWidget = activePointer.widget!;
    capturedWidget.onPointerUp(
      event.pointerId,

      x - this.widgetGlobalX(capturedWidget),

      y - this.widgetGlobalY(capturedWidget),
      event.button
    );

    this.activePointerCount--;
    if (pointerIndex < this.activePointerCount) {
      const last = this.activePointers[this.activePointerCount];
      this.activePointers[pointerIndex].id = last.id;
      this.activePointers[pointerIndex].widget = last.widget;
    }
    this.activePointers[this.activePointerCount].widget = null;
    this.surface.canvas.releasePointerCapture(event.pointerId);
  }

  /** routes a move to the capturing widget during a drag, else updates hover and forwards it to the hit widget. */
  private handlePointerMove(event: PointerEvent): void {
    this.computeLocalCoords(event);
    const x = this._localX;
    const y = this._localY;

    const pointerIndex = this.findActivePointer(event.pointerId);
    if (pointerIndex !== -1) {
      const activePointer = this.activePointers[pointerIndex];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      activePointer.widget!.onPointerMove(
        event.pointerId,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        x - this.widgetGlobalX(activePointer.widget!),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        y - this.widgetGlobalY(activePointer.widget!)
      );
      return;
    }

    const hit = this.findHit(x, y);
    this.updateHover(hit);

    if (hit) {
      hit.onPointerMove(event.pointerId, x - this.widgetGlobalX(hit), y - this.widgetGlobalY(hit));
    }
  }

  /** drops a cancelled pointer's active slot without dispatching an up event. */
  private handlePointerCancel(event: PointerEvent): void {
    const pointerIndex = this.findActivePointer(event.pointerId);
    if (pointerIndex !== -1) {
      this.activePointerCount--;
      if (pointerIndex < this.activePointerCount) {
        const last = this.activePointers[this.activePointerCount];
        this.activePointers[pointerIndex].id = last.id;
        this.activePointers[pointerIndex].widget = last.widget;
      }
      this.activePointers[this.activePointerCount].widget = null;
    }
  }

  /** walks up from the widget under the pointer offering the wheel delta; the first to consume it stops page scroll. */
  private handleWheel(event: WheelEvent): void {
    const rect = this.getRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let target = this.findHit(x, y);
    while (target) {
      if (target.onWheel(event.deltaX, event.deltaY)) {
        event.preventDefault();
        return;
      }
      target = target.parent;
    }
  }

  /** offers key-down to the focused widget and its ancestors; first to consume prevents default (ctrl covers meta). */
  private handleKeyDown(event: KeyboardEvent): void {
    let target = this.focusedWidget;
    while (target) {
      if (target.onKeyDown(event.key, event.code, event.ctrlKey || event.metaKey, event.shiftKey, event.altKey)) {
        event.preventDefault();
        return;
      }
      target = target.parent;
    }
  }

  /** forwards key-up to the focused widget only. */
  private handleKeyUp(event: KeyboardEvent): void {
    if (this.focusedWidget) {
      this.focusedWidget.onKeyUp(event.key, event.code);
    }
  }

  /** deepest widget under the given canvas-local point, or null when there is no root. */
  private findHit(x: number, y: number): Widget | null {
    return this.surface.getRoot()?.hitTest(x, y) ?? null;
  }

  /** absolute x of a widget, used to convert canvas-local coordinates into widget-local ones. */
  private widgetGlobalX(widget: Widget): number {
    return widget.absoluteX;
  }

  /** absolute y of a widget, used to convert canvas-local coordinates into widget-local ones. */
  private widgetGlobalY(widget: Widget): number {
    return widget.absoluteY;
  }
}
