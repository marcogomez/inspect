import {
  SLOT_FLEX_GROW,
  SLOT_FLEX_SHRINK,
  SLOT_HEIGHT,
  SLOT_MAX_HEIGHT,
  SLOT_MAX_WIDTH,
  SLOT_MIN_HEIGHT,
  SLOT_MIN_WIDTH,
  SLOT_PADDING_BOTTOM,
  SLOT_PADDING_LEFT,
  SLOT_PADDING_RIGHT,
  SLOT_PADDING_TOP,
  SLOT_PREFERRED_HEIGHT,
  SLOT_PREFERRED_WIDTH,
  SLOT_WIDTH,
  SLOT_X,
  SLOT_Y
} from "../widget";

import type { Layout } from "../layout";
import type { Widget } from "../widget";

/** Main-axis direction for stacking children. */
export type StackDirection = "horizontal" | "vertical";
/** Main-axis distribution of remaining space. */
export type StackJustify = "start" | "center" | "end";
/** Cross-axis alignment for children. */
export type StackAlign = "start" | "center" | "end" | "stretch";

/**
 * Flexbox-style layout that stacks children along a single axis with optional
 * wrapping, grow/shrink factors, percent sizing, and cross-axis alignment.
 */
export class StackLayout implements Layout {
  public readonly direction: StackDirection;
  public readonly gap: number;
  public readonly justify: StackJustify;
  public readonly align: StackAlign;
  public readonly wrap: boolean;
  public readonly runGap: number;

  private _flowChildren: Widget[] = [];
  private _sizes = new Float64Array(32);
  private _wrapLines: { startIndex: number; endIndex: number; mainUsed: number; crossExtent: number }[] = [];
  private _wrapLineSizes: Float64Array[] = [];

  /**
   * @param direction main axis to stack along
   * @param gap space between adjacent children on the main axis
   * @param justify distribution of leftover main-axis space
   * @param align default cross-axis alignment for children
   * @param wrap whether children flow onto multiple lines when they overflow
   * @param runGap space between wrapped lines on the cross axis
   */
  constructor(
    direction: StackDirection,
    gap = 0,
    justify: StackJustify = "start",
    align: StackAlign = "stretch",
    wrap = false,
    runGap = 0
  ) {
    this.direction = direction;
    this.gap = gap;
    this.justify = justify;
    this.align = align;
    this.wrap = wrap;
    this.runGap = runGap;
  }

  /** returns the intrinsic width of the container's children for this layout. */
  public measureWidth(container: Widget): number {
    const children = container.children;
    const isHorizontal = this.direction === "horizontal";
    let total = 0;
    let visibleCount = 0;
    for (let index = 0; index < children.length; index++) {
      const child = children[index];
      if (!child.visible || child.absolute) {
        continue;
      }
      visibleCount++;
      total += isHorizontal ? child.measureIntrinsicWidth() : child.measureIntrinsicHeight();
    }
    if (isHorizontal) {
      return total + Math.max(0, visibleCount - 1) * this.gap;
    }
    let maxCrossSize = 0;
    for (let index = 0; index < children.length; index++) {
      if (!children[index].visible || children[index].absolute) {
        continue;
      }
      const intrinsicWidth = children[index].measureIntrinsicWidth();
      if (intrinsicWidth > maxCrossSize) {
        maxCrossSize = intrinsicWidth;
      }
    }
    return maxCrossSize;
  }

  /** returns the intrinsic height of the container's children for this layout. */
  public measureHeight(container: Widget): number {
    const children = container.children;
    const isHorizontal = this.direction === "horizontal";
    let total = 0;
    let visibleCount = 0;
    for (let index = 0; index < children.length; index++) {
      const child = children[index];
      if (!child.visible || child.absolute) {
        continue;
      }
      visibleCount++;
      total += child.measureIntrinsicHeight();
    }
    if (!isHorizontal) {
      return total + Math.max(0, visibleCount - 1) * this.gap;
    }
    let maxCrossSize = 0;
    for (let index = 0; index < children.length; index++) {
      if (!children[index].visible || children[index].absolute) {
        continue;
      }
      const intrinsicHeight = children[index].measureIntrinsicHeight();
      if (intrinsicHeight > maxCrossSize) {
        maxCrossSize = intrinsicHeight;
      }
    }
    return maxCrossSize;
  }

  /** positions and sizes the container's children along the main axis. */
  public compute(container: Widget): void {
    const children = container.children;
    const containerGeometry = container.geometry;
    const isHorizontal = this.direction === "horizontal";
    const containerInnerWidth =
      containerGeometry[SLOT_WIDTH] - containerGeometry[SLOT_PADDING_LEFT] - containerGeometry[SLOT_PADDING_RIGHT];
    const containerInnerHeight =
      containerGeometry[SLOT_HEIGHT] - containerGeometry[SLOT_PADDING_TOP] - containerGeometry[SLOT_PADDING_BOTTOM];
    const mainSize = isHorizontal ? containerInnerWidth : containerInnerHeight;
    const crossSize = isHorizontal ? containerInnerHeight : containerInnerWidth;

    let flowCount = 0;
    for (let index = 0; index < children.length; index++) {
      if (children[index].visible && !children[index].absolute) {
        this._flowChildren[flowCount++] = children[index];
      }
    }
    const flowChildren = this._flowChildren;

    if (this.wrap) {
      this.computeWrapped(flowChildren, flowCount, mainSize, crossSize, isHorizontal);
    } else {
      this.computeSingleLine(flowChildren, flowCount, mainSize, crossSize, isHorizontal);
    }
  }

  /**
   * Lays out all children on a single line. Percent children take a fraction of
   * the main size, fixed and fit children take their preferred or intrinsic
   * size, and grow children share the leftover space by flex weight. Sizes are
   * clamped to each child's min/max, and any remaining overflow is resolved by
   * compressChildren before positioning them per the justify setting.
   */
  private computeSingleLine(
    flowChildren: Widget[],
    childCount: number,
    mainSize: number,
    crossSize: number,
    isHorizontal: boolean
  ): void {
    const totalGap = Math.max(0, childCount - 1) * this.gap;
    if (childCount > this._sizes.length) {
      this._sizes = new Float64Array(childCount);
    }
    const sizes = this._sizes;
    sizes.fill(0, 0, childCount);

    let percentTotal = 0;
    for (let i = 0; i < childCount; i++) {
      const child = flowChildren[i];
      const sizingMode = isHorizontal ? child.sizingX : child.sizingY;
      if (sizingMode === "percent") {
        const percent = isHorizontal ? child.percentWidth : child.percentHeight;
        const percentSize = (mainSize - totalGap) * percent;
        sizes[i] = percentSize;
        percentTotal += percentSize;
      }
    }

    let fixedTotal = 0;
    let growTotal = 0;

    for (let i = 0; i < childCount; i++) {
      const child = flowChildren[i];
      const childGeometry = child.geometry;
      const sizingMode = isHorizontal ? child.sizingX : child.sizingY;

      if (sizingMode === "percent") {
        continue;
      }

      if (sizingMode === "grow") {
        growTotal += childGeometry[SLOT_FLEX_GROW] > 0 ? childGeometry[SLOT_FLEX_GROW] : 1;
      } else if (childGeometry[SLOT_FLEX_GROW] > 0) {
        growTotal += childGeometry[SLOT_FLEX_GROW];
        const intrinsicSize = isHorizontal ? child.measureIntrinsicWidth() : child.measureIntrinsicHeight();
        sizes[i] = intrinsicSize;
        fixedTotal += intrinsicSize;
      } else if (sizingMode === "fixed") {
        const preferredSize = isHorizontal ? childGeometry[SLOT_PREFERRED_WIDTH] : childGeometry[SLOT_PREFERRED_HEIGHT];
        sizes[i] = preferredSize;
        fixedTotal += preferredSize;
      } else {
        const intrinsicSize = isHorizontal ? child.measureIntrinsicWidth() : child.measureIntrinsicHeight();
        sizes[i] = intrinsicSize;
        fixedTotal += intrinsicSize;
      }
    }

    const remainingForGrow = Math.max(0, mainSize - fixedTotal - percentTotal - totalGap);

    if (growTotal > 0) {
      for (let i = 0; i < childCount; i++) {
        const child = flowChildren[i];
        const childGeometry = child.geometry;
        const sizingMode = isHorizontal ? child.sizingX : child.sizingY;
        if (sizingMode === "grow" || childGeometry[SLOT_FLEX_GROW] > 0) {
          const weight = childGeometry[SLOT_FLEX_GROW] > 0 ? childGeometry[SLOT_FLEX_GROW] : 1;
          sizes[i] += (weight / growTotal) * remainingForGrow;
        }
      }
    }

    for (let i = 0; i < childCount; i++) {
      const childGeometry = flowChildren[i].geometry;
      const minSize = isHorizontal ? childGeometry[SLOT_MIN_WIDTH] : childGeometry[SLOT_MIN_HEIGHT];
      const maxSize = isHorizontal ? childGeometry[SLOT_MAX_WIDTH] : childGeometry[SLOT_MAX_HEIGHT];
      sizes[i] = Math.max(minSize, Math.min(maxSize, sizes[i]));
    }

    let usedTotal = totalGap;
    for (let i = 0; i < childCount; i++) {
      usedTotal += sizes[i];
    }

    const overflow = usedTotal - mainSize;
    if (overflow > 0) {
      this.compressChildren(flowChildren, childCount, sizes, overflow, isHorizontal);
    }

    usedTotal = totalGap;
    for (let i = 0; i < childCount; i++) {
      usedTotal += sizes[i];
    }

    let position = 0;
    if (this.justify === "center") {
      position = Math.round((mainSize - usedTotal) / 2);
    } else if (this.justify === "end") {
      position = mainSize - usedTotal;
    }

    for (let i = 0; i < childCount; i++) {
      this.positionChild(flowChildren[i], sizes[i], position, crossSize, isHorizontal);
      position += sizes[i] + this.gap;
    }
  }

  /**
   * Lays out children across multiple lines. Children are first packed into
   * lines that fit within mainSize, then each line resolves its own grow and
   * min/max sizing and its tallest cross extent. Lines are stacked on the cross
   * axis separated by runGap, with per-child cross alignment applied within each
   * line. Cached per-line buffers are grown as needed to avoid re-allocation.
   */
  private computeWrapped(
    flowChildren: Widget[],
    flowCount: number,
    mainSize: number,
    _crossSize: number,
    isHorizontal: boolean
  ): void {
    const lines = this._wrapLines;
    let lineCount = 0;
    let lineStart = 0;
    let lineMainUsed = 0;
    let lineItemCount = 0;

    for (let i = 0; i < flowCount; i++) {
      const child = flowChildren[i];
      const childMainSize = isHorizontal ? child.measureIntrinsicWidth() : child.measureIntrinsicHeight();
      const gapBefore = lineItemCount > 0 ? this.gap : 0;

      if (lineItemCount > 0 && lineMainUsed + gapBefore + childMainSize > mainSize) {
        if (lineCount >= lines.length) {
          lines.push({ startIndex: 0, endIndex: 0, mainUsed: 0, crossExtent: 0 });
        }
        const ld = lines[lineCount];
        ld.startIndex = lineStart;
        ld.endIndex = i;
        ld.mainUsed = lineMainUsed;
        ld.crossExtent = 0;
        lineCount++;
        lineStart = i;
        lineMainUsed = childMainSize;
        lineItemCount = 1;
      } else {
        lineMainUsed += gapBefore + childMainSize;
        lineItemCount++;
      }
    }

    if (lineItemCount > 0) {
      if (lineCount >= lines.length) {
        lines.push({ startIndex: 0, endIndex: 0, mainUsed: 0, crossExtent: 0 });
      }
      const ld = lines[lineCount];
      ld.startIndex = lineStart;
      ld.endIndex = flowCount;
      ld.mainUsed = lineMainUsed;
      ld.crossExtent = 0;
      lineCount++;
    }

    const lineSizes = this._wrapLineSizes;

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const line = lines[lineIndex];
      const ls = line.startIndex;
      const le = line.endIndex;
      const lineChildCount = le - ls;
      const lineTotalGap = Math.max(0, lineChildCount - 1) * this.gap;

      let sizes: Float64Array;
      if (lineIndex < lineSizes.length) {
        sizes = lineSizes[lineIndex];
        if (sizes.length < lineChildCount) {
          sizes = new Float64Array(lineChildCount);
          lineSizes[lineIndex] = sizes;
        }
      } else {
        sizes = new Float64Array(Math.max(lineChildCount, 16));
        lineSizes.push(sizes);
      }
      sizes.fill(0, 0, lineChildCount);

      let fixedTotal = 0;
      let growTotal = 0;

      for (let i = 0; i < lineChildCount; i++) {
        const child = flowChildren[ls + i];
        const childGeometry = child.geometry;
        const sizingMode = isHorizontal ? child.sizingX : child.sizingY;

        if (sizingMode === "grow") {
          growTotal += childGeometry[SLOT_FLEX_GROW] > 0 ? childGeometry[SLOT_FLEX_GROW] : 1;
        } else if (childGeometry[SLOT_FLEX_GROW] > 0) {
          growTotal += childGeometry[SLOT_FLEX_GROW];
          const intrinsicSize = isHorizontal ? child.measureIntrinsicWidth() : child.measureIntrinsicHeight();
          sizes[i] = intrinsicSize;
          fixedTotal += intrinsicSize;
        } else if (sizingMode === "fixed") {
          const preferredSize = isHorizontal
            ? childGeometry[SLOT_PREFERRED_WIDTH]
            : childGeometry[SLOT_PREFERRED_HEIGHT];
          sizes[i] = preferredSize;
          fixedTotal += preferredSize;
        } else if (sizingMode === "percent") {
          const percent = isHorizontal ? child.percentWidth : child.percentHeight;
          const percentSize = (mainSize - lineTotalGap) * percent;
          sizes[i] = percentSize;
          fixedTotal += percentSize;
        } else {
          const intrinsicSize = isHorizontal ? child.measureIntrinsicWidth() : child.measureIntrinsicHeight();
          sizes[i] = intrinsicSize;
          fixedTotal += intrinsicSize;
        }
      }

      const remainingForGrow = Math.max(0, mainSize - fixedTotal - lineTotalGap);

      if (growTotal > 0) {
        for (let i = 0; i < lineChildCount; i++) {
          const child = flowChildren[ls + i];
          const childGeometry = child.geometry;
          const sizingMode = isHorizontal ? child.sizingX : child.sizingY;
          if (sizingMode === "grow" || childGeometry[SLOT_FLEX_GROW] > 0) {
            const weight = childGeometry[SLOT_FLEX_GROW] > 0 ? childGeometry[SLOT_FLEX_GROW] : 1;
            sizes[i] += (weight / growTotal) * remainingForGrow;
          }
        }
      }

      let maxCross = 0;
      for (let i = 0; i < lineChildCount; i++) {
        const childGeometry = flowChildren[ls + i].geometry;
        const minSize = isHorizontal ? childGeometry[SLOT_MIN_WIDTH] : childGeometry[SLOT_MIN_HEIGHT];
        const maxSize = isHorizontal ? childGeometry[SLOT_MAX_WIDTH] : childGeometry[SLOT_MAX_HEIGHT];
        sizes[i] = Math.max(minSize, Math.min(maxSize, sizes[i]));

        const childCrossSize = isHorizontal
          ? flowChildren[ls + i].measureIntrinsicHeight()
          : flowChildren[ls + i].measureIntrinsicWidth();
        const preferredCross = isHorizontal
          ? childGeometry[SLOT_PREFERRED_HEIGHT]
          : childGeometry[SLOT_PREFERRED_WIDTH];
        const effectiveCross = preferredCross > 0 ? preferredCross : childCrossSize;
        if (effectiveCross > maxCross) {
          maxCross = effectiveCross;
        }
      }

      line.crossExtent = maxCross;
    }

    let crossPosition = 0;

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const line = lines[lineIndex];
      const ls = line.startIndex;
      const le = line.endIndex;
      const lineChildCount = le - ls;
      const sizes = lineSizes[lineIndex];
      const lineCrossSize = line.crossExtent;

      let usedTotal = Math.max(0, lineChildCount - 1) * this.gap;
      for (let i = 0; i < lineChildCount; i++) {
        usedTotal += sizes[i];
      }

      let position = 0;
      if (this.justify === "center") {
        position = Math.round((mainSize - usedTotal) / 2);
      } else if (this.justify === "end") {
        position = mainSize - usedTotal;
      }

      for (let i = 0; i < lineChildCount; i++) {
        const child = flowChildren[ls + i];
        const childGeometry = child.geometry;
        const size = sizes[i];

        const childAlignSelf = child.alignSelf ?? this.align;
        const preferredCrossSize = isHorizontal
          ? childGeometry[SLOT_PREFERRED_HEIGHT]
          : childGeometry[SLOT_PREFERRED_WIDTH];

        let crossExtent = lineCrossSize;
        let childCrossPosition = 0;

        if (childAlignSelf !== "stretch" && preferredCrossSize > 0) {
          crossExtent = Math.min(preferredCrossSize, lineCrossSize);
        }
        if (childAlignSelf === "center") {
          childCrossPosition = Math.round((lineCrossSize - crossExtent) / 2);
        } else if (childAlignSelf === "end") {
          childCrossPosition = lineCrossSize - crossExtent;
        }

        if (isHorizontal) {
          childGeometry[SLOT_X] = position | 0;
          childGeometry[SLOT_Y] = (crossPosition + childCrossPosition) | 0;
          childGeometry[SLOT_WIDTH] = size | 0;
          childGeometry[SLOT_HEIGHT] = crossExtent | 0;
        } else {
          childGeometry[SLOT_X] = (crossPosition + childCrossPosition) | 0;
          childGeometry[SLOT_Y] = position | 0;
          childGeometry[SLOT_WIDTH] = crossExtent | 0;
          childGeometry[SLOT_HEIGHT] = size | 0;
        }

        child.needsLayout = true;
        position += size + this.gap;
      }

      crossPosition += lineCrossSize + this.runGap;
    }
  }

  /**
   * Shrinks children to absorb a main-axis overflow. Each child's share is
   * weighted by its flex-shrink factor times its current size, so larger and
   * more shrinkable children give up more, and no child shrinks below its
   * minimum. Children with a zero shrink factor are left untouched.
   */
  private compressChildren(
    flowChildren: Widget[],
    childCount: number,
    sizes: Float64Array,
    overflow: number,
    isHorizontal: boolean
  ): void {
    let remainingOverflow = overflow;

    let totalShrinkWeight = 0;
    for (let i = 0; i < childCount; i++) {
      const shrinkFactor = flowChildren[i].geometry[SLOT_FLEX_SHRINK];
      if (shrinkFactor > 0) {
        totalShrinkWeight += shrinkFactor * sizes[i];
      }
    }

    if (totalShrinkWeight <= 0) {
      return;
    }

    // weight each child's share against the shrink weight still remaining, not the
    // fixed total, so the overflow is absorbed in full: a child that bottoms out at
    // its minimum passes its unused share on to the children after it.
    let remainingShrinkWeight = totalShrinkWeight;
    for (let i = 0; i < childCount; i++) {
      const childGeometry = flowChildren[i].geometry;
      const shrinkFactor = childGeometry[SLOT_FLEX_SHRINK];
      if (shrinkFactor <= 0) {
        continue;
      }

      const weight = shrinkFactor * sizes[i];
      const shrinkContribution = weight / remainingShrinkWeight;
      const reduction = remainingOverflow * shrinkContribution;
      const minSize = isHorizontal ? childGeometry[SLOT_MIN_WIDTH] : childGeometry[SLOT_MIN_HEIGHT];
      const newSize = Math.max(minSize, sizes[i] - reduction);
      const actualReduction = sizes[i] - newSize;
      sizes[i] = newSize;
      remainingOverflow -= actualReduction;
      remainingShrinkWeight -= weight;
    }
  }

  /**
   * Writes one child's geometry: its main-axis size and position come from the
   * caller, while its cross-axis extent and offset come from alignSelf (falling
   * back to the layout's align). Non-stretch children keep their preferred cross
   * size, then are centered or end-aligned within the available cross space.
   */
  private positionChild(
    child: Widget,
    size: number,
    mainPosition: number,
    crossSize: number,
    isHorizontal: boolean
  ): void {
    const childGeometry = child.geometry;
    const childAlignSelf = child.alignSelf ?? this.align;
    const preferredCrossSize = isHorizontal
      ? childGeometry[SLOT_PREFERRED_HEIGHT]
      : childGeometry[SLOT_PREFERRED_WIDTH];

    let crossExtent = crossSize;
    let crossPosition = 0;

    if (childAlignSelf !== "stretch" && preferredCrossSize > 0) {
      crossExtent = Math.min(preferredCrossSize, crossSize);
    }
    if (childAlignSelf === "center") {
      crossPosition = Math.round((crossSize - crossExtent) / 2);
    } else if (childAlignSelf === "end") {
      crossPosition = crossSize - crossExtent;
    }

    if (isHorizontal) {
      childGeometry[SLOT_X] = mainPosition | 0;
      childGeometry[SLOT_Y] = crossPosition | 0;
      childGeometry[SLOT_WIDTH] = size | 0;
      childGeometry[SLOT_HEIGHT] = crossExtent | 0;
    } else {
      childGeometry[SLOT_X] = crossPosition | 0;
      childGeometry[SLOT_Y] = mainPosition | 0;
      childGeometry[SLOT_WIDTH] = crossExtent | 0;
      childGeometry[SLOT_HEIGHT] = size | 0;
    }

    child.needsLayout = true;
  }
}
