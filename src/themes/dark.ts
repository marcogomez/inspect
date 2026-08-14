import type { InspectTheme } from "./inspect-theme";
import type { FontAtlas } from "../core/atlas";

/** Creates the default dark theme with semi-transparent backgrounds. */
export function createDarkTheme(fontAtlas: FontAtlas): InspectTheme {
  return {
    bgApp: 0x000000e8,
    bgPanel: 0x0a0a0ed9,
    bgPanelInset: 0x00000040,
    bgPanelRaised: 0xffffff1a,
    bgButton: 0xffffff1f,
    bgButtonHover: 0xffffff26,
    bgButtonActive: 0xffffff40,
    bgInput: 0xffffff14,
    bgSelected: 0x82b4ffb3,
    bgScrollTrack: 0x00000000,
    bgScrollThumb: 0xffffff26,

    borderPanel: 0xffffff14,
    borderInset: 0xffffff0f,
    borderRaised: 0xffffff14,

    textPrimary: 0xfffffff2,
    textSecondary: 0xffffff59,
    textMuted: 0xffffff80,
    textValue: 0xb4dcffd9,
    textTitle: 0xffffffe6,
    textHighlight: 0xffffffff,

    fontAtlas,

    spacingXS: 1,
    spacingSM: 2,
    spacingMD: 4,
    spacingLG: 8,

    borderRadius: 3,
    buttonHeight: 24,
    labelHeight: 24,
    separatorThickness: 2,

    bgFolder: 0xffffff0f,
    bgFolderHover: 0xffffff17,
    textFolder: 0xffffffe6,
    bgAccent: 0x82b4ffb3,
    bgAccentDim: 0x82b4ff4d,
    textLabel: 0xffffff80,
    bgOverlay: 0x000000aa,
    // the raised wash composited over the panel stack lands on this color, so
    // dropdowns keep the same look while staying solid over whatever they cover
    bgDropdown: 0x222226ff,
    controlHeight: 24,
    controlGap: 4,
    labelRatio: 0.36,
    folderHeaderHeight: 28,
    panelPadding: 8,
    scrollbarWidth: 5,
    textOffsetY: 0
  };
}
