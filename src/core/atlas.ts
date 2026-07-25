/** Rectangular sub-region within a texture atlas image. */
export interface AtlasRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A texture atlas backed by a single image, addressable by named region. */
export interface TextureAtlas {
  readonly image: HTMLImageElement;
  /** looks up a named region, or null when the name is unknown. */
  getRegion(name: string): AtlasRegion | null;
}

/** Monospace font atlas with fixed-width character cells and lookup table. */
export interface FontAtlas extends TextureAtlas {
  readonly charWidth: number;
  readonly lineHeight: number;
  readonly firstChar: number;
  readonly lastChar: number;
  /** Flat array of [x, y, w, h] tuples per contiguous character slot. */
  readonly charTable: Int32Array;
  /** region for a character code, covering both the contiguous range and any extra glyphs, or null. */
  getCharRegion(code: number): AtlasRegion | null;
}

/**
 * Builds a flat Int32Array lookup table for contiguous character codes.
 * Each character occupies 4 slots: [x, y, width, height].
 */
export function buildCharTable(charWidth: number, lineHeight: number, firstChar: number, lastChar: number): Int32Array {
  const count = lastChar - firstChar + 1;
  const table = new Int32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const index = i * 4;
    table[index] = i * charWidth;
    table[index + 1] = 0;
    table[index + 2] = charWidth;
    table[index + 3] = lineHeight;
  }
  return table;
}
