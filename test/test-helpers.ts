import { buildCharTable } from "../src/core/atlas";
import { createDarkTheme } from "../src/themes/dark";

import type { FontAtlas } from "../src/core/atlas";
import type { Theme } from "../src/core/theme";
import type { InspectTheme } from "../src/themes/inspect-theme";

/**
 * builds a minimal fixed-metrics font atlas for tests: 7px cells, 14px lines,
 * covering printable ASCII (32 to 126). getRegion returns null since no real
 * glyph image is loaded, so widgets fall back to their measured metrics.
 */
export function makeFakeFontAtlas(): FontAtlas {
  const charWidth = 7;
  const lineHeight = 14;
  const firstChar = 32;
  const lastChar = 126;
  const table = buildCharTable(charWidth, lineHeight, firstChar, lastChar);
  const img =
    typeof Image !== "undefined"
      ? new Image(charWidth * (lastChar - firstChar + 1), lineHeight)
      : ({} as HTMLImageElement);
  return {
    charWidth,
    lineHeight,
    firstChar,
    lastChar,
    charTable: table,
    image: img,
    getRegion: () => null,
    getCharRegion: () => null
  };
}

/** dark theme built on the fake atlas, typed as the base Theme. */
export function makeFakeTheme(): Theme {
  return createDarkTheme(makeFakeFontAtlas());
}

/** same dark theme as makeFakeTheme, typed as InspectTheme for panel-level tests. */
export function makeFakeInspectTheme(): InspectTheme {
  return createDarkTheme(makeFakeFontAtlas());
}
