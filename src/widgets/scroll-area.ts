import {
  SLOT_HEIGHT,
  SLOT_PADDING_LEFT,
  SLOT_PADDING_RIGHT,
  SLOT_PADDING_TOP,
  SLOT_WIDTH,
  SLOT_X,
  SLOT_Y,
  THEME_DEFAULT,
  Widget
} from "../core/widget";
import { DEFAULTS } from "../defaults";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";

/** determines how scroll position is calculated relative to content. */
export type ScrollAnchorMode = "top" | "center";

/** scrollable container widget with virtual scrolling, scrollbar, and anchor modes. */
export class ScrollArea extends Widget {
  /** current vertical scroll offset in pixels. */
  public scrollY = 0;
  /** total height of scrollable content in pixels. */
  public contentHeight = 0;
  /** whether the scrollbar track and thumb are drawn. */
  public showScrollbar = true;
  /** scrollbar track width in pixels. */
  public scrollbarWidth = DEFAULTS.scrollDefaultWidth;
  /** scrollbar track color override. */
  public scrollbarColor: number = THEME_DEFAULT;
  /** scrollbar thumb color override. */
  public thumbColor: number = THEME_DEFAULT;
  /** background fill color; zero for transparent. */
  public bgColor = 0;

  /** scroll positioning strategy: "top" uses scrollY, "center" anchors around anchorRow. */
  public anchorMode: ScrollAnchorMode = "top";
  /** row index used as the center anchor when anchorMode is "center". */
  public anchorRow = 0;
  /** height of each row in pixels; used for virtual scrolling calculations. */
  public rowHeight = 0;
  /** additional user scroll offset applied in "center" anchor mode. */
  public manualScrollOffset = 0;

  private thumbDragging = false;
  private thumbDragStartY = 0;
  private thumbDragStartScroll = 0;
  private thumbPointerId = -1;

  private _visibleStartRow = 0;
  private _visibleEndRow = 0;

  /** first visible row index (inclusive) based on current scroll state. */
  public get visibleStartRow(): number {
    return this._visibleStartRow;
  }

  /** last visible row index (exclusive) based on current scroll state. */
  public get visibleEndRow(): number {
    return this._visibleEndRow;
  }

  /** recalculates visible row range from current scroll position and viewport height. */
  public computeVisibleRange(): void {
    const widgetHeight = this.height;
    if (this.rowHeight <= 0 || widgetHeight <= 0) {
      this._visibleStartRow = 0;
      this._visibleEndRow = 0;
      return;
    }

    const totalRows = this.rowHeight > 0 ? Math.ceil(this.contentHeight / this.rowHeight) : 0;

    if (this.anchorMode === "center") {
      const halfVisible = ((widgetHeight / 2 + Math.abs(this.manualScrollOffset)) / this.rowHeight) | 0;
      this._visibleStartRow = Math.max(0, this.anchorRow - halfVisible - 1);
      this._visibleEndRow = Math.min(totalRows, this.anchorRow + halfVisible + 2);
    } else {
      this._visibleStartRow = Math.max(0, (this.scrollY / this.rowHeight) | 0);
      this._visibleEndRow = Math.min(totalRows, this._visibleStartRow + Math.ceil(widgetHeight / this.rowHeight) + 1);
    }
  }

  /** returns the y-coordinate of a row relative to the scroll area top. */
  public getRowY(row: number): number {
    if (this.anchorMode === "center") {
      const widgetHeight = this.height;
      const centerY = ((widgetHeight / 2) | 0) + this.manualScrollOffset;
      return (centerY + (row - this.anchorRow) * this.rowHeight - this.rowHeight / 2) | 0;
    }
    return (row * this.rowHeight - this.scrollY) | 0;
  }

  /** returns the logical scroll offset accounting for anchor mode. */
  public getEffectiveScroll(): number {
    if (this.anchorMode === "center") {
      return Math.max(0, this.anchorRow * this.rowHeight - this.height / 2);
    }
    return this.scrollY;
  }

  /** adds scrollbar width to right padding so content does not overlap the track. */
  public reserveScrollbarSpace(): void {
    if (this.showScrollbar) {
      this.geometry[SLOT_PADDING_RIGHT] += this.scrollbarWidth;
    }
  }

  /** runs base layout, measures content height, and applies the scroll offset to children. */
  public override computeLayout(): void {
    const wasLayoutDirty = this.needsLayout;
    super.computeLayout();

    if (wasLayoutDirty) {
      let bottom = 0;
      for (let i = this.children.length - 1; i >= 0; i--) {
        if (this.children[i].visible) {
          const childBottom = this.children[i].geometry[SLOT_Y] + this.children[i].geometry[SLOT_HEIGHT];
          if (childBottom > bottom) {
            bottom = childBottom;
          }
        }
      }
      this.contentHeight = bottom;
    }

    if (this.anchorMode !== "center" && this.scrollY !== 0) {
      this.offsetChildrenAbsoluteY(this, -this.scrollY);
    }
  }

  /** scratch traversal stack shared across instances, reused to avoid per-call allocation. */
  private static _offsetStack: Widget[] = [];

  /**
   * Shifts the absolute y of every descendant by offset. It walks the subtree
   * iteratively with a reused static stack rather than recursing, since this
   * runs during layout for every scrolled frame.
   */
  private offsetChildrenAbsoluteY(root: Widget, offset: number): void {
    const stack = ScrollArea._offsetStack;
    let stackLen = 0;
    stack[stackLen++] = root;
    while (stackLen > 0) {
      const parent = stack[--stackLen];
      const children = parent.children;
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        child.absoluteY = (child.absoluteY + offset) | 0;
        if (child.children.length > 0) {
          stack[stackLen++] = child;
        }
      }
    }
  }

  /** paints the background and, when content overflows, the scrollbar track and a thumb sized to the scroll ratio. */
  protected override drawSelf(renderer: Renderer, theme: Theme): void {
    const widgetWidth = this.width;
    const widgetHeight = this.height;

    if (this.bgColor) {
      renderer.fillRect(0, 0, widgetWidth, widgetHeight, this.bgColor);
    }

    if (!this.showScrollbar || this.contentHeight <= widgetHeight) {
      return;
    }

    const scrollbarX = widgetWidth - this.scrollbarWidth;
    const ratio = widgetHeight / this.contentHeight;
    const thumbHeight = Math.max(DEFAULTS.scrollThumbMinHeight, (ratio * widgetHeight) | 0);
    const scrollRange = this.contentHeight - widgetHeight;
    const trackRange = widgetHeight - thumbHeight;
    const effectiveScroll = this.getEffectiveScroll();
    const thumbY = scrollRange > 0 ? ((effectiveScroll / scrollRange) * trackRange) | 0 : 0;

    const resolvedScrollbarColor = this.scrollbarColor === THEME_DEFAULT ? theme.bgScrollTrack : this.scrollbarColor;
    const resolvedThumbColor = this.thumbColor === THEME_DEFAULT ? theme.bgScrollThumb : this.thumbColor;
    renderer.fillRect(scrollbarX, 0, this.scrollbarWidth, widgetHeight, resolvedScrollbarColor);
    renderer.fillRoundedRect(
      scrollbarX,
      thumbY,
      this.scrollbarWidth,
      thumbHeight,
      DEFAULTS.scrollThumbBorderRadius,
      resolvedThumbColor
    );
  }

  /**
   * Paints children clipped to the content box, culling those scrolled out of
   * view. In "center" mode children keep their positions, otherwise the content
   * is translated up by the scroll offset before drawing.
   */
  protected override drawChildren(renderer: Renderer, theme: Theme): void {
    const padLeft = this.geometry[SLOT_PADDING_LEFT];
    const padTop = this.geometry[SLOT_PADDING_TOP];
    const innerWidth = this.innerWidth;
    const innerHeight = this.innerHeight;

    renderer.pushTranslateClip(padLeft, padTop, 0, 0, innerWidth, innerHeight);

    if (this.anchorMode === "center") {
      for (let index = 0; index < this.children.length; index++) {
        const child = this.children[index];
        if (!child.visible) {
          continue;
        }
        const childGeometry = child.geometry;
        if (childGeometry[SLOT_Y] + childGeometry[SLOT_HEIGHT] < 0 || childGeometry[SLOT_Y] > innerHeight) {
          continue;
        }
        renderer.pushTranslateClip(
          childGeometry[SLOT_X],
          childGeometry[SLOT_Y],
          0,
          0,
          childGeometry[SLOT_WIDTH],
          childGeometry[SLOT_HEIGHT]
        );
        child.draw(renderer, theme);
        renderer.popTranslateClip();
      }
    } else {
      const scrollOffset = this.scrollY;
      renderer.pushTranslate(0, -scrollOffset);
      for (let index = 0; index < this.children.length; index++) {
        const child = this.children[index];
        if (!child.visible) {
          continue;
        }
        const childGeometry = child.geometry;
        const childScreenY = childGeometry[SLOT_Y] - scrollOffset;
        if (childScreenY + childGeometry[SLOT_HEIGHT] < 0 || childScreenY > innerHeight) {
          continue;
        }
        renderer.pushTranslateClip(
          childGeometry[SLOT_X],
          childGeometry[SLOT_Y],
          0,
          0,
          childGeometry[SLOT_WIDTH],
          childGeometry[SLOT_HEIGHT]
        );
        child.draw(renderer, theme);
        renderer.popTranslateClip();
      }
      renderer.popTranslate();
    }

    renderer.popTranslateClip();
  }

  /** scrolls on wheel input; returns false when content fits without scrolling. */
  public override onWheel(_deltaX: number, deltaY: number): boolean {
    if (this.contentHeight <= this.height) {
      return false;
    }
    if (this.anchorMode === "center") {
      this.manualScrollOffset += deltaY < 0 ? DEFAULTS.scrollSpeed : -DEFAULTS.scrollSpeed;
      this.markDirty();
      return true;
    }
    this.scrollBy(deltaY > 0 ? DEFAULTS.scrollSpeed : -DEFAULTS.scrollSpeed);
    return true;
  }

  /** begins thumb drag when the left button is pressed over the scrollbar track. */
  public override onPointerDown(pointerId: number, x: number, y: number, button: number): boolean {
    if (button !== 0) {
      return false;
    }
    const widgetWidth = this.width;
    const widgetHeight = this.height;
    if (!this.showScrollbar || this.contentHeight <= widgetHeight) {
      return false;
    }
    if (x < widgetWidth - this.scrollbarWidth) {
      return false;
    }

    this.thumbDragging = true;
    this.thumbPointerId = pointerId;
    this.thumbDragStartY = y;
    this.thumbDragStartScroll = this.scrollY;
    return true;
  }

  /** updates scroll position while dragging the scrollbar thumb. */
  public override onPointerMove(pointerId: number, _x: number, y: number): void {
    if (!this.thumbDragging || pointerId !== this.thumbPointerId) {
      return;
    }
    const widgetHeight = this.height;
    const ratio = widgetHeight / this.contentHeight;
    const thumbHeight = Math.max(DEFAULTS.scrollThumbMinHeight, (ratio * widgetHeight) | 0);
    const trackRange = widgetHeight - thumbHeight;
    const scrollRange = this.contentHeight - widgetHeight;
    if (trackRange <= 0) {
      return;
    }
    const dragDelta = y - this.thumbDragStartY;
    const scrollDelta = (dragDelta / trackRange) * scrollRange;
    this.setScroll(this.thumbDragStartScroll + scrollDelta);
  }

  /** ends any active thumb drag for the given pointer. */
  public override onPointerUp(pointerId: number, _x: number, _y: number, _button: number): void {
    if (pointerId === this.thumbPointerId) {
      this.thumbDragging = false;
      this.thumbPointerId = -1;
    }
  }

  /** scrolls by a relative delta, clamped to valid range. */
  public scrollBy(delta: number): void {
    this.setScroll(this.scrollY + delta);
  }

  /** sets the absolute scroll position, clamped between 0 and max scroll. */
  public setScroll(value: number): void {
    const maxScroll = Math.max(0, this.contentHeight - this.innerHeight);
    const clamped = Math.max(0, Math.min(maxScroll, value));
    if (clamped !== this.scrollY) {
      this.scrollY = clamped;
      this.markDirty();
    }
  }

  /** returns the scrollbar, a child, or this widget at the given local point. */
  public override hitTest(x: number, y: number): Widget | null {
    if (!this.visible) {
      return null;
    }
    const widgetWidth = this.width;
    const widgetHeight = this.height;
    if (this.showScrollbar && this.contentHeight > widgetHeight && x >= widgetWidth - this.scrollbarWidth) {
      return this;
    }

    const innerX = x - this.geometry[SLOT_PADDING_LEFT];
    const innerY = y - this.geometry[SLOT_PADDING_TOP];
    const offsetY = this.anchorMode === "center" ? 0 : this.scrollY;
    for (let index = this.children.length - 1; index >= 0; index--) {
      const child = this.children[index];
      if (!child.visible) {
        continue;
      }
      const childGeometry = child.geometry;
      const localX = innerX - childGeometry[SLOT_X];
      const localY = innerY + offsetY - childGeometry[SLOT_Y];
      if (localX >= 0 && localX < childGeometry[SLOT_WIDTH] && localY >= 0 && localY < childGeometry[SLOT_HEIGHT]) {
        const hit = child.hitTest(localX, localY);
        if (hit) {
          return hit;
        }
      }
    }
    return this;
  }
}
