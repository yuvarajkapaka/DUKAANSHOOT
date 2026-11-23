"use client";

export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_EDGE = 1600;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("IMAGE_LOAD"));
    img.src = src;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("ENCODE"))), type, quality));
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Crop + rotate (from react-easy-crop) and shrink to max 1600px JPEG — keeps uploads small on 3G. */
export async function cropAndCompress(
  src: string,
  crop: { x: number; y: number; width: number; height: number },
  rotation: number,
  maxEdge = MAX_EDGE,
): Promise<Blob> {
  const img = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bw = img.width * cos + img.height * sin;
  const bh = img.width * sin + img.height * cos;

  // draw the rotated full image, then cut out the crop rectangle
  const rotated = document.createElement("canvas");
  rotated.width = Math.round(bw);
  rotated.height = Math.round(bh);
  const rctx = rotated.getContext("2d")!;
  rctx.translate(bw / 2, bh / 2);
  rctx.rotate(rad);
  rctx.drawImage(img, -img.width / 2, -img.height / 2);

  const scale = Math.min(1, maxEdge / Math.max(crop.width, crop.height));
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(crop.width * scale));
  out.height = Math.max(1, Math.round(crop.height * scale));
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(rotated, crop.x, crop.y, crop.width, crop.height, 0, 0, out.width, out.height);
  return canvasToBlob(out, "image/jpeg", 0.85);
}

/** Shrinks a photo so its longest edge is at most `maxEdge` (returns the original if already small). */
export async function resizeBlob(blob: Blob, maxEdge: number, quality = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const s = maxEdge / Math.max(img.width, img.height);
    if (s >= 1) return blob;
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return canvasToBlob(c, "image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Generated photos are kept as original + medium (1000px) + thumbnail (400px). */
export async function makeVariants(blob: Blob) {
  const [medium, thumb] = await Promise.all([resizeBlob(blob, 1000, 0.85), resizeBlob(blob, 400, 0.78)]);
  return { original: blob, medium: medium === blob ? null : medium, thumb };
}

export async function makeThumb(blob: Blob, edge = 320): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const s = Math.min(1, edge / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.7);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Average colour + aspect ratio, used by the garment-type guess. */
export async function imageStats(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const c = document.createElement("canvas");
    c.width = 24;
    c.height = 24;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, 24, 24);
    const d = ctx.getImageData(0, 0, 24, 24).data;
    let r = 0,
      g = 0,
      b = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
    }
    const n = d.length / 4;
    return { aspect: img.width / img.height, r: r / n, g: g / n, b: b / n };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
