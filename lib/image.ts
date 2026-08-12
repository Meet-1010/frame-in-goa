export const MAX_UPLOAD = 25 * 1024 * 1024;
const MAX_EDGE = 2048; // anything bigger just costs us memory, the output is 1600px wide

export class ImageError extends Error {}

export async function decode(file: File): Promise<ImageBitmap> {
  if (file.size > MAX_UPLOAD) {
    throw new ImageError("That photo is over 25MB. Try a smaller one.");
  }

  let source: Blob = file;
  if (await looksHeic(file)) {
    source = await heicToPng(file);
  }

  const bitmap = await toBitmap(source);
  return shrink(bitmap);
}

async function toBitmap(blob: Blob): Promise<ImageBitmap> {
  try {
    // from-image keeps iPhone photos the right way up
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(blob);
    } catch {
      return await viaImgTag(blob);
    }
  }
}

function viaImgTag(blob: Blob): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = async () => {
      try {
        resolve(await createImageBitmap(img));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageError("Could not read that image."));
    };
    img.src = url;
  });
}

/** iOS hands us HEIC files with all sorts of mime types, so sniff the ftyp box too. */
async function looksHeic(file: File) {
  const type = file.type.toLowerCase();
  if (type.includes("heic") || type.includes("heif")) return true;
  if (/\.(heic|heif)$/i.test(file.name)) return true;
  if (type) return false;

  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const brand = new TextDecoder().decode(head.slice(8, 12)).trim();
    return ["mif1", "msf1", "heic", "heix", "hevc", "hevx"].includes(brand);
  } catch {
    return false;
  }
}

async function heicToPng(file: File): Promise<Blob> {
  // ~1MB of wasm, only pulled in when someone actually drops a HEIC
  const { heicTo } = await import("heic-to/next");
  try {
    return await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
  } catch {
    throw new ImageError("That HEIC could not be converted. Screenshot it or save it as JPG first.");
  }
}

function shrink(bitmap: ImageBitmap): ImageBitmap | Promise<ImageBitmap> {
  const edge = Math.max(bitmap.width, bitmap.height);
  if (edge <= MAX_EDGE) return bitmap;

  const scale = MAX_EDGE / edge;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return createImageBitmap(c);
}

export type Focus = { fx: number; fy: number };

const CENTRE: Focus = { fx: 0.5, fy: 0.42 };

/**
 * Rough "where is the person" guess so an off centre photo does not come back
 * with half a face. Downscales hard, scores pixels for skin tone in YCbCr, and
 * takes the centroid. Falls back to slightly above centre, which is where heads
 * usually are anyway.
 */
export function focalPoint(bitmap: ImageBitmap): Focus {
  const w = 72;
  const h = Math.max(1, Math.round((bitmap.height / bitmap.width) * w));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return CENTRE;

  ctx.drawImage(bitmap, 0, 0, w, h);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return CENTRE;
  }

  let sx = 0;
  let sy = 0;
  let hits = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 60 || g < 30 || b < 15 || r <= g || r <= b) continue;
    if (Math.max(r, g, b) - Math.min(r, g, b) < 12) continue;

    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    if (cb < 77 || cb > 133 || cr < 133 || cr > 178) continue;

    const p = i / 4;
    sx += p % w;
    sy += Math.floor(p / w);
    hits++;
  }

  if (hits < w * h * 0.012) return CENTRE;

  // nudge upward: the centroid of a face plus neck sits below the eyes
  const fx = clamp01(sx / hits / w);
  const fy = clamp01(sy / hits / h - 0.04);
  return { fx, fy };
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png", quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new ImageError("Could not export the image."))),
      type,
      quality,
    );
  });
}
