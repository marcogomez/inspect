import { StackLayout } from "../core/layouts/stack-layout";
import { Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";
import { Box } from "../widgets/box";
import { TabBar } from "../widgets/tab-bar";

import type { Theme } from "../core/theme";

/** Container with a tab bar and switchable page widgets. */
export class GuiTabContainer extends Widget {
  private readonly _tabBar: TabBar;
  private readonly _pages: Box[] = [];
  private _activeIndex = 0;

  /** builds the tab bar and wires tab selection to switch the active page. */
  constructor() {
    super();
    this.sizingX = "grow";
    this.sizingY = "grow";
    this.layout = new StackLayout("vertical", 0, "start", "stretch");

    this._tabBar = new TabBar();
    this._tabBar.sizingX = "grow";
    this._tabBar.sizingY = "fixed";
    this._tabBar.preferredHeight = DEFAULTS.guiTabContainerTabBarHeight;
    this._tabBar.onChange = (value: string) => {
      const index = parseInt(value, 10);
      if (!isNaN(index)) {
        this.setActivePage(index);
      }
    };
    this.addChild(this._tabBar);
  }

  /** adds a new page with the given tab title and returns its content box. */
  public addPage(title: string): Box {
    const index = this._pages.length;

    this._tabBar.tabs.push({ label: title, value: String(index) });

    if (index === 0) {
      this._tabBar.value = "0";
    }

    const page = new Box();
    page.sizingX = "grow";
    page.sizingY = "grow";
    page.flexGrow = 1;
    page.layout = new StackLayout("vertical", 0, "start", "stretch");
    page.visible = index === this._activeIndex;

    this._pages.push(page);
    this.addChild(page);

    this._tabBar.markDirty();
    return page;
  }

  /** returns the number of pages. */
  public getPageCount(): number {
    return this._pages.length;
  }

  /** switches the active page to the given index, ignoring out-of-range values. */
  public setActivePage(index: number): void {
    if (index < 0 || index >= this._pages.length) {
      return;
    }
    if (index === this._activeIndex) {
      return;
    }

    this._pages[this._activeIndex].visible = false;
    this._pages[this._activeIndex].markDirty();

    this._activeIndex = index;
    this._pages[this._activeIndex].visible = true;
    this._pages[this._activeIndex].markDirty();

    this._tabBar.value = String(index);
    this._tabBar.markDirty();
    this.markDirty();
  }

  /** returns the index of the active page. */
  public getActivePage(): number {
    return this._activeIndex;
  }

  /** returns the content box for the page at the given index, or null if out of range. */
  public getPage(index: number): Box | null {
    return this._pages[index] ?? null;
  }

  /** the underlying tab bar widget. */
  public get tabBar(): TabBar {
    return this._tabBar;
  }

  /** applies theme values to the tab bar. */
  public applyTheme(theme: Theme): void {
    this._tabBar.preferredHeight = theme.buttonHeight;
  }
}
