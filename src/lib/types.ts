import type { AgeGroup, BackgroundId, Gender, GarmentKind, Pose, SkinTone } from "./art/scene";

export type { AgeGroup, BackgroundId, Gender, Pose, SkinTone };
export type GarmentType = GarmentKind;

export const GARMENT_TYPES: GarmentType[] = ["saree", "kurta", "shirt", "tshirt", "dress", "lehenga", "pants", "other"];
export const GENDERS: Gender[] = ["woman", "man", "girl", "boy"];
export const AGE_GROUPS: AgeGroup[] = ["young", "adult", "senior"];
export const SKIN_TONES: SkinTone[] = ["light", "wheatish", "medium", "dusky"];
export const POSES: Pose[] = ["standing", "side", "hip", "closeup"];
export const BACKGROUNDS: BackgroundId[] = ["white", "studio", "wedding", "street", "festive", "shop"];
export const SHOP_TYPES = ["sarees", "boutique", "menswear", "kids", "jewellery", "other"] as const;
export type ShopType = (typeof SHOP_TYPES)[number];

export interface LookOptions {
  gender: Gender;
  age: AgeGroup;
  skin: SkinTone;
  pose: Pose;
  background: BackgroundId;
}

export interface Profile {
  id: string;
  /** null until the user picks "I want to SELL / BUY" */
  role: "seller" | "buyer" | null;
  /** buyer's name (sellers use shopName) */
  name?: string | null;
  city?: string | null;
  email?: string | null;
  shopName: string;
  shopType: ShopType;
  phone?: string | null;
  language: string;
  credits: number;
  defaults?: Partial<LookOptions>;
  isDemo: boolean;
  createdAt: string;
}

export type GenerationSource = { kind: "sample"; sampleId: string } | { kind: "upload"; uploadId: string };

export interface GeneratedImage {
  id: string;
  /** something an <img> can show right now (object URL, signed URL or /public path) */
  url: string;
  /** 400px version for grids (falls back to url) */
  thumb?: string;
  createdAt: string;
}

export interface Generation {
  id: string;
  createdAt: string;
  garmentType: GarmentType;
  look: LookOptions;
  source: GenerationSource;
  status: "running" | "done" | "failed";
  jobId?: string;
  error?: string | null;
  creditsUsed: number;
  note?: "sample" | "fallback" | null;
  images: GeneratedImage[];
  /** small thumbnail of the input garment */
  garmentThumb?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  paymentId?: string | null;
  amountPaise: number;
  credits: number;
  status: "created" | "paid" | "failed";
  createdAt: string;
}

export interface CreditPack {
  id: string;
  credits: number;
  pricePaise: number;
  tag?: "popular" | "best";
}

/** What the server tells the browser about how this deployment is configured. */
export interface PublicAppConfig {
  provider: "mock" | "real";
  supabase: boolean;
  payments: "razorpay-test" | "simulated";
  razorpayKeyId: string | null;
  packs: CreditPack[];
  demoMode: boolean;
}

export const DEFAULT_LOOK: LookOptions = {
  gender: "woman",
  age: "adult",
  skin: "wheatish",
  pose: "standing",
  background: "white",
};

/** "Quick Pick": sensible defaults for each garment type */
export function quickPick(type: GarmentType, shopType?: ShopType): LookOptions {
  const kids = shopType === "kids";
  switch (type) {
    case "saree":
      return { gender: "woman", age: "adult", skin: "wheatish", pose: "standing", background: "wedding" };
    case "lehenga":
      return { gender: kids ? "girl" : "woman", age: "young", skin: "wheatish", pose: "standing", background: "festive" };
    case "kurta":
      return { gender: kids ? "boy" : shopType === "menswear" ? "man" : "woman", age: "adult", skin: "wheatish", pose: "hip", background: "festive" };
    case "shirt":
    case "tshirt":
    case "pants":
      return { gender: kids ? "boy" : "man", age: "young", skin: "medium", pose: "hip", background: "white" };
    case "dress":
      return { gender: kids ? "girl" : "woman", age: "young", skin: "wheatish", pose: "standing", background: "studio" };
    default:
      return { ...DEFAULT_LOOK, background: "studio" };
  }
}
