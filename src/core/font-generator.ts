import { buildCharTable } from "./atlas";
import { rasterizeGlyph } from "./glyph-rasterizer";
import { parseTTF } from "./ttf-parser";

import type { AtlasRegion, FontAtlas } from "./atlas";

/** Configuration for generating a font atlas at runtime. */
export interface FontAtlasOptions {
  family: string;
  size: number;
  fontUrl?: string;
  fontData?: ArrayBuffer;
  firstChar?: number;
  lastChar?: number;
  extraChars?: string;
  bold?: boolean;
  italic?: boolean;
  pixelPerfect?: boolean;
}

/**
 * Creates a monospace font atlas from either a TTF/OTF source or the system font stack.
 * When pixelPerfect is true and a font source is given, glyphs are rasterized via
 * scanline fill rather than Canvas text rendering.
 */
export async function createFontAtlas(options: FontAtlasOptions): Promise<FontAtlas> {
  const {
    family,
    size,
    fontUrl,
    fontData,
    firstChar = 32,
    lastChar = 126,
    extraChars = "",
    bold = false,
    italic = false,
    pixelPerfect = false
  } = options;

  const hasFontSource = fontUrl !== undefined || fontData !== undefined;

  if (pixelPerfect && hasFontSource) {
    return createPixelPerfectAtlas(fontUrl, fontData, size, firstChar, lastChar, extraChars);
  }

  return createCanvasAtlas(family, size, firstChar, lastChar, extraChars, bold, italic);
}

/**
 * Builds an atlas by rasterizing glyph outlines from a parsed TTF/OTF source,
 * bypassing the browser's text renderer. Cells are laid out in a single row:
 * the contiguous first-to-last range, then any extra code points. Returns a
 * FontAtlas over the resulting image.
 */
async function createPixelPerfectAtlas(
  fontUrl: string | undefined,
  fontData: ArrayBuffer | undefined,
  size: number,
  firstChar: number,
  lastChar: number,
  extraChars: string
): Promise<FontAtlas> {
  if (!fontUrl && !fontData) {
    throw new Error("Pixel perfect atlas requires fontUrl or fontData");
  }
  const source = fontData ?? fontUrl;
  if (!source) {
    throw new Error("Invalid font source");
  }
  const font = await parseTTF(source);
  const scale = size / font.unitsPerEm;

  const contiguousCount = lastChar - firstChar + 1;
  const extraCodes = collectExtraCodes(extraChars, firstChar, lastChar);
  const totalCount = contiguousCount + extraCodes.length;

  const charWidth = Math.round(font.advanceWidth * scale);
  const charHeight = size;

  const atlasWidth = totalCount * charWidth;
  const atlasHeight = charHeight;
  const canvas = document.createElement("canvas");
  canvas.width = atlasWidth;
  canvas.height = atlasHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to create atlas canvas context");
  }

  const pixelBuffer = new Uint8Array(charWidth * charHeight);

  for (let index = 0; index < contiguousCount; index++) {
    const code = firstChar + index;
    const glyph = font.glyphs.get(code);
    if (!glyph) {
      continue;
    }
    pixelBuffer.fill(0);
    rasterizeGlyph(glyph, scale, charWidth, charHeight, 0, charHeight, pixelBuffer);
    writePixelsToCanvas(context, pixelBuffer, index * charWidth, 0, charWidth, charHeight);
  }

  for (let index = 0; index < extraCodes.length; index++) {
    const code = extraCodes[index];
    const glyph = font.glyphs.get(code);
    if (!glyph) {
      continue;
    }
    pixelBuffer.fill(0);
    rasterizeGlyph(glyph, scale, charWidth, charHeight, 0, charHeight, pixelBuffer);
    writePixelsToCanvas(context, pixelBuffer, (contiguousCount + index) * charWidth, 0, charWidth, charHeight);
  }

  const charTable = buildCharTable(charWidth, charHeight, firstChar, lastChar);
  const extraMap = buildExtraMap(extraCodes, contiguousCount, charWidth, charHeight);
  const image = await canvasToImage(canvas);

  return buildFontAtlas(image, charWidth, charHeight, firstChar, lastChar, charTable, extraMap);
}

/**
 * Builds an atlas by drawing each glyph with the Canvas 2D text renderer using
 * the given system font stack. The cell width is measured from a capital M, and
 * cells are laid out in one row like createPixelPerfectAtlas.
 */
async function createCanvasAtlas(
  family: string,
  size: number,
  firstChar: number,
  lastChar: number,
  extraChars: string,
  bold: boolean,
  italic: boolean
): Promise<FontAtlas> {
  await document.fonts.ready;

  const weight = bold ? "bold" : "normal";
  const style = italic ? "italic" : "normal";
  const fontString = `${style} ${weight} ${size}px "${family}", monospace`;

  const measureCanvas = document.createElement("canvas");
  measureCanvas.width = 1;
  measureCanvas.height = 1;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const measureContext = measureCanvas.getContext("2d")!;
  measureContext.font = fontString;
  measureContext.textBaseline = "top";
  const charWidth = Math.ceil(measureContext.measureText("M").width);
  const charHeight = size;

  const contiguousCount = lastChar - firstChar + 1;
  const extraCodes = collectExtraCodes(extraChars, firstChar, lastChar);
  const totalCount = contiguousCount + extraCodes.length;

  const atlasWidth = totalCount * charWidth;
  const atlasHeight = charHeight;
  const canvas = document.createElement("canvas");
  canvas.width = atlasWidth;
  canvas.height = atlasHeight;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const context = canvas.getContext("2d")!;
  context.imageSmoothingEnabled = false;
  context.font = fontString;
  context.textBaseline = "top";
  context.fillStyle = "#ffffff";

  for (let index = 0; index < contiguousCount; index++) {
    context.fillText(String.fromCharCode(firstChar + index), index * charWidth, 0);
  }
  for (let index = 0; index < extraCodes.length; index++) {
    context.fillText(String.fromCodePoint(extraCodes[index]), (contiguousCount + index) * charWidth, 0);
  }

  const charTable = buildCharTable(charWidth, charHeight, firstChar, lastChar);
  const extraMap = buildExtraMap(extraCodes, contiguousCount, charWidth, charHeight);
  const image = await canvasToImage(canvas);

  return buildFontAtlas(image, charWidth, charHeight, firstChar, lastChar, charTable, extraMap);
}

/**
 * Collects the unique code points from extraChars that fall outside the
 * contiguous first-to-last range, preserving first-seen order. These become the
 * extra atlas cells appended after the contiguous range.
 */
function collectExtraCodes(extraChars: string, firstChar: number, lastChar: number): number[] {
  const codes: number[] = [];
  const seen = new Set<number>();
  for (let index = 0; index < extraChars.length; index++) {
    const code = extraChars.codePointAt(index);
    if (code === undefined) {
      continue;
    }
    // a code point above the BMP occupies a surrogate pair, so skip its second unit
    if (code > 0xffff) {
      index++;
    }
    if (code >= firstChar && code <= lastChar) {
      continue;
    }
    if (seen.has(code)) {
      continue;
    }
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

/** maps each extra code point to its atlas region, placed in cells right after the contiguous range. */
function buildExtraMap(
  extraCodes: number[],
  contiguousCount: number,
  charWidth: number,
  charHeight: number
): Map<number, AtlasRegion> {
  const map = new Map<number, AtlasRegion>();
  for (let index = 0; index < extraCodes.length; index++) {
    map.set(extraCodes[index], {
      x: (contiguousCount + index) * charWidth,
      y: 0,
      width: charWidth,
      height: charHeight
    });
  }
  return map;
}

/**
 * Blits a single-channel coverage buffer to the canvas at (destX, destY),
 * expanding each coverage value into all four RGBA channels so the glyph is
 * white with matching alpha and can be tinted later.
 */
function writePixelsToCanvas(
  context: CanvasRenderingContext2D,
  buffer: Uint8Array,
  destX: number,
  destY: number,
  width: number,
  height: number
): void {
  const imageData = context.createImageData(width, height);
  const pixels = imageData.data;
  for (let index = 0; index < buffer.length; index++) {
    const value = buffer[index];
    const offset = index * 4;
    pixels[offset] = value;
    pixels[offset + 1] = value;
    pixels[offset + 2] = value;
    pixels[offset + 3] = value;
  }
  context.putImageData(imageData, destX, destY);
}

/** wraps a finished atlas image and its metrics into a FontAtlas with code-to-region lookup. */
function buildFontAtlas(
  image: HTMLImageElement,
  charWidth: number,
  charHeight: number,
  firstChar: number,
  lastChar: number,
  charTable: Int32Array,
  extraMap: Map<number, AtlasRegion>
): FontAtlas {
  return {
    image,
    charWidth,
    lineHeight: charHeight,
    firstChar,
    lastChar,
    charTable,
    getRegion(_name: string): AtlasRegion | null {
      return null;
    },
    // one scratch region is reused for contiguous chars, so callers must consume the result before the next call.
    getCharRegion: (() => {
      const scratch = { x: 0, y: 0, width: charWidth, height: charHeight };
      return (code: number): AtlasRegion | null => {
        if (code >= firstChar && code <= lastChar) {
          scratch.x = (code - firstChar) * charWidth;
          return scratch;
        }
        return extraMap.get(code) ?? null;
      };
    })()
  };
}

/** encodes the canvas to a data URL and resolves once it has loaded back as an HTMLImageElement. */
function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to convert atlas canvas to image"));
    image.src = canvas.toDataURL();
  });
}
