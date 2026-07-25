import { THEME_DEFAULT, Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";

/** descriptor for a single tab with its display label and value key. */
export interface Tab {
  label: string;
  value: string;
}

/** how tab widths are computed: equal division or sized to label content. */
export type TabSizing = "equal" | "content";

const ARROW_WIDTH = DEFAULTS.tabArrowWidth;
const ARROW_HALF = DEFAULTS.tabArrowHalf;
const STRIP_PADDING_TOP = DEFAULTS.tabStripPaddingTop;
const STRIP_PADDING_SIDE = DEFAULTS.tabStripPaddingSide;
const TAB_RADIUS = DEFAULTS.tabRadius;
const SEPARATOR_HEIGHT = DEFAULTS.tabSeparatorHeight;
const SEPARATOR_COLOR = DEFAULTS.tabSeparatorColor;
const HOVER_COLOR = DEFAULTS.tabHoverColor;

/** horizontal tab bar widget with scroll arrows, hover highlighting, and separators. */
export class TabBar extends Widget {
  /** list of tabs to display. */
  public tabs: Tab[] = [];
  /** value key of the currently selected tab. */
  public value = "";
  /** background color override for the bar. */
  public bgColor: number = THEME_DEFAULT;
  /** background color of the active tab. */
  public activeColor: number = THEME_DEFAULT;
  /** text color for inactive tabs. */
  public textColor: number = THEME_DEFAULT;
  /** text color for the active tab. */
  public activeTextColor: number = THEME_DEFAULT;
  /** how tab widths are calculated. */
  public tabSizing: TabSizing = "content";
  /** horizontal padding within each tab in pixels. */
  public tabPadding = 16;
  /** called when the selected tab changes. */
  public onChange: ((value: string) => void) | null = null;
  /** reserved space on the right edge for external elements. */
  public reservedEdge = 0;

  private tabPositions: Float32Array = new Float32Array(DEFAULTS.tabInitialCapacity);
  private tabWidths: Float32Array = new Float32Array(DEFAULTS.tabInitialCapacity);
  private scrollOffset = 0;
  private totalTabWidth = 0;
  private showLeftArrow = false;
  private showRightArrow = false;
  private _tabsDirty = true;
  private _lastTabCount = 0;
  private _lastWidth = 0;
  private _lastCharWidth = 0;
  private _hoverIndex = -1;

  /** renders the bar background, the scrolling strip of tabs with active and hover styling, and the scroll arrows. */
  protected override drawSelf(renderer: Renderer, theme: Theme): void {
    const widgetWidth = this.width;
    const widgetHeight = this.height;
    const tabCount = this.tabs.length;
    if (tabCount === 0) {
      return;
    }

    const background = this.bgColor === THEME_DEFAULT ? theme.bgPanel : this.bgColor;
    renderer.fillRect(0, 0, widgetWidth, widgetHeight, background);

    const font = theme.fontAtlas;
    const normalTextColor = this.textColor === THEME_DEFAULT ? theme.textMuted : this.textColor;
    const activeTextColor = this.activeTextColor === THEME_DEFAULT ? theme.textPrimary : this.activeTextColor;
    const activeBackground = this.activeColor === THEME_DEFAULT ? theme.bgPanelRaised : this.activeColor;
    const arrowColor = this.textColor === THEME_DEFAULT ? theme.textMuted : this.textColor;

    const charWidth = font?.charWidth ?? 8;
    this.computeTabPositions(widgetWidth, charWidth);

    const tabContentHeight = widgetHeight - STRIP_PADDING_TOP;

    const stripLeft = (this.showLeftArrow ? ARROW_WIDTH : 0) + STRIP_PADDING_SIDE;
    const stripRight = widgetWidth - this.reservedEdge - (this.showRightArrow ? ARROW_WIDTH : 0) - STRIP_PADDING_SIDE;
    const stripWidth = stripRight - stripLeft;

    renderer.pushClip(stripLeft, 0, stripWidth, widgetHeight);
    renderer.pushTranslate(-this.scrollOffset + stripLeft, STRIP_PADDING_TOP);

    for (let i = 0; i < tabCount; i++) {
      const tab = this.tabs[i];
      const tabX = this.tabPositions[i];
      const tabWidth = this.tabWidths[i];
      const isActive = tab.value === this.value;

      if (isActive && activeBackground) {
        renderer.fillRoundedRect(tabX, 0, tabWidth, tabContentHeight + TAB_RADIUS, TAB_RADIUS, activeBackground);
        renderer.pushClip(tabX, tabContentHeight, tabWidth, TAB_RADIUS);
        renderer.fillRect(tabX, tabContentHeight, tabWidth, TAB_RADIUS, activeBackground);
        renderer.popClip();
      } else if (i === this._hoverIndex) {
        renderer.fillRoundedRect(tabX, 0, tabWidth, tabContentHeight + TAB_RADIUS, TAB_RADIUS, HOVER_COLOR);
        renderer.pushClip(tabX, tabContentHeight, tabWidth, TAB_RADIUS);
        renderer.fillRect(tabX, tabContentHeight, tabWidth, TAB_RADIUS, HOVER_COLOR);
        renderer.popClip();
      }

      if (font) {
        const labelWidth = tab.label.length * charWidth;
        const labelX = Math.round(tabX + (tabWidth - labelWidth) / 2);
        const labelY = Math.round((tabContentHeight - font.lineHeight) / 2);
        const labelColor = isActive ? activeTextColor : i === this._hoverIndex ? activeTextColor : normalTextColor;
        renderer.drawText(font, tab.label, labelX, labelY, labelColor);
      }

      if (!isActive && i < tabCount - 1) {
        const nextActive = i + 1 < tabCount && this.tabs[i + 1].value === this.value;
        if (!nextActive) {
          const sepX = tabX + tabWidth;
          const sepY = Math.round((tabContentHeight - SEPARATOR_HEIGHT) / 2);
          renderer.fillRect(sepX, sepY, 1, SEPARATOR_HEIGHT, SEPARATOR_COLOR);
        }
      }
    }

    renderer.popTranslate();
    renderer.popClip();

    if (this.showLeftArrow) {
      renderer.fillRect(0, 0, ARROW_WIDTH + STRIP_PADDING_SIDE, widgetHeight, background);
      const cx = (ARROW_WIDTH / 2 + 5) | 0;
      const cy = ((widgetHeight / 2) | 0) + 2;
      renderer.beginPath();
      renderer.moveTo(cx + ARROW_HALF, cy - ARROW_HALF);
      renderer.lineTo(cx - ARROW_HALF, cy);
      renderer.lineTo(cx + ARROW_HALF, cy + ARROW_HALF);
      renderer.fillPath(arrowColor);
    }

    if (this.showRightArrow) {
      const arrowX = widgetWidth - this.reservedEdge - ARROW_WIDTH - STRIP_PADDING_SIDE;
      renderer.fillRect(arrowX, 0, ARROW_WIDTH + STRIP_PADDING_SIDE, widgetHeight, background);
      const cx = (arrowX + ARROW_WIDTH / 2 + 5) | 0;
      const cy = ((widgetHeight / 2) | 0) + 2;
      renderer.beginPath();
      renderer.moveTo(cx - ARROW_HALF, cy - ARROW_HALF);
      renderer.lineTo(cx + ARROW_HALF, cy);
      renderer.lineTo(cx - ARROW_HALF, cy + ARROW_HALF);
      renderer.fillPath(arrowColor);
    }
  }

  /** handles clicks on scroll arrows and tabs, selecting the hit tab. */
  public override onPointerDown(_pointerId: number, x: number, _y: number, button: number): boolean {
    if (button !== 0 || !this.enabled) {
      return false;
    }
    const tabCount = this.tabs.length;
    if (tabCount === 0) {
      return false;
    }

    if (this.showLeftArrow && x < ARROW_WIDTH + STRIP_PADDING_SIDE) {
      this.scroll(-this.width * 0.6);
      return true;
    }

    const rightArrowX = this.width - this.reservedEdge - ARROW_WIDTH - STRIP_PADDING_SIDE;
    if (this.showRightArrow && x >= rightArrowX) {
      this.scroll(this.width * 0.6);
      return true;
    }

    const stripLeft = (this.showLeftArrow ? ARROW_WIDTH : 0) + STRIP_PADDING_SIDE;
    const hitX = x - stripLeft + this.scrollOffset;

    for (let i = 0; i < tabCount; i++) {
      if (hitX >= this.tabPositions[i] && hitX < this.tabPositions[i] + this.tabWidths[i]) {
        const newValue = this.tabs[i].value;
        if (newValue !== this.value) {
          this.value = newValue;
          this.scrollActiveTabIntoView();
          if (this.onChange) {
            this.onChange(newValue);
          }
          this.markDirty();
        }
        return true;
      }
    }
    return true;
  }

  /** scrolls the tab strip when it overflows. */
  public override onWheel(deltaX: number, deltaY: number): boolean {
    if (!this.overflows()) {
      return false;
    }
    const delta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY;
    if (delta === 0) {
      return false;
    }
    this.scroll(delta);
    return true;
  }

  /** updates the hovered tab index under the pointer. */
  public override onPointerMove(_pointerId: number, x: number, _y: number): void {
    const stripLeft = (this.showLeftArrow ? ARROW_WIDTH : 0) + STRIP_PADDING_SIDE;
    const hitX = x - stripLeft + this.scrollOffset;
    let newHover = -1;
    for (let i = 0; i < this.tabs.length; i++) {
      if (hitX >= this.tabPositions[i] && hitX < this.tabPositions[i] + this.tabWidths[i]) {
        if (this.tabs[i].value !== this.value) {
          newHover = i;
        }
        break;
      }
    }
    if (newHover !== this._hoverIndex) {
      this._hoverIndex = newHover;
      this.markDirty();
    }
  }

  /** clears the hover highlight when the pointer leaves the bar. */
  public override onPointerLeave(): void {
    if (this._hoverIndex !== -1) {
      this._hoverIndex = -1;
      this.markDirty();
    }
  }

  /** width available to the scrolling strip after reserving the edge, side padding, and an arrow. */
  private scrollAvailableWidth(): number {
    return this.width - this.reservedEdge - STRIP_PADDING_SIDE * 2 - ARROW_WIDTH;
  }

  /** shifts the scroll offset by delta, clamped to the scrollable range, then updates arrow visibility. */
  private scroll(delta: number): void {
    const maxScroll = Math.max(0, this.totalTabWidth - this.scrollAvailableWidth());
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + delta));
    this.updateArrowVisibility();
    this.markDirty();
  }

  /** scrolls so the selected tab is fully visible, keeping an 8px margin from the strip edge. */
  private scrollActiveTabIntoView(): void {
    const tabCount = this.tabs.length;
    const available = this.scrollAvailableWidth();
    for (let i = 0; i < tabCount; i++) {
      if (this.tabs[i].value === this.value) {
        const tabLeft = this.tabPositions[i];
        const tabRight = tabLeft + this.tabWidths[i];
        const viewLeft = this.scrollOffset;
        const viewRight = this.scrollOffset + available;

        if (tabLeft < viewLeft) {
          this.scrollOffset = Math.max(0, tabLeft - 8);
        } else if (tabRight > viewRight) {
          const maxScroll = Math.max(0, this.totalTabWidth - available);
          this.scrollOffset = Math.min(maxScroll, tabRight - available + 8);
        }
        this.updateArrowVisibility();
        break;
      }
    }
  }

  /** true when the tabs are wider than the space available to the strip. */
  private overflows(): boolean {
    const availableWidth = this.width - this.reservedEdge - STRIP_PADDING_SIDE * 2;
    return this.totalTabWidth > availableWidth;
  }

  /** shows the left and right arrows depending on whether tabs extend past each edge. */
  private updateArrowVisibility(): void {
    const maxScroll = Math.max(0, this.totalTabWidth - this.scrollAvailableWidth());
    const overflows = maxScroll > 1;
    this.showLeftArrow = overflows && this.scrollOffset > 1;
    this.showRightArrow = overflows && this.scrollOffset < maxScroll - 1;
  }

  /** marks tab positions as stale so they are recalculated on next draw. */
  public invalidateTabs(): void {
    this._tabsDirty = true;
  }

  /**
   * recomputes each tab's x offset and width, either sized to its label content or split equally across
   * the bar, then refreshes arrow visibility. skips the work when tab count, width, and glyph width are
   * unchanged since the last call.
   */
  private computeTabPositions(totalWidth: number, charWidth: number): void {
    const tabCount = this.tabs.length;
    if (
      !this._tabsDirty &&
      tabCount === this._lastTabCount &&
      totalWidth === this._lastWidth &&
      charWidth === this._lastCharWidth
    ) {
      return;
    }
    this._tabsDirty = false;
    this._lastTabCount = tabCount;
    this._lastWidth = totalWidth;
    this._lastCharWidth = charWidth;

    if (tabCount > this.tabPositions.length) {
      this.tabPositions = new Float32Array(tabCount);
      this.tabWidths = new Float32Array(tabCount);
    }

    if (this.tabSizing === "content") {
      let position = 0;
      for (let i = 0; i < tabCount; i++) {
        const labelWidth = this.tabs[i].label.length * charWidth;
        const computedTabWidth = labelWidth + this.tabPadding * 2;
        this.tabPositions[i] = position;
        this.tabWidths[i] = computedTabWidth;
        position += computedTabWidth;
      }
      this.totalTabWidth = position;
    } else {
      const availableWidth = totalWidth - this.reservedEdge - STRIP_PADDING_SIDE * 2;
      const equalTabWidth = (availableWidth / tabCount) | 0;
      for (let i = 0; i < tabCount; i++) {
        this.tabPositions[i] = i * equalTabWidth;
        this.tabWidths[i] = equalTabWidth;
      }
      this.totalTabWidth = equalTabWidth * tabCount;
    }

    this.updateArrowVisibility();
  }
}
