import { loadDefaultAtlas } from "../assets/default-atlas";
import { Canvas2DRenderer } from "../core/canvas2d-renderer";
import { createFontAtlas } from "../core/font-generator";
import { InputDispatcher } from "../core/input";
import { StackLayout } from "../core/layouts/stack-layout";
import { Surface } from "../core/surface";
import { DEFAULTS } from "../defaults";
import { InspectDebugger } from "./inspect-debugger";
import { createDarkTheme } from "../themes/dark";
import { getVisibilityFromStorage, setVisibilityToStorage } from "../utils/persistence";
import { Box } from "../widgets/box";

import type { FontAtlas } from "../core/atlas";
import type { Widget } from "../core/widget";
import type { InspectTheme } from "../themes/inspect-theme";
import type { MountOptions } from "../types";

/** InspectTheme keys that may be overridden individually through mount options. */
const THEME_KEYS: ReadonlySet<string> = new Set<keyof InspectTheme>([
  "bgApp",
  "bgPanel",
  "bgPanelInset",
  "bgPanelRaised",
  "bgButton",
  "bgButtonHover",
  "bgButtonActive",
  "bgInput",
  "bgSelected",
  "bgScrollTrack",
  "bgScrollThumb",
  "borderPanel",
  "borderInset",
  "borderRaised",
  "textPrimary",
  "textSecondary",
  "textMuted",
  "textValue",
  "textTitle",
  "textHighlight",
  "spacingXS",
  "spacingSM",
  "spacingMD",
  "spacingLG",
  "borderRadius",
  "buttonHeight",
  "labelHeight",
  "separatorThickness",
  "bgFolder",
  "bgFolderHover",
  "textFolder",
  "bgAccent",
  "bgAccentDim",
  "textLabel",
  "bgOverlay",
  "bgDropdown",
  "controlHeight",
  "controlGap",
  "labelRatio",
  "folderHeaderHeight",
  "panelPadding",
  "scrollbarWidth",
  "textOffsetY"
]);

/**
 * Collects theme token overrides supplied on the mount options into a partial
 * theme, or null when none are present. borderRadius is skipped here because it
 * is set from the widgetBorderRadius alias instead.
 */
function extractThemeOverrides(options: MountOptions): Partial<InspectTheme> | null {
  let result: Partial<InspectTheme> | null = null;
  const rec = options as Record<string, unknown>;
  for (const key of THEME_KEYS) {
    // borderRadius is applied below from the widgetBorderRadius option rather than a direct token.
    if (key === "borderRadius") {
      continue;
    }
    if (key in rec && rec[key] !== undefined) {
      if (!result) {
        result = {};
      }
      (result as Record<string, unknown>)[key] = rec[key];
    }
  }
  if (options.widgetBorderRadius !== undefined) {
    if (!result) {
      result = {};
    }
    result.borderRadius = options.widgetBorderRadius;
  }
  return result;
}

/**
 * The main panel component: creates the fixed-position canvas, renderer, surface,
 * input dispatcher, and manages show/hide transitions and font atlas initialization.
 */
export class InspectPanel {
  /** the fixed-position canvas element the panel renders into. */
  public readonly canvas: HTMLCanvasElement;
  /** surface driving layout and repaint of the widget tree. */
  public readonly surface: Surface;
  /** the canvas 2D drawing backend. */
  public readonly renderer: Canvas2DRenderer;
  /** dispatcher routing pointer, wheel, and keyboard events to widgets. */
  public readonly input: InputDispatcher;
  /** active theme, replaced once the font atlas finishes loading. */
  public theme: InspectTheme;
  /** root container that holds the panel content. */
  public root: Box;
  /** whether the panel is currently slid into view. */
  public visible: boolean;
  /** resolves once the font atlas has loaded and the real theme is applied. */
  public readonly ready: Promise<void>;

  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private options: MountOptions;
  private hovered = false;
  private enterHandler: (() => void) | null = null;
  private leaveHandler: (() => void) | null = null;
  private debugger_: InspectDebugger | null = null;
  private panelPosition: "left" | "right";
  private panelMargin: number;
  private panelWidth: number;

  /**
   * Creates and styles the fixed-position canvas, wires up the renderer,
   * surface, input, and root box, restores stored visibility, positions the
   * panel on or off screen, and starts loading the font atlas.
   */
  constructor(container: HTMLElement, options: MountOptions) {
    this.options = options;
    const width = options.width ?? DEFAULTS.panelDefaultWidth;
    const position = options.position ?? "right";
    const margin = options.margin ?? 0;
    const storageKey = options.storageKey ?? DEFAULTS.panelDefaultStorageKey;
    this.panelPosition = position;
    this.panelMargin = margin;
    this.panelWidth = width;

    if (options.persistVisibility !== false) {
      const stored = getVisibilityFromStorage(storageKey);
      this.visible = stored !== null ? stored : (options.initiallyVisible ?? false);
    } else {
      this.visible = options.initiallyVisible ?? false;
    }

    this.canvas = document.createElement("canvas");

    this.canvas.style.position = "fixed";
    this.canvas.style.top = `${margin}px`;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `calc(100vh - ${margin * 2}px)`;
    this.canvas.style.zIndex = DEFAULTS.panelZIndex;
    if (options.borderRadius) {
      this.canvas.style.borderRadius = `${options.borderRadius}px`;
    }
    this.canvas.style.transition = `${position} ${DEFAULTS.panelTransitionEasing} ${DEFAULTS.panelTransitionDuration}`;

    const hiddenOffset = `${-(width + DEFAULTS.panelHiddenOffsetExtra + margin)}px`;
    const shownOffset = `${margin}px`;
    const shadowX = DEFAULTS.panelBoxShadowX;
    const shadowBlur = DEFAULTS.panelBoxShadowBlur;
    const shadowColor = DEFAULTS.panelBoxShadowColor;
    if (position === "right") {
      this.canvas.style.right = this.visible ? shownOffset : hiddenOffset;
      this.canvas.style.boxShadow = `-${shadowX}px 0px ${shadowBlur}px ${shadowColor}`;
    } else {
      this.canvas.style.left = this.visible ? shownOffset : hiddenOffset;
      this.canvas.style.boxShadow = `${shadowX}px 0px ${shadowBlur}px ${shadowColor}`;
    }

    container.appendChild(this.canvas);

    this.renderer = new Canvas2DRenderer(this.canvas);

    const placeholderAtlas = null as unknown as FontAtlas;
    this.theme = createDarkTheme(placeholderAtlas);

    this.surface = new Surface(this.canvas, this.renderer, this.theme);

    this.input = new InputDispatcher(this.surface);

    if (options.debugMode) {
      this.debugger_ = new InspectDebugger(this.surface, this.canvas);
    }

    this.root = new Box();
    this.root.sizingX = "grow";
    this.root.sizingY = "grow";
    this.root.bgColor = this.theme.bgApp;
    this.root.borderRadius = options.borderRadius ?? 0;
    this.root.layout = new StackLayout("vertical", 0, "start", "stretch");
    this.surface.setRoot(this.root);

    this.enterHandler = () => {
      this.hovered = true;
    };
    this.leaveHandler = () => {
      this.hovered = false;
    };
    this.canvas.addEventListener("pointerenter", this.enterHandler);
    this.canvas.addEventListener("pointerleave", this.leaveHandler);

    this.keyHandler = null;

    this.ready = this.initFontAtlas(options);
  }

  /**
   * Loads the font atlas, using a runtime-generated one when a custom font is
   * requested and the embedded default otherwise, then resolves the theme
   * (explicit object, dark default, or option overrides) and applies it.
   */
  private async initFontAtlas(options: MountOptions): Promise<void> {
    const hasCustomFont =
      options.fontUrl !== undefined || options.fontData !== undefined || options.fontFamily !== undefined;

    const atlas = hasCustomFont
      ? await createFontAtlas({
          family: options.fontFamily ?? DEFAULTS.panelDefaultFontFamily,
          size: options.fontSize ?? DEFAULTS.panelDefaultFontSize,
          fontUrl: options.fontUrl,
          fontData: options.fontData,
          pixelPerfect: options.fontUrl !== undefined || options.fontData !== undefined,
          extraChars: "v>‹›"
        })
      : await loadDefaultAtlas();

    const resolvedTheme = options.theme;
    if (resolvedTheme && typeof resolvedTheme !== "string") {
      this.theme = { ...resolvedTheme, fontAtlas: atlas };
    } else {
      this.theme = createDarkTheme(atlas);
    }

    const overrides = extractThemeOverrides(options);
    if (overrides) {
      this.theme = { ...this.theme, ...overrides, fontAtlas: atlas };
    }

    this.root.bgColor = this.theme.bgApp;
    this.surface.setTheme(this.theme);
  }

  /** toggles panel visibility between shown and hidden. */
  public toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /** slides the panel to its shown or hidden offset by setting the anchored side (left/right) by visibility. */
  private applyPosition(): void {
    const shown = `${this.panelMargin}px`;
    const hidden = `${-(this.panelWidth + 50 + this.panelMargin)}px`;
    if (this.panelPosition === "right") {
      this.canvas.style.right = this.visible ? shown : hidden;
    } else {
      this.canvas.style.left = this.visible ? shown : hidden;
    }
  }

  /** slides the panel into view and persists visibility when enabled. */
  public show(): void {
    if (this.visible) {
      return;
    }
    this.visible = true;
    this.applyPosition();
    this.surface.markDirty();
    if (this.options.persistVisibility !== false) {
      setVisibilityToStorage(true, this.options.storageKey ?? DEFAULTS.panelDefaultStorageKey);
    }
  }

  /** slides the panel out of view and persists visibility when enabled. */
  public hide(): void {
    if (!this.visible) {
      return;
    }
    this.visible = false;
    this.applyPosition();
    if (this.options.persistVisibility !== false) {
      setVisibilityToStorage(false, this.options.storageKey ?? DEFAULTS.panelDefaultStorageKey);
    }
  }

  /** returns whether the panel is currently shown. */
  public isVisible(): boolean {
    return this.visible;
  }

  /** returns whether the pointer is currently over the panel. */
  public isHovered(): boolean {
    return this.hovered;
  }

  /** replaces the root content with the given widget. */
  public setContent(widget: Widget): void {
    this.root.removeAllChildren();
    this.root.addChild(widget);
    this.surface.markDirty();
  }

  /** removes listeners, tears down the surface, and removes the canvas. */
  public dispose(): void {
    if (this.keyHandler) {
      window.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = null;
    }
    if (this.enterHandler) {
      this.canvas.removeEventListener("pointerenter", this.enterHandler);
      this.enterHandler = null;
    }
    if (this.leaveHandler) {
      this.canvas.removeEventListener("pointerleave", this.leaveHandler);
      this.leaveHandler = null;
    }
    if (this.debugger_) {
      this.debugger_.dispose();
      this.debugger_ = null;
    }
    this.input.dispose();
    this.surface.dispose();
    this.canvas.remove();
  }
}
