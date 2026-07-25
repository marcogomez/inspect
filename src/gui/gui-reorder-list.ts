import { StackLayout } from "../core/layouts/stack-layout";
import { SLOT_HEIGHT, SLOT_Y, Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";
import { Box } from "../widgets/box";
import { Label } from "../widgets/label";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";

/** A single item within a reorderable list. */
export interface ReorderItem {
  id: string;
  label: string;
}

/** Configuration for a drag-to-reorder list control. */
export interface GuiReorderListConfig {
  key: string;
  items: ReorderItem[];
  onChange: (newOrder: string[]) => void;
}

/** Drag-to-reorder list widget with handle-based pointer interaction. */
export class GuiReorderList extends Widget {
  private readonly _config: GuiReorderListConfig;
  private _rows: Box[] = [];
  private _itemOrder: string[];
  private _dragging = false;
  private _dragIndex = -1;
  private _dragPointerId = -1;
  private _insertIndex = -1;

  /** seeds the working order from the config items and builds the initial rows. */
  constructor(config: GuiReorderListConfig) {
    super();
    this._config = config;
    this._itemOrder = config.items.map((item) => item.id);
    this.sizingX = "grow";
    this.sizingY = "fit";
    this.layout = new StackLayout("vertical", 2, "start", "stretch");
    this.buildRows();
  }

  /** rebuilds the row widgets from the current order, each with a drag handle and item label. */
  private buildRows(): void {
    this.removeAllChildren();
    this._rows = [];

    for (let i = 0; i < this._config.items.length; i++) {
      const item = this.findItemById(this._itemOrder[i]);
      if (!item) {
        continue;
      }

      const row = new Box();
      row.sizingX = "grow";
      row.sizingY = "fixed";
      row.preferredHeight = DEFAULTS.reorderRowHeight;
      row.bgColor = DEFAULTS.reorderRowBgColor;
      row.borderRadius = DEFAULTS.reorderRowBorderRadius;
      row.layout = new StackLayout("horizontal", 6, "start", "stretch");
      row.setPadding(0, 8, 0, 8);

      const handle = new Label();
      handle.text = "::";
      handle.color = DEFAULTS.reorderHandleColor;
      handle.sizingX = "fixed";
      handle.sizingY = "grow";
      handle.preferredWidth = DEFAULTS.reorderHandleWidth;
      handle.hAlign = "center";
      handle.vAlign = "middle";

      const itemLabel = new Label();
      itemLabel.text = item.label;
      itemLabel.sizingX = "grow";
      itemLabel.sizingY = "grow";
      itemLabel.flexGrow = 1;
      itemLabel.vAlign = "middle";
      itemLabel.color = DEFAULTS.reorderItemLabelColor;

      row.addChild(handle);
      row.addChild(itemLabel);

      this._rows.push(row);
      this.addChild(row);
    }
  }

  /** looks up an item by id, or undefined when it is not in the config. */
  private findItemById(id: string): ReorderItem | undefined {
    const items = this._config.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        return items[i];
      }
    }
    return undefined;
  }

  /** begins a drag when the press lands on a row handle with the primary button. */
  public override onPointerDown(pointerId: number, x: number, y: number, button: number): boolean {
    if (button !== 0) {
      return false;
    }
    const handleZone = DEFAULTS.reorderHandleWidth + 16;
    if (x > handleZone) {
      return false;
    }
    for (let i = 0; i < this._rows.length; i++) {
      const rowY = this._rows[i].geometry[SLOT_Y];
      const rowH = this._rows[i].geometry[SLOT_HEIGHT];
      if (y >= rowY && y < rowY + rowH) {
        this._dragging = true;
        this._dragIndex = i;
        this._dragPointerId = pointerId;
        this._insertIndex = i;
        this.markDirty();
        return true;
      }
    }
    return false;
  }

  /** tracks the pointer to update the insertion indicator while dragging. */
  public override onPointerMove(pointerId: number, _x: number, y: number): void {
    if (!this._dragging || pointerId !== this._dragPointerId) {
      return;
    }

    let newInsert = 0;
    for (let i = 0; i < this._rows.length; i++) {
      const rowMidY = this._rows[i].geometry[SLOT_Y] + this._rows[i].geometry[SLOT_HEIGHT] / 2;
      if (y > rowMidY) {
        newInsert = i + 1;
      }
    }
    newInsert = Math.max(0, Math.min(this._rows.length, newInsert));

    if (newInsert !== this._insertIndex) {
      this._insertIndex = newInsert;
      this.markDirty();
    }
  }

  /** commits the new order on release and notifies the change callback. */
  public override onPointerUp(pointerId: number, _x: number, _y: number, _button: number): void {
    if (!this._dragging || pointerId !== this._dragPointerId) {
      return;
    }

    this._dragging = false;
    this._dragPointerId = -1;

    if (this._insertIndex !== this._dragIndex && this._insertIndex !== this._dragIndex + 1) {
      const draggedId = this._itemOrder[this._dragIndex];
      const newOrder = [...this._itemOrder];
      newOrder.splice(this._dragIndex, 1);
      const adjustedInsert = this._insertIndex > this._dragIndex ? this._insertIndex - 1 : this._insertIndex;
      newOrder.splice(adjustedInsert, 0, draggedId);
      this._itemOrder = newOrder;
      this._config.onChange(newOrder);
      this.buildRows();
    }

    this._insertIndex = -1;
    this.markDirty();
  }

  /** while dragging, draws the horizontal insertion indicator at the target drop position. */
  protected override drawSelf(renderer: Renderer, _theme: Theme): void {
    if (!this._dragging || this._insertIndex < 0) {
      return;
    }

    let indicatorY: number;
    if (this._insertIndex >= this._rows.length) {
      const lastRow = this._rows[this._rows.length - 1];
      indicatorY = lastRow.geometry[SLOT_Y] + lastRow.geometry[SLOT_HEIGHT];
    } else {
      indicatorY = this._rows[this._insertIndex].geometry[SLOT_Y];
    }

    renderer.fillRect(0, indicatorY - 1, this.width, DEFAULTS.reorderIndicatorHeight, DEFAULTS.reorderIndicatorColor);
  }

  /** resets row backgrounds when the theme changes. */
  public applyTheme(_theme: Theme): void {
    for (const row of this._rows) {
      row.bgColor = 0;
    }
  }

  /** returns the list configuration. */
  public get config(): GuiReorderListConfig {
    return this._config;
  }
}
