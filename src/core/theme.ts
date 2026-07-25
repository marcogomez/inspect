import type { FontAtlas } from "./atlas";

/** Base theme tokens shared by all inspect panel variants. Colors are packed RGBA uint32. */
export interface Theme {
  bgApp: number;
  bgPanel: number;
  bgPanelInset: number;
  bgPanelRaised: number;
  bgButton: number;
  bgButtonHover: number;
  bgButtonActive: number;
  bgInput: number;
  bgSelected: number;
  bgScrollTrack: number;
  bgScrollThumb: number;

  borderPanel: number;
  borderInset: number;
  borderRaised: number;

  textPrimary: number;
  textSecondary: number;
  textMuted: number;
  textValue: number;
  textTitle: number;
  textHighlight: number;

  fontAtlas: FontAtlas;

  spacingXS: number;
  spacingSM: number;
  spacingMD: number;
  spacingLG: number;

  borderRadius: number;

  buttonHeight: number;
  labelHeight: number;
  separatorThickness: number;
}
