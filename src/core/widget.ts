import type { Layout } from "./layout";
import type { Renderer } from "./renderer";
import type { Surface } from "./surface";
import type { Theme } from "./theme";

// Slot indices into the packed geometry Float32Array. Keeping every widget's
// layout values (position, size, constraints, padding) in one contiguous typed
// array holds them in a compact block rather than scattered object properties,
// which the layout passes touch repeatedly.
const SLOT_X = 0;
const SLOT_Y = 1;
const SLOT_WIDTH = 2;
const SLOT_HEIGHT = 3;
const SLOT_PREFERRED_WIDTH = 4;
const SLOT_PREFERRED_HEIGHT = 5;
const SLOT_MIN_WIDTH = 6;
const SLOT_MIN_HEIGHT = 7;
const SLOT_MAX_WIDTH = 8;
const SLOT_MAX_HEIGHT = 9;
const SLOT_FLEX_GROW = 10;
const SLOT_FLEX_SHRINK = 11;
const SLOT_PADDING_TOP = 12;
const SLOT_PADDING_RIGHT = 13;
const SLOT_PADDING_BOTTOM = 14;
const SLOT_PADDING_LEFT = 15;
const SLOT_COUNT = 16;

export {
  SLOT_X,
  SLOT_Y,
  SLOT_WIDTH,
  SLOT_HEIGHT,
  SLOT_PREFERRED_WIDTH,
  SLOT_PREFERRED_HEIGHT,
  SLOT_MIN_WIDTH,
  SLOT_MIN_HEIGHT,
  SLOT_MAX_WIDTH,
  SLOT_MAX_HEIGHT,
  SLOT_FLEX_GROW,
  SLOT_FLEX_SHRINK,
  SLOT_PADDING_TOP,
  SLOT_PADDING_RIGHT,
  SLOT_PADDING_BOTTOM,
  SLOT_PADDING_LEFT,
  SLOT_COUNT
};

/** Horizontal text alignment within a label. */
export type HAlign = "left" | "center" | "right";
/** Vertical text alignment within a label. */
export type VAlign = "top" | "middle" | "bottom";
/** How a widget computes its size along a given axis. */
export type SizingType = "fit" | "grow" | "fixed" | "percent";
/** Cross-axis alignment override for a child within a stack layout. */
export type CrossAlign = "start" | "center" | "end" | "stretch";
/** Quantization mode for design-scale rendering (integer or power-of-two steps). */
export type DesignScaleSnap = "none" | "binary" | "pixel-perfect";

/** Sentinel value indicating a color should be resolved from the current theme. */
export const THEME_DEFAULT = -1;

/**
 * Base class for all UI elements. Holds geometry in a packed Float32Array,
 * supports layout delegation, absolute positioning, design-scale rendering,
 * hit testing, and input event dispatch.
 */
export class Widget {
  public parent: Widget | null = null;
  public surface: Surface | null = null;
  public children: Widget[] = [];

  /** Packed layout geometry: x, y, width, height, preferred sizes, min/max, flex, padding. */
  public readonly geometry = new Float32Array(SLOT_COUNT);

  private _visible = true;
  private _effectivelyVisible = true;
  public enabled = true;
  public focusable = false;
  public focused = false;
  public absolute = false;
  private _hasAbsoluteChildren = false;
  public anchorTop = NaN;
  public anchorRight = NaN;
  public anchorBottom = NaN;
  public anchorLeft = NaN;

  public absoluteX = 0;
  public absoluteY = 0;

  public sizingX: SizingType = "fit";
  public sizingY: SizingType = "fit";
  public percentWidth = 0;
  public percentHeight = 0;
  public alignSelf: CrossAlign | null = null;

  public autoFitScale = false;
  public fitReferenceWidth = 0;
  public fitReferenceHeight = 0;
  public minScale = 1;
  public maxScale = 1;
  public computedScale = 1;

  public designWidth = 0;
  public designHeight = 0;
  public designScaleSnap: DesignScaleSnap = "none";
  public designScaleStep = 0;
  public designScale = 1;
  public screenScale = 1;
  private designOffsetX = 0;
  private designOffsetY = 0;
  private virtualWidth = 0;
  private virtualHeight = 0;

  public layout: Layout | null = null;
  public needsLayout = true;

  /** seeds the max-size slots with a large sentinel so a widget is effectively unbounded until constrained. */
  constructor() {
    this.geometry[SLOT_MAX_WIDTH] = 1e7;
    this.geometry[SLOT_MAX_HEIGHT] = 1e7;
  }

  /** whether this widget is shown; hidden widgets are skipped by layout, hit testing, and drawing. */
  public get visible(): boolean {
    return this._visible;
  }

  /** toggles visibility and propagates the ancestor-aware effective visibility down to descendants. */
  public set visible(value: boolean) {
    if (this._visible === value) {
      return;
    }
    this._visible = value;
    this.propagateEffectiveVisibility(this._visible && (this.parent ? this.parent._effectivelyVisible : true));
  }

  private propagateEffectiveVisibility(parentVisible: boolean): void {
    const eff = this._visible && parentVisible;
    if (eff === this._effectivelyVisible) {
      return;
    }
    this._effectivelyVisible = eff;
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].propagateEffectiveVisibility(eff);
    }
  }

  /** horizontal offset from the parent's content origin, in local (pre-scale) pixels. */
  public get x(): number {
    return this.geometry[SLOT_X];
  }
  public set x(value: number) {
    this.geometry[SLOT_X] = value;
  }
  /** vertical offset from the parent's content origin, in local (pre-scale) pixels. */
  public get y(): number {
    return this.geometry[SLOT_Y];
  }
  public set y(value: number) {
    this.geometry[SLOT_Y] = value;
  }
  /** laid-out width in local pixels, filled in by the layout pass. */
  public get width(): number {
    return this.geometry[SLOT_WIDTH];
  }
  public set width(value: number) {
    this.geometry[SLOT_WIDTH] = value;
  }
  /** laid-out height in local pixels, filled in by the layout pass. */
  public get height(): number {
    return this.geometry[SLOT_HEIGHT];
  }
  public set height(value: number) {
    this.geometry[SLOT_HEIGHT] = value;
  }

  /** width requested when sizingX is "fixed", and the starting size for other modes. */
  public get preferredWidth(): number {
    return this.geometry[SLOT_PREFERRED_WIDTH];
  }
  public set preferredWidth(value: number) {
    this.geometry[SLOT_PREFERRED_WIDTH] = value;
  }
  /** height requested when sizingY is "fixed", and the starting size for other modes. */
  public get preferredHeight(): number {
    return this.geometry[SLOT_PREFERRED_HEIGHT];
  }
  public set preferredHeight(value: number) {
    this.geometry[SLOT_PREFERRED_HEIGHT] = value;
  }
  /** lower bound the layout clamps the resolved width to. */
  public get minWidth(): number {
    return this.geometry[SLOT_MIN_WIDTH];
  }
  public set minWidth(value: number) {
    this.geometry[SLOT_MIN_WIDTH] = value;
  }
  /** lower bound the layout clamps the resolved height to. */
  public get minHeight(): number {
    return this.geometry[SLOT_MIN_HEIGHT];
  }
  public set minHeight(value: number) {
    this.geometry[SLOT_MIN_HEIGHT] = value;
  }
  /** upper bound the layout clamps the resolved width to (defaults to 1e7). */
  public get maxWidth(): number {
    return this.geometry[SLOT_MAX_WIDTH];
  }
  public set maxWidth(value: number) {
    this.geometry[SLOT_MAX_WIDTH] = value;
  }
  /** upper bound the layout clamps the resolved height to (defaults to 1e7). */
  public get maxHeight(): number {
    return this.geometry[SLOT_MAX_HEIGHT];
  }
  public set maxHeight(value: number) {
    this.geometry[SLOT_MAX_HEIGHT] = value;
  }
  /** share of leftover main-axis space this widget claims when growing. */
  public get flexGrow(): number {
    return this.geometry[SLOT_FLEX_GROW];
  }
  public set flexGrow(value: number) {
    this.geometry[SLOT_FLEX_GROW] = value;
  }
  /** weight used when shrinking this widget to resolve a main-axis overflow. */
  public get flexShrink(): number {
    return this.geometry[SLOT_FLEX_SHRINK];
  }
  public set flexShrink(value: number) {
    this.geometry[SLOT_FLEX_SHRINK] = value;
  }

  /** sets per-side padding (top, right, bottom, left). */
  public setPadding(top: number, right: number, bottom: number, left: number): void {
    this.geometry[SLOT_PADDING_TOP] = top;
    this.geometry[SLOT_PADDING_RIGHT] = right;
    this.geometry[SLOT_PADDING_BOTTOM] = bottom;
    this.geometry[SLOT_PADDING_LEFT] = left;
  }

  /** sets the same padding on all four sides. */
  public setPaddingAll(value: number): void {
    this.setPadding(value, value, value, value);
  }

  /** content-box width: width minus left and right padding. */
  public get innerWidth(): number {
    return this.geometry[SLOT_WIDTH] - this.geometry[SLOT_PADDING_LEFT] - this.geometry[SLOT_PADDING_RIGHT];
  }

  /** content-box height: height minus top and bottom padding. */
  public get innerHeight(): number {
    return this.geometry[SLOT_HEIGHT] - this.geometry[SLOT_PADDING_TOP] - this.geometry[SLOT_PADDING_BOTTOM];
  }

  /** local x of the content box, which equals the left padding. */
  public get innerX(): number {
    return this.geometry[SLOT_PADDING_LEFT];
  }

  /** local y of the content box, which equals the top padding. */
  public get innerY(): number {
    return this.geometry[SLOT_PADDING_TOP];
  }

  /** font atlas from the surface's current theme, or null when no surface or font is set. */
  protected resolveFont(): import("./atlas").FontAtlas | null {
    return this.surface?.getTheme()?.fontAtlas ?? null;
  }

  /** intrinsic content width, overridden by widgets that render content. */
  public getContentWidth(): number {
    return 0;
  }
  /** intrinsic content height, overridden by widgets that render content. */
  public getContentHeight(): number {
    return 0;
  }

  /** Computes the natural width this widget would occupy without external constraints. */
  public measureIntrinsicWidth(): number {
    if (this.sizingX === "fixed") {
      return this.preferredWidth;
    }
    if (this.sizingX === "grow" || this.sizingX === "percent") {
      return this.geometry[SLOT_MIN_WIDTH];
    }
    if (this.preferredWidth > 0) {
      return this.preferredWidth;
    }
    if (this.layout) {
      return this.layout.measureWidth(this) + this.geometry[SLOT_PADDING_LEFT] + this.geometry[SLOT_PADDING_RIGHT];
    }
    return this.getContentWidth() + this.geometry[SLOT_PADDING_LEFT] + this.geometry[SLOT_PADDING_RIGHT];
  }

  /** Computes the natural height this widget would occupy without external constraints. */
  public measureIntrinsicHeight(): number {
    if (this.sizingY === "fixed") {
      return this.preferredHeight;
    }
    if (this.sizingY === "grow" || this.sizingY === "percent") {
      return this.geometry[SLOT_MIN_HEIGHT];
    }
    if (this.preferredHeight > 0) {
      return this.preferredHeight;
    }
    if (this.layout) {
      return this.layout.measureHeight(this) + this.geometry[SLOT_PADDING_TOP] + this.geometry[SLOT_PADDING_BOTTOM];
    }
    return this.getContentHeight() + this.geometry[SLOT_PADDING_TOP] + this.geometry[SLOT_PADDING_BOTTOM];
  }

  /** attaches a child, inheriting surface and effective visibility, and marks dirty. */
  public addChild(child: Widget): void {
    child.parent = this;
    child.propagateEffectiveVisibility(this._effectivelyVisible);
    if (child.absolute) {
      this._hasAbsoluteChildren = true;
    }
    if (this.surface) {
      child.setSurface(this.surface);
    }
    this.children.push(child);
    this.needsLayout = true;
    this.markDirty();
  }

  /** detaches a child if present, clearing its surface and marking dirty. */
  public removeChild(child: Widget): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
      child.setSurface(null);
      if (child.absolute) {
        this.recomputeHasAbsoluteChildren();
      }
      this.needsLayout = true;
      this.markDirty();
    }
  }

  /** detaches every child, clearing their surfaces and marking dirty. */
  public removeAllChildren(): void {
    for (let i = this.children.length - 1; i >= 0; i--) {
      this.children[i].parent = null;
      this.children[i].setSurface(null);
    }
    this.children.length = 0;
    this._hasAbsoluteChildren = false;
    this.needsLayout = true;
    this.markDirty();
  }

  /** rescans children to refresh the cached absolute-children flag after a child is removed. */
  private recomputeHasAbsoluteChildren(): void {
    this._hasAbsoluteChildren = false;
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i].absolute) {
        this._hasAbsoluteChildren = true;
        return;
      }
    }
  }

  /** true when this widget and all ancestors are visible. */
  public isEffectivelyVisible(): boolean {
    return this._effectivelyVisible;
  }

  /** Marks this widget and all ancestors as needing re-layout, then triggers repaint. */
  public invalidateLayout(): void {
    this.needsLayout = true;
    let allVisible = this.visible;
    let ancestor = this.parent;
    while (ancestor) {
      ancestor.needsLayout = true;
      if (allVisible && !ancestor.visible) {
        allVisible = false;
      }
      ancestor = ancestor.parent;
    }
    if (allVisible && this.surface) {
      this.surface.markDirty();
    }
  }

  /** marks this widget's screen rect dirty on the surface for repaint. */
  public markDirty(): void {
    if (this.surface) {
      const scale = this.screenScale;
      const scaledWidth = (this.width * scale) | 0;
      const scaledHeight = (this.height * scale) | 0;
      this.surface.markDirtyRect(this.absoluteX - 1, this.absoluteY - 1, scaledWidth + 2, scaledHeight + 2);
    }
  }

  /** assigns the rendering surface to this widget and its descendants. */
  public setSurface(newSurface: Surface | null): void {
    this.surface = newSurface;
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].setSurface(newSurface);
    }
  }

  /** Recursively computes layout, resolves absolute children, and updates absolute positions. */
  public computeLayout(): void {
    const hasDesignSize = this.designWidth > 0 || this.designHeight > 0;
    let savedWidth = 0;
    let savedHeight = 0;

    if (hasDesignSize) {
      savedWidth = this.geometry[SLOT_WIDTH];
      savedHeight = this.geometry[SLOT_HEIGHT];
      this.virtualWidth = this.designWidth > 0 ? this.designWidth : savedWidth;
      this.virtualHeight = this.designHeight > 0 ? this.designHeight : savedHeight;
      this.geometry[SLOT_WIDTH] = this.virtualWidth;
      this.geometry[SLOT_HEIGHT] = this.virtualHeight;

      const scaleX = this.designWidth > 0 ? savedWidth / this.designWidth : 1;
      const scaleY = this.designHeight > 0 ? savedHeight / this.designHeight : 1;
      this.designScale = this.snapScale(Math.min(scaleX, scaleY));

      const scaledContentWidth = this.virtualWidth * this.designScale;
      const scaledContentHeight = this.virtualHeight * this.designScale;
      this.designOffsetX = ((savedWidth - scaledContentWidth) / 2) | 0;
      this.designOffsetY = ((savedHeight - scaledContentHeight) / 2) | 0;
    } else {
      this.designScale = 1;
      this.designOffsetX = 0;
      this.designOffsetY = 0;
    }

    if (this.layout && this.needsLayout) {
      this.layout.compute(this);
      this.needsLayout = false;
    }
    if (this._hasAbsoluteChildren) {
      this.resolveAbsoluteChildren();
    }

    if (hasDesignSize) {
      this.geometry[SLOT_WIDTH] = savedWidth;
      this.geometry[SLOT_HEIGHT] = savedHeight;
    }

    const padX = this.geometry[SLOT_PADDING_LEFT];
    const padY = this.geometry[SLOT_PADDING_TOP];
    const childScreenScale = this.screenScale * this.designScale;

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      child.screenScale = childScreenScale;
      if (hasDesignSize) {
        child.absoluteX =
          (this.absoluteX + this.designOffsetX + (padX + child.geometry[SLOT_X]) * this.designScale) | 0;
        child.absoluteY =
          (this.absoluteY + this.designOffsetY + (padY + child.geometry[SLOT_Y]) * this.designScale) | 0;
      } else {
        child.absoluteX = (this.absoluteX + padX + child.geometry[SLOT_X]) | 0;
        child.absoluteY = (this.absoluteY + padY + child.geometry[SLOT_Y]) | 0;
      }
      child.computeLayout();
    }
  }

  /**
   * Snaps a raw design-to-screen scale to the configured stepping so scaled
   * content lands on stable increments. A positive designScaleStep floors to a
   * multiple of that step. Otherwise "none" passes the scale through, "binary"
   * floors to a power of two, and "pixel-perfect" floors to a whole number when
   * scaling up. Below 1 both snapping modes fall back to a power of two so the
   * sub-pixel steps stay clean.
   */
  private snapScale(rawScale: number): number {
    if (this.designScaleStep > 0) {
      const stepped = Math.floor(rawScale / this.designScaleStep) * this.designScaleStep;
      return stepped > 0 ? stepped : this.designScaleStep;
    }
    if (this.designScaleSnap === "none") {
      return rawScale;
    }
    if (rawScale >= 1) {
      if (this.designScaleSnap === "binary") {
        return 2 ** Math.floor(Math.log2(rawScale));
      }
      return Math.floor(rawScale) || 1;
    }
    return 2 ** Math.floor(Math.log2(rawScale));
  }

  /**
   * Positions and sizes children marked absolute from their anchor offsets.
   * Anchors on opposite sides stretch the child between them, a single anchor
   * pins that edge, and no anchor on an axis centers the child within the
   * parent's content box.
   */
  private resolveAbsoluteChildren(): void {
    const parentInnerWidth = this.innerWidth;
    const parentInnerHeight = this.innerHeight;

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (!child.absolute) {
        continue;
      }

      const childGeometry = child.geometry;
      // anchors default to NaN; a self-comparison is false only for NaN, so this is true when the anchor was set.
      const hasLeft = child.anchorLeft === child.anchorLeft;
      const hasRight = child.anchorRight === child.anchorRight;
      const hasTop = child.anchorTop === child.anchorTop;
      const hasBottom = child.anchorBottom === child.anchorBottom;

      let childWidth: number;
      if (hasLeft && hasRight) {
        childWidth = parentInnerWidth - child.anchorLeft - child.anchorRight;
      } else {
        childWidth =
          childGeometry[SLOT_PREFERRED_WIDTH] > 0 ? childGeometry[SLOT_PREFERRED_WIDTH] : child.measureIntrinsicWidth();
      }

      let childHeight: number;
      if (hasTop && hasBottom) {
        childHeight = parentInnerHeight - child.anchorTop - child.anchorBottom;
      } else {
        childHeight =
          childGeometry[SLOT_PREFERRED_HEIGHT] > 0
            ? childGeometry[SLOT_PREFERRED_HEIGHT]
            : child.measureIntrinsicHeight();
      }

      let childX: number;
      if (hasLeft) {
        childX = child.anchorLeft;
      } else if (hasRight) {
        childX = parentInnerWidth - childWidth - child.anchorRight;
      } else {
        childX = Math.round((parentInnerWidth - childWidth) / 2);
      }

      let childY: number;
      if (hasTop) {
        childY = child.anchorTop;
      } else if (hasBottom) {
        childY = parentInnerHeight - childHeight - child.anchorBottom;
      } else {
        childY = Math.round((parentInnerHeight - childHeight) / 2);
      }

      childGeometry[SLOT_X] = childX;
      childGeometry[SLOT_Y] = childY;
      childGeometry[SLOT_WIDTH] = childWidth > 0 ? childWidth : 0;
      childGeometry[SLOT_HEIGHT] = childHeight > 0 ? childHeight : 0;
      child.needsLayout = true;
    }
  }

  /** recomputes the auto-fit content scale when enabled, then paints this widget followed by its children. */
  public draw(renderer: Renderer, theme: Theme): void {
    if (this.autoFitScale) {
      let scale = this.maxScale;
      if (this.fitReferenceWidth > 0) {
        scale = Math.min(scale, this.innerWidth / this.fitReferenceWidth);
      }
      if (this.fitReferenceHeight > 0) {
        scale = Math.min(scale, this.innerHeight / this.fitReferenceHeight);
      }
      this.computedScale = Math.max(this.minScale, Math.min(this.maxScale, scale));
    }
    this.drawSelf(renderer, theme);
    this.drawChildren(renderer, theme);
  }

  /** paints this widget's own content; the base implementation is empty and subclasses override it. */
  // eslint-disable-next-line no-empty-function
  protected drawSelf(_renderer: Renderer, _theme: Theme): void {}

  /**
   * Paints visible children, applying the design-scale transform, padding
   * translation and clip, and skipping children that fall outside the current
   * dirty region.
   */
  protected drawChildren(renderer: Renderer, theme: Theme): void {
    const hasDesignSize = this.designWidth > 0 || this.designHeight > 0;
    const padLeft = this.geometry[SLOT_PADDING_LEFT];
    const padRight = this.geometry[SLOT_PADDING_RIGHT];
    const padTop = this.geometry[SLOT_PADDING_TOP];
    const padBottom = this.geometry[SLOT_PADDING_BOTTOM];
    const hasPadding = padTop > 0 || padRight > 0 || padBottom > 0 || padLeft > 0;

    if (hasDesignSize) {
      renderer.pushTranslate(this.designOffsetX, this.designOffsetY);
      renderer.pushScale(this.designScale, this.designScale);
    }

    // when shrinking below 1, quantize child rects to a 1/scale grid so scaled edges land on whole device pixels.
    const snap = hasDesignSize && this.designScale > 0 && this.designScale < 1 ? Math.round(1 / this.designScale) : 1;

    if (hasPadding) {
      const pl = snap > 1 ? Math.round(padLeft / snap) * snap : padLeft;
      const pt = snap > 1 ? Math.round(padTop / snap) * snap : padTop;
      renderer.pushTranslate(pl, pt);
      if (hasDesignSize) {
        const virtualInnerWidth = this.virtualWidth - pl - (snap > 1 ? Math.round(padRight / snap) * snap : padRight);
        const virtualInnerHeight =
          this.virtualHeight - pt - (snap > 1 ? Math.round(padBottom / snap) * snap : padBottom);
        renderer.pushClip(0, 0, virtualInnerWidth, virtualInnerHeight);
      } else {
        renderer.pushClip(0, 0, this.innerWidth, this.innerHeight);
      }
    }

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (!child.visible) {
        continue;
      }
      if (
        this.surface &&
        !this.surface.isRectInDirtyArea(
          child.absoluteX,
          child.absoluteY,
          child.geometry[SLOT_WIDTH],
          child.geometry[SLOT_HEIGHT]
        )
      ) {
        continue;
      }
      const childGeometry = child.geometry;
      const cx = snap > 1 ? Math.round(childGeometry[SLOT_X] / snap) * snap : childGeometry[SLOT_X];
      const cy = snap > 1 ? Math.round(childGeometry[SLOT_Y] / snap) * snap : childGeometry[SLOT_Y];
      const cw = snap > 1 ? Math.round(childGeometry[SLOT_WIDTH] / snap) * snap : childGeometry[SLOT_WIDTH];
      const ch = snap > 1 ? Math.round(childGeometry[SLOT_HEIGHT] / snap) * snap : childGeometry[SLOT_HEIGHT];
      renderer.pushTranslateClip(cx, cy, 0, 0, cw, ch);
      child.draw(renderer, theme);
      renderer.popTranslateClip();
    }

    if (hasPadding) {
      renderer.popClip();
      renderer.popTranslate();
    }

    if (hasDesignSize) {
      renderer.popScale();
      renderer.popTranslate();
    }
  }

  /** Returns the deepest visible child containing the point, or this widget if no child matches. */
  public hitTest(x: number, y: number): Widget | null {
    if (!this.visible) {
      return null;
    }
    let adjustedX = x;
    let adjustedY = y;
    if (this.designWidth > 0 || this.designHeight > 0) {
      adjustedX = (x - this.designOffsetX) / this.designScale;
      adjustedY = (y - this.designOffsetY) / this.designScale;
    }
    const localX = adjustedX - this.geometry[SLOT_PADDING_LEFT];
    const localY = adjustedY - this.geometry[SLOT_PADDING_TOP];
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (!child.visible) {
        continue;
      }
      const childGeometry = child.geometry;
      const childLocalX = localX - childGeometry[SLOT_X];
      const childLocalY = localY - childGeometry[SLOT_Y];
      if (
        childLocalX >= 0 &&
        childLocalX < childGeometry[SLOT_WIDTH] &&
        childLocalY >= 0 &&
        childLocalY < childGeometry[SLOT_HEIGHT]
      ) {
        const hit = child.hitTest(childLocalX, childLocalY);
        if (hit) {
          return hit;
        }
      }
    }
    return this;
  }

  /** pointer-down hook; return true to claim the pointer. */
  public onPointerDown(_pointerId: number, _x: number, _y: number, _button: number): boolean {
    return false;
  }
  /** pointer-up hook. */
  // eslint-disable-next-line no-empty-function
  public onPointerUp(_pointerId: number, _x: number, _y: number, _button: number): void {}
  /** pointer-move hook. */
  // eslint-disable-next-line no-empty-function
  public onPointerMove(_pointerId: number, _x: number, _y: number): void {}
  /** pointer-enter hook. */
  // eslint-disable-next-line no-empty-function
  public onPointerEnter(): void {}
  /** pointer-leave hook. */
  // eslint-disable-next-line no-empty-function
  public onPointerLeave(): void {}

  /** wheel hook; return true to consume the event. */
  public onWheel(_deltaX: number, _deltaY: number): boolean {
    return false;
  }
  /** key-down hook; return true to consume the event. */
  public onKeyDown(_key: string, _code: string, _ctrl: boolean, _shift: boolean, _alt: boolean): boolean {
    return false;
  }
  /** key-up hook. */
  // eslint-disable-next-line no-empty-function
  public onKeyUp(_key: string, _code: string): void {}
  /** focus-gained hook. */
  // eslint-disable-next-line no-empty-function
  public onFocus(): void {}
  /** focus-lost hook. */
  // eslint-disable-next-line no-empty-function
  public onBlur(): void {}
}
