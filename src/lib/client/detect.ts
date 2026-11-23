"use client";
import type { GarmentType, ShopType } from "../types";
import { imageStats } from "./image";

/**
 * A quick, offline GUESS of the garment type from the photo's shape and the
 * shop type. The user always confirms with big chips. (A vision model could
 * replace this later — keep the same signature.)
 */
export async function guessGarmentType(blob: Blob, shopType?: ShopType): Promise<GarmentType> {
  const { aspect, r, g, b } = await imageStats(blob).catch(() => ({ aspect: 1, r: 128, g: 128, b: 128 }));
  const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  if (shopType === "sarees") return aspect > 0.8 ? "saree" : "kurta";
  if (shopType === "kids") return "dress";
  if (shopType === "menswear") return aspect < 0.85 ? "kurta" : "shirt";
  if (aspect > 1.25) return saturation > 0.25 ? "saree" : "shirt"; // folded fabric lies wide
  if (aspect < 0.7) return "kurta"; // long garment on a hanger
  return saturation > 0.35 ? "dress" : "shirt";
}
