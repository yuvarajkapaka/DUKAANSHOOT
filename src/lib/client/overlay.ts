"use client";
import { canvasToBlob, loadImage } from "./image";

export interface OverlayText {
  shopName?: string;
  price?: string;
  phone?: string;
}

export const hasOverlay = (o: OverlayText) => !!(o.shopName?.trim() || o.price?.trim() || o.phone?.trim());

function formatPrice(p: string) {
  const n = Number(p.replace(/[^\d.]/g, ""));
  return n > 0 ? "₹" + n.toLocaleString("en-IN") : "";
}

/** Adds a clean band with shop name / price / phone — ready for WhatsApp Status. */
export async function addTextOverlay(image: Blob, text: OverlayText): Promise<Blob> {
  const url = URL.createObjectURL(image);
  try {
    const img = await loadImage(url);
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const W = c.width;
    const H = c.height;
    const font = getComputedStyle(document.body).fontFamily || "sans-serif";
    const band = Math.round(H * 0.17);
    const grad = ctx.createLinearGradient(0, H - band * 1.6, 0, H);
    grad.addColorStop(0, "rgba(30,27,75,0)");
    grad.addColorStop(0.45, "rgba(30,27,75,0.82)");
    grad.addColorStop(1, "rgba(30,27,75,0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - band * 1.6, W, band * 1.6);

    const pad = Math.round(W * 0.05);
    const price = text.price ? formatPrice(text.price) : "";
    ctx.textBaseline = "alphabetic";
    if (price) {
      const ps = Math.round(W * 0.075);
      ctx.font = `800 ${ps}px ${font}`;
      const tw = ctx.measureText(price).width;
      const bx = W - pad - tw - ps * 0.6;
      const by = H - band - ps * 0.3;
      ctx.fillStyle = "#E8871E";
      ctx.beginPath();
      ctx.roundRect(bx, by - ps * 1.05, tw + ps * 0.6, ps * 1.4, ps * 0.3);
      ctx.fill();
      ctx.fillStyle = "#1E1B4B";
      ctx.fillText(price, bx + ps * 0.3, by + ps * 0.05);
    }
    const ns = Math.round(W * 0.06);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 ${ns}px ${font}`;
    if (text.shopName) ctx.fillText(text.shopName.slice(0, 40), pad, H - pad - (text.phone ? ns * 1.1 : 0));
    if (text.phone) {
      ctx.font = `500 ${Math.round(ns * 0.72)}px ${font}`;
      ctx.fillStyle = "#FDE7C8";
      ctx.fillText("📞 " + text.phone.slice(0, 20), pad, H - pad);
    }
    return canvasToBlob(c, "image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}
