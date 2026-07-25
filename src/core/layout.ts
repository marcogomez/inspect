import type { Widget } from "./widget";

/** Strategy for computing child positions and sizes within a container widget. */
export interface Layout {
  /** Assigns x, y, width, height to all flow children of the container. */
  compute(container: Widget): void;
  /** Returns the intrinsic width the layout would prefer, given current children. */
  measureWidth(container: Widget): number;
  /** Returns the intrinsic height the layout would prefer, given current children. */
  measureHeight(container: Widget): number;
}
