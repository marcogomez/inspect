import { StackLayout } from "./core/layouts/stack-layout";
import { GuiFolder } from "./gui/gui-folder";
import { InspectPanel } from "./panel/inspect-panel";
import { StateManager } from "./panel/state-manager";
import { WidgetBuilder } from "./panel/widget-builder";
import { getGuiActive } from "./utils/activity";
import { ScrollArea } from "./widgets/scroll-area";

import type { InspectTheme } from "./themes/inspect-theme";
import type { MountOptions } from "./types";
import type { CustomControlBuilder, FolderConfig } from "./types";

/**
 * Non-singleton inspect panel registry.
 * Allows multiple independent panel instances with separate folder sets.
 */
export class InspectRegistry {
  private panel: InspectPanel | null = null;
  private builder: WidgetBuilder | null = null;
  private folderConfigs: Map<string, FolderConfig> = new Map();
  private options: MountOptions = {};
  private customBuilders: Record<string, CustomControlBuilder> = {};
  private stateManager = new StateManager();

  /** registers a folder config, replacing any existing folder with the same id. */
  public registerFolder(config: FolderConfig): this {
    this.folderConfigs.set(config.id, config);
    return this;
  }

  /** registers multiple folder configs at once. */
  public registerFolders(configs: FolderConfig[]): this {
    for (const config of configs) {
      this.folderConfigs.set(config.id, config);
    }
    return this;
  }

  /** removes the folder config with the given id. */
  public unregisterFolder(id: string): this {
    this.folderConfigs.delete(id);
    return this;
  }

  /** removes all registered folder configs. */
  public clearFolders(): this {
    this.folderConfigs.clear();
    return this;
  }

  /** mounts the panel into the container and builds the registered folders. */
  public mount(container: HTMLElement, options?: Partial<MountOptions>): void {
    if (this.panel) {
      console.warn("InspectRegistry: Already mounted. Call dispose() first.");
      return;
    }

    this.options = { ...this.options, ...options };
    this.customBuilders = this.options.customControlBuilders ?? {};

    this.panel = new InspectPanel(container, this.options);
    this.panel.ready.then(() => {
      this.rebuild();
    });
  }

  /** refreshes monitors and text logs while the panel is visible. */
  public update(): void {
    if (!this.panel || !this.panel.visible || !this.builder) {
      return;
    }
    this.builder.refreshMonitors();
    this.builder.refreshTextLogs();
  }

  /** toggles panel visibility. */
  public toggle(): void {
    this.panel?.toggle();
  }

  /** shows the panel. */
  public show(): void {
    this.panel?.show();
  }

  /** hides the panel. */
  public hide(): void {
    this.panel?.hide();
  }

  /** returns whether the panel is currently visible. */
  public isVisible(): boolean {
    return this.panel?.isVisible() ?? false;
  }

  /** returns whether the panel is being interacted with (pointer down, hover, or active gui). */
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

  /** returns the built folder widget for the given id, if any. */
  public getFolder(id: string): GuiFolder | undefined {
    return this.builder?.folders.get(id);
  }

  /** returns the custom control instance registered under the given key, if any. */
  public getCustomControl<T = unknown>(key: string): T | undefined {
    return this.builder?.customControls.get(key) as T | undefined;
  }

  /** serializes the current control values to a plain object, or null if not built. */
  public exportState(): Record<string, unknown> | null {
    if (!this.builder) {
      return null;
    }
    return this.stateManager.exportState(this.builder);
  }

  /** applies previously exported control values and redraws. */
  public importState(state: Record<string, unknown>): void {
    if (!this.builder) {
      return;
    }
    this.stateManager.importState(this.builder, state);
    this.panel?.surface.markDirty();
  }

  /** tears down the panel and clears all registered folders and builders. */
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
    this.customBuilders = {};
  }

  /** discard the current builder and rebuild the folder tree into a fresh scroll area. */
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

    const scrollArea = new ScrollArea();
    scrollArea.sizingX = "grow";
    scrollArea.sizingY = "grow";
    scrollArea.flexGrow = 1;
    scrollArea.layout = new StackLayout("vertical", theme.controlGap, "start", "stretch");
    scrollArea.setPaddingAll(theme.panelPadding);

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

    this.updateScrollContentHeight(scrollArea, theme);
    this.panel.setContent(scrollArea);
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

  /** set the scroll content height to the summed child intrinsic heights plus one gap per child. */
  private updateScrollContentHeight(scrollArea: ScrollArea, theme: InspectTheme): void {
    let totalHeight = 0;
    for (const child of scrollArea.children) {
      totalHeight += child.measureIntrinsicHeight();
    }
    scrollArea.contentHeight = totalHeight + scrollArea.children.length * theme.controlGap;
  }
}
