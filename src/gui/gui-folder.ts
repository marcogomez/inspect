import { StackLayout } from "../core/layouts/stack-layout";
import { Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";
import { Box } from "../widgets/box";
import { CanvasWidget } from "../widgets/canvas-widget";
import { Label } from "../widgets/label";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";
import type { InspectTheme } from "../themes/inspect-theme";

/** ease-in-out cubic curve over t in [0, 1] (Robert Penner's easing equations). */
function easeInOutCubic(t: number): number {
  // 4 = 2^(n-1) where n=3 for cubic, scales the first-half polynomial to reach 0.5 at t=0.5
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const CHEVRON_SIZE = DEFAULTS.folderChevronSize;

/** Clickable folder header row with a chevron, title, and hover state. */
class FolderHeader extends Box {
  private readonly _chevron: CanvasWidget;
  private readonly _title: Label;
  private _hovered = false;
  private _expanded = true;
  private _chevronColor = 0xffffff80;

  /** called when the header is pressed, used to toggle the folder. */
  public onClick: (() => void) | null = null;

  /** builds the chevron and title and lays them out horizontally. */
  constructor() {
    super();
    this.sizingX = "grow";
    this.sizingY = "fixed";
    this.layout = new StackLayout("horizontal", DEFAULTS.folderHeaderGap, "start", "stretch");
    this.setPaddingAll(DEFAULTS.folderHeaderPadding);

    this._chevron = new CanvasWidget();
    this._chevron.sizingX = "fixed";
    this._chevron.preferredWidth = DEFAULTS.folderChevronWidth;
    this._chevron.sizingY = "grow";
    this._chevron.onDraw = (renderer: Renderer, _theme: Theme, width: number, height: number) => {
      this.drawChevron(renderer, width, height);
    };
    this.addChild(this._chevron);

    this._title = new Label();
    this._title.sizingX = "grow";
    this._title.sizingY = "grow";
    this._title.flexGrow = 1;
    this._title.vAlign = "middle";
    this._title.overflow = "ellipsis";
    this.addChild(this._title);
  }

  /** sets the header title, uppercased for the panel's folder style. */
  public set titleText(value: string) {
    this._title.text = value.toUpperCase();
  }

  /** the current header title text. */
  public get titleText(): string {
    return this._title.text;
  }

  /** sets whether the chevron points down (expanded) or right (collapsed) and repaints it. */
  public set expanded(value: boolean) {
    this._expanded = value;
    this._chevron.markDirty();
  }

  /** applies folder background, height, radius, and chevron and title colors from the theme. */
  public applyTheme(theme: Theme): void {
    const t = theme as InspectTheme;
    this.bgColor = t.bgFolder;
    this.preferredHeight = t.folderHeaderHeight;
    this.borderRadius = t.borderRadius;
    this._chevronColor = t.textMuted;
    this._title.color = t.textFolder;
  }

  /** draws the chevron triangle pointing down when expanded and right when collapsed. */
  private drawChevron(renderer: Renderer, width: number, height: number): void {
    const cx = (width / 2) | 0;
    const cy = (height / 2) | 0;
    renderer.beginPath();
    if (this._expanded) {
      renderer.moveTo(cx - CHEVRON_SIZE, cy - CHEVRON_SIZE / 2);
      renderer.lineTo(cx, cy + CHEVRON_SIZE / 2);
      renderer.lineTo(cx + CHEVRON_SIZE, cy - CHEVRON_SIZE / 2);
    } else {
      renderer.moveTo(cx - CHEVRON_SIZE / 2, cy - CHEVRON_SIZE);
      renderer.lineTo(cx + CHEVRON_SIZE / 2, cy);
      renderer.lineTo(cx - CHEVRON_SIZE / 2, cy + CHEVRON_SIZE);
    }
    renderer.fillPath(this._chevronColor);
  }

  /** paints the header background (brighter while hovered) and its border. */
  protected override drawSelf(renderer: Renderer, theme: Theme): void {
    const t = theme as InspectTheme;
    const bg = this._hovered ? t.bgFolderHover : this.bgColor;
    renderer.fillRoundedRect(0, 0, this.width, this.height, this.borderRadius, bg);
    renderer.strokeRoundedRect(0, 0, this.width, this.height, this.borderRadius, t.borderInset, 1);
  }

  /** invokes onClick and claims the press. */
  public override onPointerDown(_pointerId: number, _x: number, _y: number, _button: number): boolean {
    if (this.onClick) {
      this.onClick();
    }
    return true;
  }

  /** enters the hover state. */
  public override onPointerEnter(): void {
    this._hovered = true;
    this.markDirty();
  }

  /** leaves the hover state. */
  public override onPointerLeave(): void {
    this._hovered = false;
    this.markDirty();
  }
}

/** Collapsible folder widget with a header and animated expand/collapse. */
export class GuiFolder extends Widget {
  private readonly _header: FolderHeader;
  private readonly _content: Box;
  private _expanded = true;
  private _id = "";
  private _title = "";

  /** whether expand and collapse are height-animated; when false they toggle instantly. */
  public animated = true;

  private _animating = false;
  private _animStartTime = 0;
  private _animFromHeight = 0;
  private _animToHeight = 0;
  private _animRafId = 0;
  private _contentGap = -1;

  /**
   * Animation frame step: eases the preferred height from the start toward the
   * target, invalidates the ancestor layout chain, and repaints. On the final
   * frame it settles content visibility and returns the folder to fit sizing.
   */
  private readonly _boundTick = (): void => {
    if (!this._animating) {
      return;
    }
    const elapsed = performance.now() - this._animStartTime;
    const t = Math.min(1, elapsed / DEFAULTS.folderAnimDurationMs);
    const eased = easeInOutCubic(t);
    this.preferredHeight = this._animFromHeight + (this._animToHeight - this._animFromHeight) * eased;
    this.needsLayout = true;
    let ancestor = this.parent;
    while (ancestor) {
      ancestor.needsLayout = true;
      ancestor = ancestor.parent;
    }
    if (this.surface) {
      this.surface.markDirty();
    }
    if (t >= 1) {
      this._animating = false;
      this._animRafId = 0;
      this._content.visible = this._expanded;
      this.sizingY = "fit";
      this.invalidateLayout();
    } else {
      this._animRafId = requestAnimationFrame(this._boundTick);
    }
  };

  /** builds the header and content box and wires the header click to toggle expansion. */
  constructor() {
    super();
    this.sizingX = "grow";
    this.sizingY = "fit";
    this.layout = new StackLayout("vertical", 0, "start", "stretch");

    this._header = new FolderHeader();
    this._header.onClick = () => {
      this.expanded = !this._expanded;
    };
    this.addChild(this._header);

    this._content = new Box();
    this._content.sizingX = "grow";
    this._content.sizingY = "fit";
    this.addChild(this._content);
  }

  /** stable identifier used to track the folder, for example for persistence. */
  public get id(): string {
    return this._id;
  }

  public set id(value: string) {
    this._id = value;
  }

  /** the folder's display title. */
  public get title(): string {
    return this._title;
  }

  public set title(value: string) {
    this._title = value;
    this._header.titleText = value;
  }

  /** whether the folder content is expanded. */
  public get expanded(): boolean {
    return this._expanded;
  }

  /** expands or collapses the folder, animating the height when animated and a surface is attached. */
  public set expanded(value: boolean) {
    if (value === this._expanded) {
      return;
    }
    this._expanded = value;
    this._header.expanded = value;

    if (this.animated && this.surface) {
      this.startAnimation(value);
    } else {
      this._content.visible = value;
      this.invalidateLayout();
    }
  }

  /**
   * Starts the expand or collapse height animation. It measures the content
   * height, sets fixed sizing with the start height, and kicks off the frame
   * loop that eases toward the target. When expanding, content is made visible
   * up front so it can be measured and revealed during the slide.
   */
  private startAnimation(expanding: boolean): void {
    if (this._animRafId) {
      cancelAnimationFrame(this._animRafId);
      this._animRafId = 0;
    }

    const headerH = this._header.preferredHeight;

    if (expanding) {
      this._content.visible = true;
      this._content.needsLayout = true;
    }
    const contentH = this._content.measureIntrinsicHeight();

    this._animFromHeight = expanding ? headerH : headerH + contentH;
    this._animToHeight = expanding ? headerH + contentH : headerH;
    this._animStartTime = performance.now();
    this._animating = true;
    this.sizingY = "fixed";
    this.preferredHeight = this._animFromHeight;
    this.invalidateLayout();
    this.tickAnimation();
  }

  /** schedules the next animation frame step. */
  private tickAnimation(): void {
    this._animRafId = requestAnimationFrame(this._boundTick);
  }

  /** appends a control widget to the folder content. */
  public addControl(widget: Widget): void {
    this._content.addChild(widget);
  }

  /** applies theme values to the header and content layout. */
  public applyTheme(theme: Theme): void {
    const t = theme as InspectTheme;
    this._header.applyTheme(theme);
    if (this._contentGap !== t.controlGap) {
      this._contentGap = t.controlGap;
      this._content.layout = new StackLayout("vertical", t.controlGap, "start", "stretch");
    }
    this._content.setPaddingAll(t.panelPadding);
  }
}
