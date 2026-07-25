import { StackLayout } from "./core/layouts/stack-layout";
import { DEFAULTS } from "./defaults";
import { GuiButton } from "./gui/gui-button";
import { GuiFolder } from "./gui/gui-folder";
import { GuiSeparator } from "./gui/gui-separator";
import { InspectPanel } from "./panel/inspect-panel";
import { WidgetBuilder } from "./panel/widget-builder";
import { getGuiActive } from "./utils/activity";
import { exportStateAsJSON, importStateFromJSON } from "./utils/persistence";
import { Box } from "./widgets/box";
import { ScrollArea } from "./widgets/scroll-area";
import { TabBar } from "./widgets/tab-bar";
import { ToggleIcon } from "./widgets/toggle-icon";

import type { InspectTheme } from "./themes/inspect-theme";
import type { MountOptions } from "./types";
import type { CustomControlBuilder, FolderConfig, TabPageConfig } from "./types";

/**
 * Singleton API for the canvas-based inspect panel.
 * Manages mounting, folder/tab registration, keyboard toggle, and per-frame refresh.
 */
class InspectSingleton {
  private panel: InspectPanel | null = null;
  private builder: WidgetBuilder | null = null;
  private folderConfigs: Map<string, FolderConfig> = new Map();
  private tabConfigs: TabPageConfig[] | null = null;
  private options: MountOptions = {};
  private customBuilders: Record<string, CustomControlBuilder> = {};
  private toggleIcon: ToggleIcon | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private mounted = false;

  /** mounts the panel into the container, wiring the toggle key and optional toggle button. */
  public mount(container: HTMLElement, options?: Partial<MountOptions>): void {
    if (this.mounted) {
      console.warn("INSPECT: Already mounted.");
      return;
    }

    this.options = { ...this.options, ...options };
    this.mounted = true;
    this.customBuilders = this.options.customControlBuilders ?? {};

    this.panel = new InspectPanel(container, this.options);

    const toggleKey = this.options.toggleKey ?? DEFAULTS.panelDefaultToggleKey;
    this.keyHandler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return;
      }
      if (e.key.toLowerCase() === toggleKey.toLowerCase()) {
        this.toggle();
      }
    };
    window.addEventListener("keydown", this.keyHandler);

    if (this.options.showToggleButton) {
      const btnSize = this.options.toggleButtonSize ?? 21;
      const margin = this.options.margin ?? 0;
      const icon = new ToggleIcon(btnSize, this.options.position ?? "right", margin, DEFAULTS.tabBarHeight);
      icon.setState(this.panel.visible ? "x" : "hamburger");
      icon.onClick = () => this.toggle();
      this.toggleIcon = icon;
      container.appendChild(icon.element);
    }

    this.panel.ready.then(() => {
      this.rebuild();
    });
  }

  /** returns true once mount has run. */
  public isMounted(): boolean {
    return this.mounted;
  }

  /** registers a single folder, rebuilding if already mounted. */
  public registerFolder(config: FolderConfig): void {
    this.folderConfigs.set(config.id, config);
    if (this.mounted) {
      this.scheduleRebuild();
    }
  }

  /** registers multiple folders, rebuilding once if already mounted. */
  public registerFolders(configs: FolderConfig[]): void {
    for (const config of configs) {
      this.folderConfigs.set(config.id, config);
    }
    if (this.mounted) {
      this.scheduleRebuild();
    }
  }

  /** removes a folder by id, rebuilding if already mounted. */
  public unregisterFolder(id: string): void {
    this.folderConfigs.delete(id);
    if (this.mounted) {
      this.scheduleRebuild();
    }
  }

  /** removes multiple folders by id, rebuilding once if already mounted. */
  public unregisterFolders(ids: string[]): void {
    for (const id of ids) {
      this.folderConfigs.delete(id);
    }
    if (this.mounted) {
      this.scheduleRebuild();
    }
  }

  /** replaces all folders with the given tab pages, rebuilding if already mounted. */
  public registerTabs(tabs: TabPageConfig[]): void {
    this.tabConfigs = tabs;
    this.folderConfigs.clear();
    for (const tab of tabs) {
      for (const folder of tab.folders) {
        this.folderConfigs.set(folder.id, folder);
      }
    }
    if (this.mounted) {
      this.scheduleRebuild();
    }
  }

  /** per-frame refresh of monitors and text logs; call from the render loop. */
  public update(): void {
    if (!this.panel || !this.panel.visible || !this.builder) {
      return;
    }
    this.builder.refreshMonitors();
    this.builder.refreshTextLogs();
  }

  /** toggles panel visibility and syncs the toggle button icon. */
  public toggle(): void {
    this.panel?.toggle();
    this.toggleIcon?.setState(this.panel?.visible ? "x" : "hamburger");
  }

  /** shows the panel and syncs the toggle button icon. */
  public show(): void {
    this.panel?.show();
    this.toggleIcon?.setState("x");
  }

  /** hides the panel and syncs the toggle button icon. */
  public hide(): void {
    this.panel?.hide();
    this.toggleIcon?.setState("hamburger");
  }

  /** returns true if the panel is currently visible. */
  public isVisible(): boolean {
    return this.panel?.isVisible() ?? false;
  }

  /** returns true if the panel has pointer activity, hover, or an active gui interaction. */
  public isActive(): boolean {
    if (!this.panel) {
      return false;
    }
    if (this.panel.input.getActivePointerCount() > 0) {
      return true;
    }
    if (this.panel.isHovered()) {
      return true;
    }
    return getGuiActive();
  }

  /** returns the built folder for an id, or undefined if not built. */
  public getFolder(id: string): GuiFolder | undefined {
    return this.builder?.folders.get(id);
  }

  /** returns a registered custom control by key, or undefined. */
  public getCustomControl<T = unknown>(key: string): T | undefined {
    return this.builder?.customControls.get(key) as T | undefined;
  }

  /** returns a registered reorder list by key, or null. */
  public getReorderList(key: string): unknown {
    return this.builder?.reorderLists.get(key) ?? null;
  }

  /** compatibility shim; the canvas panel has no DOM pane, so this returns null. */
  public getPane(): null {
    return null;
  }

  /** tears down the builder, panel, listeners, and registered config. */
  public dispose(): void {
    if (this.builder) {
      this.builder.clear();
      this.builder = null;
    }
    if (this.panel) {
      this.panel.dispose();
      this.panel = null;
    }
    this.folderConfigs.clear();
    this.tabConfigs = null;
    this.customBuilders = {};
    this.mounted = false;
  }

  /** rebuild now if the font atlas has loaded; otherwise defer until the panel is ready. */
  private scheduleRebuild(): void {
    if (!this.panel) {
      return;
    }
    if (this.panel.theme.fontAtlas) {
      this.rebuild();
    }
  }

  /** discard the current builder and rebuild the panel content in tab or flat-folder layout. */
  private rebuild(): void {
    if (!this.panel) {
      return;
    }

    const theme = this.panel.theme;
    if (!theme.fontAtlas) {
      return;
    }

    if (this.builder) {
      this.builder.clear();
    }
    this.builder = new WidgetBuilder(theme);

    if (this.tabConfigs) {
      this.buildTabs(theme);
    } else {
      this.buildFolders(theme);
    }
  }

  /** build the tabbed layout: a tab bar switching between one scroll-area page per tab config. */
  private buildTabs(theme: InspectTheme): void {
    if (!this.panel || !this.builder || !this.tabConfigs) {
      return;
    }

    const container = new Box();
    container.sizingX = "grow";
    container.sizingY = "grow";
    container.layout = new StackLayout("vertical", 0, "start", "stretch");

    const tabBar = new TabBar();
    tabBar.sizingX = "grow";
    tabBar.sizingY = "fixed";
    tabBar.preferredHeight = DEFAULTS.tabBarHeight;
    tabBar.tabSizing = "content";
    tabBar.tabs = this.tabConfigs.map((t, i) => ({ label: t.title.toUpperCase(), value: String(i) }));
    tabBar.value = "0";
    if (this.options.showToggleButton) {
      tabBar.reservedEdge = (this.options.toggleButtonSize ?? 17) + 12;
    } else if (this.options.tabBarReservedEdge) {
      tabBar.reservedEdge = this.options.tabBarReservedEdge;
    }
    container.addChild(tabBar);

    const pages: ScrollArea[] = [];

    for (let i = 0; i < this.tabConfigs.length; i++) {
      const tabConfig = this.tabConfigs[i];
      const page = new ScrollArea();
      page.sizingX = "grow";
      page.sizingY = "grow";
      page.flexGrow = 1;
      page.visible = i === 0;
      page.bgColor = 0xffffff1a;
      page.scrollbarWidth = theme.scrollbarWidth;
      page.layout = new StackLayout("vertical", theme.controlGap, "start", "stretch");
      page.setPaddingAll(theme.panelPadding);
      page.reserveScrollbarSpace();

      for (const folderConfig of tabConfig.folders) {
        const folder = this.builder.buildFolder(folderConfig);
        this.builder.buildControls(folder, folderConfig.controls, this.customBuilders);
        page.addChild(folder);
      }

      if (tabConfig.showImportExport) {
        this.addImportExportButtons(page, theme);
      }

      pages.push(page);
      container.addChild(page);
    }

    tabBar.onChange = (value: string) => {
      const idx = parseInt(value, 10);
      for (let i = 0; i < pages.length; i++) {
        pages[i].visible = i === idx;
        if (i === idx) {
          pages[i].needsLayout = true;
        }
      }
      if (this.panel) {
        this.panel.root.needsLayout = true;
        this.panel.surface.markDirty();
      }
    };

    this.panel.setContent(container);
  }

  /** build the flat layout: every registered folder in one scroll area, nesting children under their parent. */
  private buildFolders(theme: InspectTheme): void {
    if (!this.panel || !this.builder) {
      return;
    }

    const scrollArea = new ScrollArea();
    scrollArea.sizingX = "grow";
    scrollArea.sizingY = "grow";
    scrollArea.flexGrow = 1;
    scrollArea.scrollbarWidth = theme.scrollbarWidth;
    scrollArea.layout = new StackLayout("vertical", theme.controlGap, "start", "stretch");
    scrollArea.setPaddingAll(theme.panelPadding);
    scrollArea.reserveScrollbarSpace();

    const sorted = this.getSortedFolders();
    const builtFolders = new Map<string, GuiFolder>();

    for (const config of sorted) {
      const folder = this.builder.buildFolder(config);
      this.builder.buildControls(folder, config.controls, this.customBuilders);
      builtFolders.set(config.id, folder);

      if (config.parent) {
        const parentFolder = builtFolders.get(config.parent);
        if (parentFolder) {
          parentFolder.addControl(folder);
        } else {
          scrollArea.addChild(folder);
        }
      } else {
        scrollArea.addChild(folder);
      }
    }

    if (this.options.showImportExport) {
      this.addImportExportButtons(scrollArea, theme);
    }

    this.panel.setContent(scrollArea);
  }

  /** append a separator and the export/import settings buttons to a container. */
  private addImportExportButtons(container: ScrollArea, theme: InspectTheme): void {
    const sep = new GuiSeparator();
    sep.applyTheme(theme);
    container.addChild(sep);

    const exportBtn = new GuiButton("Export Settings", () => {
      if (this.builder) {
        const state: Record<string, unknown> = {};
        for (const [key, entry] of this.builder.monitors) {
          state[key] = entry.config.value();
        }
        exportStateAsJSON(state);
      }
    });
    exportBtn.applyTheme(theme);
    container.addChild(exportBtn);

    const importBtn = new GuiButton("Import Settings", () => {
      importStateFromJSON((_state) => {
        // parsed state is not pushed back into the live controls here
      });
    });
    importBtn.applyTheme(theme);
    container.addChild(importBtn);
  }

  /** order folders so every parent precedes its children (depth-first over the parent links). */
  private getSortedFolders(): FolderConfig[] {
    const configs = Array.from(this.folderConfigs.values());
    const result: FolderConfig[] = [];
    const added = new Set<string>();

    const addWithDependencies = (config: FolderConfig): void => {
      if (added.has(config.id)) {
        return;
      }
      if (config.parent) {
        const parent = this.folderConfigs.get(config.parent);
        if (parent && !added.has(parent.id)) {
          addWithDependencies(parent);
        }
      }
      result.push(config);
      added.add(config.id);
    };

    for (const config of configs) {
      addWithDependencies(config);
    }

    return result;
  }
}

/** Global singleton instance of the canvas-based inspect panel. */
export const Inspect = new InspectSingleton();
