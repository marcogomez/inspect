import type { Theme } from "../core/theme";

/** Extended theme tokens specific to the inspect panel (folders, accents, layout sizes). */
export interface InspectTheme extends Theme {
  bgFolder: number;
  bgFolderHover: number;
  textFolder: number;
  bgAccent: number;
  bgAccentDim: number;
  textLabel: number;
  bgOverlay: number;
  /** opaque fill for floating dropdown lists, which draw over arbitrary panel content. */
  bgDropdown: number;
  controlHeight: number;
  controlGap: number;
  /** fraction of control width given to the label column. */
  labelRatio: number;
  folderHeaderHeight: number;
  panelPadding: number;
  scrollbarWidth: number;
  /** vertical nudge applied to baseline-align text within a control. */
  textOffsetY: number;
}
