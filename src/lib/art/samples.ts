// Sample garments for the demo. Import-free at runtime (type imports are erased)
// so scripts/generate-assets.mjs can load this file directly with Node.
import type { AgeGroup, BackgroundId, Fabric, Gender, GarmentKind, Pose, SkinTone } from "./scene";

export interface SampleGarment {
  id: string;
  /** i18n key under "samples.*" */
  nameKey: string;
  garment: GarmentKind;
  fabric: Fabric;
  look: { gender: Gender; age: AgeGroup; skin: SkinTone; pose: Pose; background: BackgroundId };
}

export const SAMPLE_GARMENTS: SampleGarment[] = [
  {
    id: "saree-red-silk",
    nameKey: "redSilkSaree",
    garment: "saree",
    fabric: { base: "#B3122E", accent: "#F2C14E", pattern: "buti", trim: "#E8B33A" },
    look: { gender: "woman", age: "adult", skin: "wheatish", pose: "standing", background: "wedding" },
  },
  {
    id: "saree-teal-cotton",
    nameKey: "tealCottonSaree",
    garment: "saree",
    fabric: { base: "#0F766E", accent: "#F5F0E1", pattern: "checks", trim: "#D9A21B" },
    look: { gender: "woman", age: "young", skin: "medium", pose: "hip", background: "street" },
  },
  {
    id: "lehenga-maroon",
    nameKey: "maroonLehenga",
    garment: "lehenga",
    fabric: { base: "#7F1D1D", accent: "#E9B949", pattern: "zigzag", trim: "#E9B949" },
    look: { gender: "woman", age: "young", skin: "light", pose: "standing", background: "festive" },
  },
  {
    id: "kurta-women-pink",
    nameKey: "pinkKurti",
    garment: "kurta",
    fabric: { base: "#DB2777", accent: "#FDE68A", pattern: "floral" },
    look: { gender: "woman", age: "adult", skin: "dusky", pose: "hip", background: "studio" },
  },
  {
    id: "kurta-men-cream",
    nameKey: "creamKurta",
    garment: "kurta",
    fabric: { base: "#EFE3C8", accent: "#B08D57", pattern: "chikan", trim: "#C9A86A" },
    look: { gender: "man", age: "adult", skin: "wheatish", pose: "standing", background: "festive" },
  },
  {
    id: "shirt-blue-check",
    nameKey: "blueCheckShirt",
    garment: "shirt",
    fabric: { base: "#2F5DA8", accent: "#F8FAFC", pattern: "checks" },
    look: { gender: "man", age: "young", skin: "medium", pose: "hip", background: "white" },
  },
  {
    id: "kids-dress-yellow",
    nameKey: "yellowKidsDress",
    garment: "dress",
    fabric: { base: "#FACC15", accent: "#FFFFFF", pattern: "polka", trim: "#F97316" },
    look: { gender: "girl", age: "young", skin: "wheatish", pose: "standing", background: "festive" },
  },
  {
    id: "kids-kurta-green",
    nameKey: "greenKidsKurta",
    garment: "kurta",
    fabric: { base: "#15803D", accent: "#FDE68A", pattern: "buti", trim: "#EAB308" },
    look: { gender: "boy", age: "young", skin: "medium", pose: "hip", background: "shop" },
  },
];

export const SAMPLE_RESULT_COUNT = 4;

export function sampleInputUrl(id: string) {
  return `/samples/garments/${id}.jpg`;
}
export function sampleResultUrl(id: string, n: number) {
  return `/samples/results/${id}-${n + 1}.jpg`;
}
