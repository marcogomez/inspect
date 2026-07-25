/** A parsed TrueType glyph with its outline contours and bounding box. */
export interface TTFGlyph {
  contours: TTFContour[];
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

/** A single closed contour of a glyph outline. */
export interface TTFContour {
  points: { x: number; y: number; onCurve: boolean }[];
}

/** Minimal parsed TTF font data: metrics and glyph outlines keyed by character code. */
export interface TTFFont {
  unitsPerEm: number;
  advanceWidth: number;
  glyphs: Map<number, TTFGlyph>;
}

/**
 * Parses a TrueType/OpenType font file into glyph outlines.
 * TrueType/OpenType parsing per Apple TrueType Reference (1990) and OpenType spec 1.9
 *
 * @param source - URL string to fetch, or raw ArrayBuffer of font data.
 */
export async function parseTTF(source: string | ArrayBuffer): Promise<TTFFont> {
  let buffer: ArrayBuffer;
  if (typeof source === "string") {
    const response = await fetch(source);
    buffer = await response.arrayBuffer();
  } else {
    buffer = source;
  }

  const view = new DataView(buffer);
  const numTables = view.getUint16(4);

  const tables: Record<string, { offset: number; length: number }> = {};
  for (let i = 0; i < numTables; i++) {
    const offset = 12 + i * 16;
    const tag =
      String.fromCharCode(view.getUint8(offset)) +
      String.fromCharCode(view.getUint8(offset + 1)) +
      String.fromCharCode(view.getUint8(offset + 2)) +
      String.fromCharCode(view.getUint8(offset + 3));
    tables[tag] = {
      offset: view.getUint32(offset + 8),
      length: view.getUint32(offset + 12)
    };
  }

  const head = tables["head"];
  if (!head) {
    throw new Error("Missing head table");
  }
  const unitsPerEm = view.getUint16(head.offset + 18);
  const indexToLocFormat = view.getInt16(head.offset + 50);

  const cmap = tables["cmap"];
  if (!cmap) {
    throw new Error("Missing cmap table");
  }
  const charToGlyph = parseCmap(view, cmap.offset);

  const loca = tables["loca"];
  const glyf = tables["glyf"];
  if (!loca || !glyf) {
    throw new Error("Missing loca/glyf tables");
  }

  const maxp = tables["maxp"];
  const numGlyphs = maxp ? view.getUint16(maxp.offset + 4) : 0;

  const glyphOffsets = parseLocaTable(view, loca.offset, numGlyphs, indexToLocFormat);

  const hmtx = tables["hmtx"];
  const hhea = tables["hhea"];
  let advanceWidth = unitsPerEm;
  if (hmtx && hhea) {
    const numOfLongHorMetrics = view.getUint16(hhea.offset + 34);
    if (numOfLongHorMetrics > 0) {
      advanceWidth = view.getUint16(hmtx.offset);
    }
  }

  const glyphs = new Map<number, TTFGlyph>();
  for (const [charCode, glyphId] of charToGlyph) {
    if (glyphId >= glyphOffsets.length - 1) {
      continue;
    }
    const glyphOffset = glyphOffsets[glyphId];
    const nextOffset = glyphOffsets[glyphId + 1];
    if (glyphOffset === nextOffset) {
      continue;
    }
    const glyph = parseGlyph(view, glyf.offset + glyphOffset, glyf.offset, glyphOffsets);
    if (glyph) {
      glyphs.set(charCode, glyph);
    }
  }

  return { unitsPerEm, advanceWidth, glyphs };
}

/**
 * Parses the cmap table into a character-code to glyph-id map, preferring the
 * Windows Unicode BMP subtable (platform 3, encoding 1) and otherwise the first
 * Unicode subtable (platform 0). Only formats 4 and 12 are decoded.
 * See https://learn.microsoft.com/en-us/typography/opentype/spec/cmap
 */
function parseCmap(view: DataView, offset: number): Map<number, number> {
  const numSubtables = view.getUint16(offset + 2);
  const result = new Map<number, number>();

  let bestOffset = -1;
  for (let i = 0; i < numSubtables; i++) {
    const subtableOffset = offset + 4 + i * 8;
    const platformId = view.getUint16(subtableOffset);
    const encodingId = view.getUint16(subtableOffset + 2);
    const tableOffset = offset + view.getUint32(subtableOffset + 4);

    if (platformId === 3 && encodingId === 1) {
      bestOffset = tableOffset;
      break;
    }
    if (platformId === 0) {
      bestOffset = tableOffset;
    }
  }

  if (bestOffset === -1) {
    return result;
  }

  const format = view.getUint16(bestOffset);
  if (format === 4) {
    parseCmapFormat4(view, bestOffset, result);
  } else if (format === 12) {
    parseCmapFormat12(view, bestOffset, result);
  }

  return result;
}

/**
 * Decodes a format 4 (segment mapping to delta values) cmap subtable, the
 * common BMP encoding. Each segment maps a start-to-end code range either by
 * adding a delta or by indexing the glyph-id array through its range offset.
 * See https://learn.microsoft.com/en-us/typography/opentype/spec/cmap#format-4
 */
function parseCmapFormat4(view: DataView, offset: number, result: Map<number, number>): void {
  const segCount = view.getUint16(offset + 6) / 2;
  const endOffset = offset + 14;
  const startOffset = endOffset + segCount * 2 + 2;
  const deltaOffset = startOffset + segCount * 2;
  const rangeOffsetValueset = deltaOffset + segCount * 2;

  for (let i = 0; i < segCount; i++) {
    const endCode = view.getUint16(endOffset + i * 2);
    const startCode = view.getUint16(startOffset + i * 2);
    const delta = view.getInt16(deltaOffset + i * 2);
    const rangeOffsetValue = view.getUint16(rangeOffsetValueset + i * 2);

    if (startCode === 0xffff) {
      break;
    }

    for (let c = startCode; c <= endCode; c++) {
      let glyphId: number;
      if (rangeOffsetValue === 0) {
        glyphId = (c + delta) & 0xffff;
      } else {
        const glyphIndexOffset = rangeOffsetValueset + i * 2 + rangeOffsetValue + (c - startCode) * 2;
        glyphId = view.getUint16(glyphIndexOffset);
        if (glyphId !== 0) {
          glyphId = (glyphId + delta) & 0xffff;
        }
      }
      if (glyphId !== 0) {
        result.set(c, glyphId);
      }
    }
  }
}

/**
 * Decodes a format 12 (segmented coverage) cmap subtable, used for code points
 * beyond the BMP. Each group maps a contiguous code range onto contiguous glyph
 * ids starting at startGlyph.
 * See https://learn.microsoft.com/en-us/typography/opentype/spec/cmap#format-12
 */
function parseCmapFormat12(view: DataView, offset: number, result: Map<number, number>): void {
  const numGroups = view.getUint32(offset + 12);
  for (let i = 0; i < numGroups; i++) {
    const groupOffset = offset + 16 + i * 12;
    const startCode = view.getUint32(groupOffset);
    const endCode = view.getUint32(groupOffset + 4);
    const startGlyph = view.getUint32(groupOffset + 8);
    for (let c = startCode; c <= endCode; c++) {
      result.set(c, startGlyph + (c - startCode));
    }
  }
}

/**
 * Reads the loca table of per-glyph offsets into the glyf table. Format 0 (short)
 * stores half-offsets that are doubled; format 1 (long) stores byte offsets
 * directly. The array has numGlyphs + 1 entries so each glyph's length is the
 * gap to the next offset.
 */
function parseLocaTable(view: DataView, offset: number, numGlyphs: number, format: number): Uint32Array {
  const offsets = new Uint32Array(numGlyphs + 1);
  if (format === 0) {
    for (let i = 0; i <= numGlyphs; i++) {
      offsets[i] = view.getUint16(offset + i * 2) * 2;
    }
  } else {
    for (let i = 0; i <= numGlyphs; i++) {
      offsets[i] = view.getUint32(offset + i * 4);
    }
  }
  return offsets;
}

/**
 * Parses one glyph from the glyf table. A negative contour count delegates to
 * the composite parser; zero contours yields null (an empty glyph such as
 * space). Otherwise it decodes the contour end points, the run-length-encoded
 * flags, and the delta-encoded x and y coordinate streams into contour points.
 * See https://learn.microsoft.com/en-us/typography/opentype/spec/glyf
 */
function parseGlyph(
  view: DataView,
  offset: number,
  glyfTableOffset: number,
  glyphOffsets: Uint32Array
): TTFGlyph | null {
  const numberOfContours = view.getInt16(offset);
  const xMin = view.getInt16(offset + 2);
  const yMin = view.getInt16(offset + 4);
  const xMax = view.getInt16(offset + 6);
  const yMax = view.getInt16(offset + 8);

  if (numberOfContours < 0) {
    return parseCompositeGlyph(view, offset + 10, glyfTableOffset, glyphOffsets, xMin, yMin, xMax, yMax);
  }

  if (numberOfContours === 0) {
    return null;
  }

  let pos = offset + 10;
  const endPtsOfContours: number[] = [];
  for (let i = 0; i < numberOfContours; i++) {
    endPtsOfContours.push(view.getUint16(pos));
    pos += 2;
  }

  const instructionLength = view.getUint16(pos);
  pos += 2 + instructionLength;

  const numPoints = endPtsOfContours[endPtsOfContours.length - 1] + 1;
  const flags: number[] = [];
  for (let i = 0; i < numPoints;) {
    const flag = view.getUint8(pos++);
    flags.push(flag);
    i++;
    // flag bit 3 (0x08): repeat this flag for the next N points
    if (flag & 0x08) {
      const repeat = view.getUint8(pos++);
      for (let r = 0; r < repeat; r++) {
        flags.push(flag);
        i++;
      }
    }
  }

  const xCoords: number[] = [];
  let x = 0;
  for (let i = 0; i < numPoints; i++) {
    const flag = flags[i];
    // bit 1 (0x02): x is a 1-byte delta; bit 4 (0x10) gives its sign, or means x unchanged when bit 1 is clear
    if (flag & 0x02) {
      const dx = view.getUint8(pos++);
      x += flag & 0x10 ? dx : -dx;
    } else if (!(flag & 0x10)) {
      x += view.getInt16(pos);
      pos += 2;
    }
    xCoords.push(x);
  }

  const yCoords: number[] = [];
  let y = 0;
  for (let i = 0; i < numPoints; i++) {
    const flag = flags[i];
    // bit 2 (0x04): y is a 1-byte delta; bit 5 (0x20) gives its sign, or means y unchanged when bit 2 is clear
    if (flag & 0x04) {
      const dy = view.getUint8(pos++);
      y += flag & 0x20 ? dy : -dy;
    } else if (!(flag & 0x20)) {
      y += view.getInt16(pos);
      pos += 2;
    }
    yCoords.push(y);
  }

  const contours: TTFContour[] = [];
  let startIdx = 0;
  for (let c = 0; c < numberOfContours; c++) {
    const endIdx = endPtsOfContours[c];
    const points: { x: number; y: number; onCurve: boolean }[] = [];
    for (let i = startIdx; i <= endIdx; i++) {
      // bit 0 (0x01): on-curve point
      points.push({ x: xCoords[i], y: yCoords[i], onCurve: (flags[i] & 0x01) !== 0 });
    }
    contours.push({ points });
    startIdx = endIdx + 1;
  }

  return { contours, xMin, yMin, xMax, yMax };
}

/**
 * Assembles a composite glyph by parsing each component reference and merging
 * the referenced glyph's contours, shifted by the component's x and y offset.
 * Component scale and matrix transforms are skipped, only translation is
 * applied. Iteration continues while the MORE_COMPONENTS flag is set.
 */
function parseCompositeGlyph(
  view: DataView,
  pos: number,
  glyfTableOffset: number,
  glyphOffsets: Uint32Array,
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number
): TTFGlyph | null {
  const allContours: TTFContour[] = [];
  let hasMore = true;

  while (hasMore) {
    const compFlags = view.getUint16(pos);
    pos += 2;
    const glyphIndex = view.getUint16(pos);
    pos += 2;

    let dx = 0;
    let dy = 0;
    // 0x0001 ARG_1_AND_2_ARE_WORDS: args are int16 else int8
    if (compFlags & 0x0001) {
      dx = view.getInt16(pos);
      pos += 2;
      dy = view.getInt16(pos);
      pos += 2;
    } else {
      dx = view.getInt8(pos);
      pos += 1;
      dy = view.getInt8(pos);
      pos += 1;
    }

    // skip transforms: 0x0008 scale, 0x0040 x/y scale, 0x0080 2x2 matrix
    if (compFlags & 0x0008) {
      pos += 2;
    } else if (compFlags & 0x0040) {
      pos += 4;
    } else if (compFlags & 0x0080) {
      pos += 8;
    }

    if (glyphIndex < glyphOffsets.length - 1) {
      const compOffset = glyphOffsets[glyphIndex];
      const compNext = glyphOffsets[glyphIndex + 1];
      if (compOffset !== compNext) {
        const component = parseGlyph(view, glyfTableOffset + compOffset, glyfTableOffset, glyphOffsets);
        if (component) {
          for (const contour of component.contours) {
            const shifted: TTFContour = {
              points: contour.points.map((p) => ({ x: p.x + dx, y: p.y + dy, onCurve: p.onCurve }))
            };
            allContours.push(shifted);
          }
        }
      }
    }

    // 0x0020 MORE_COMPONENTS
    hasMore = (compFlags & 0x0020) !== 0;
  }

  return allContours.length > 0 ? { contours: allContours, xMin, yMin, xMax, yMax } : null;
}
