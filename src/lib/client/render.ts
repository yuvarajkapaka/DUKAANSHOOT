"use client";
import { buildScene, poseForVariant } from "../art/scene";
import type { RenderSpec } from "../render-url";
import { canvasToBlob, loadImage } from "./image";

async function svgImage(svg: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * MockProvider renderer for uploaded garments: draws the background and an
 * illustrated model, then fills the garment shape with the shopkeeper's OWN
 * photo (so colours and prints match their item). Pure canvas, no network.
 */
export async function renderMockPhoto(spec: RenderSpec, garment: Blob): Promise<Blob> {
  const s = buildScene({ ...spec, pose: poseForVariant(spec.pose, spec.variant), variant: spec.variant });

  const [bg, under, over] = await Promise.all([svgImage(s.backgroundDoc), svgImage(s.underDoc), svgImage(s.overDoc)]);
  const gUrl = URL.createObjectURL(garment);
  let photo: HTMLImageElement;
  try {
    photo = await loadImage(gUrl);
  } finally {
    URL.revokeObjectURL(gUrl);
  }

  const c = document.createElement("canvas");
  c.width = s.width;
  c.height = s.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bg, 0, 0);
  ctx.drawImage(under, 0, 0);

  ctx.save();
  const [a, b, cc, d, e, f] = s.matrix;
  ctx.setTransform(a, b, cc, d, e, f);
  ctx.clip(new Path2D(s.garmentPath));
  // use the centre of the photo (where the item usually is) and cover the garment area
  const crop = 0.72;
  const sw = photo.width * crop;
  const sh = photo.height * crop;
  const sx = (photo.width - sw) / 2;
  const sy = (photo.height - sh) / 2;
  const box = s.garmentBox;
  const scale = Math.max(box.w / sw, box.h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(photo, sx, sy, sw, sh, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
  ctx.restore();

  ctx.drawImage(over, 0, 0);
  return canvasToBlob(c, "image/jpeg", 0.86);
}
