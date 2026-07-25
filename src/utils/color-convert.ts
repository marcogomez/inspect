// reused output buffers so the conversion helpers avoid per-call allocation
const _hsv: [number, number, number] = [0, 0, 0];
const _rgb: [number, number, number] = [0, 0, 0];
const _rgba: [number, number, number, number] = [0, 0, 0, 0];

/** Precomputed lookup table mapping byte values 0-255 to two-char hex strings. */
export const HEX_LUT: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

/**
 * Convert RGB [0,1] to HSV. Returns a reused tuple (not allocation-safe).
 * RGB to HSV per A.R. Smith, "Color Gamut Transform Pairs" (1978)
 */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta > 0) {
    // hue from the max channel: each maps to a 60-degree sextant, offset by 0/2/4, scaled to degrees
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  _hsv[0] = h;
  _hsv[1] = max === 0 ? 0 : delta / max;
  _hsv[2] = max;
  return _hsv;
}

/**
 * Convert HSV (h in [0,360], s and v in [0,1]) to RGB [0,1].
 * Returns a reused tuple (not allocation-safe).
 * HSV to RGB per A.R. Smith, "Color Gamut Transform Pairs" (1978)
 */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  // chroma c, second component x via the hue-sextant triangle wave, m lifts to the target value;
  // 60 splits the 360-degree wheel into six sectors
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  _rgb[0] = r + m;
  _rgb[1] = g + m;
  _rgb[2] = b + m;
  return _rgb;
}

/** Pack float RGBA [0,1] into a single uint32 (RGBA byte order). */
export function packRGBA(r: number, g: number, b: number, a = 1): number {
  // 0.5 bias before bitwise-OR truncation gives correct rounding to nearest int
  const ri = (r * 255 + 0.5) | 0;
  const gi = (g * 255 + 0.5) | 0;
  const bi = (b * 255 + 0.5) | 0;
  const ai = (a * 255 + 0.5) | 0;
  return ((ri << 24) | (gi << 16) | (bi << 8) | ai) >>> 0;
}

/** Pack 8-bit integer RGBA [0,255] into a single uint32 (RGBA byte order). */
export function packRGBA8(r: number, g: number, b: number, a = 255): number {
  return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

/** Unpack a uint32 into float RGBA [0,1]. Returns a reused tuple. */
export function unpackRGBA(color: number): [number, number, number, number] {
  _rgba[0] = ((color >>> 24) & 0xff) / 255;
  _rgba[1] = ((color >>> 16) & 0xff) / 255;
  _rgba[2] = ((color >>> 8) & 0xff) / 255;
  _rgba[3] = (color & 0xff) / 255;
  return _rgba;
}

/** Convert a float {r, g, b} object to a packed uint32 with alpha=1. */
export function rgbObjToPacked(obj: { r: number; g: number; b: number }): number {
  const r = Math.max(0, Math.min(1, obj.r));
  const g = Math.max(0, Math.min(1, obj.g));
  const b = Math.max(0, Math.min(1, obj.b));
  return packRGBA(r, g, b, 1);
}

const _rgbObj = { r: 0, g: 0, b: 0 };

/** Unpack a uint32 color to a float {r, g, b} object. Returns a reused object. */
export function packedToRgbObj(color: number): { r: number; g: number; b: number } {
  const c = unpackRGBA(color);
  _rgbObj.r = c[0];
  _rgbObj.g = c[1];
  _rgbObj.b = c[2];
  return _rgbObj;
}
