// Demo marketplace catalogue: shops + products. Import-free at runtime so
// scripts/generate-assets.mjs can render the product photos with Node.
import type { AgeGroup, BackgroundId, Fabric, Gender, GarmentKind, Pose, SkinTone } from "./scene";

export type Category = "sarees" | "kurtas" | "men" | "kids" | "lehengas" | "jewellery";
export type DeliveryOption = "delivery" | "pickup" | "both";

export interface SeedShop {
  id: string;
  slug: string;
  name: string;
  city: string;
  whatsapp: string;
  delivery: DeliveryOption;
  shopType: "sarees" | "boutique" | "menswear" | "kids" | "jewellery" | "other";
  ownerId: string;
  /** brand colour used for the generated logo */
  color: string;
}

export interface SeedProduct {
  id: string;
  shopId: string;
  title: string;
  description: string;
  category: Category;
  garment: GarmentKind;
  pricePaise: number;
  mrpPaise?: number;
  sizes: string[];
  stock: number;
  fabric: Fabric;
  look: { gender: Gender; age: AgeGroup; skin: SkinTone; pose: Pose; background: BackgroundId };
  views: number;
  waClicks: number;
  /** hours before "now" the product was listed */
  ageHours: number;
}

export const DEMO_SELLER_ID = "demo-seller";
export const DEMO_BUYER_ID = "demo-buyer";
export const MARKET_IMAGE_COUNT = 3;

export const SEED_SHOPS: SeedShop[] = [
  { id: "shop-ramesh", slug: "ramesh-sarees", name: "Ramesh Sarees", city: "Hyderabad", whatsapp: "919876543210", delivery: "both", shopType: "sarees", ownerId: DEMO_SELLER_ID, color: "#B3122E" },
  { id: "shop-lakshmi", slug: "lakshmi-boutique", name: "Lakshmi Boutique", city: "Vijayawada", whatsapp: "919812345678", delivery: "delivery", shopType: "boutique", ownerId: "seller-lakshmi", color: "#DB2777" },
  { id: "shop-bombay", slug: "bombay-menswear", name: "Bombay Menswear", city: "Hyderabad", whatsapp: "919900112233", delivery: "both", shopType: "menswear", ownerId: "seller-bombay", color: "#1E3A8A" },
  { id: "shop-chinni", slug: "chinni-kids-corner", name: "Chinni Kids Corner", city: "Warangal", whatsapp: "919845098450", delivery: "pickup", shopType: "kids", ownerId: "seller-chinni", color: "#15803D" },
];

const FREE = ["Free size"];
const WOMEN = ["S", "M", "L", "XL"];
const MEN = ["M", "L", "XL", "XXL"];
const KIDS = ["2-3Y", "4-5Y", "6-7Y", "8-9Y"];

const w = (pose: Pose, background: BackgroundId, skin: SkinTone = "wheatish", age: AgeGroup = "adult") => ({ gender: "woman" as const, age, skin, pose, background });
const m = (pose: Pose, background: BackgroundId, skin: SkinTone = "medium", age: AgeGroup = "young") => ({ gender: "man" as const, age, skin, pose, background });
const g = (pose: Pose, background: BackgroundId, skin: SkinTone = "wheatish") => ({ gender: "girl" as const, age: "young" as const, skin, pose, background });
const b = (pose: Pose, background: BackgroundId, skin: SkinTone = "medium") => ({ gender: "boy" as const, age: "young" as const, skin, pose, background });

export const SEED_PRODUCTS: SeedProduct[] = [
  // ---- Ramesh Sarees (the demo seller's shop)
  { id: "p-red-kanjivaram", shopId: "shop-ramesh", title: "Red Kanjivaram silk saree", description: "Pure silk with gold zari buttas and a rich border. Perfect for weddings. Blouse piece included.", category: "sarees", garment: "saree", pricePaise: 249900, mrpPaise: 329900, sizes: FREE, stock: 6, fabric: { base: "#B3122E", accent: "#F2C14E", pattern: "buti", trim: "#E8B33A" }, look: w("standing", "wedding"), views: 412, waClicks: 38, ageHours: 5 },
  { id: "p-teal-cotton", shopId: "shop-ramesh", title: "Teal cotton check saree", description: "Soft handloom cotton, easy to wear every day. Light and breathable.", category: "sarees", garment: "saree", pricePaise: 89900, sizes: FREE, stock: 12, fabric: { base: "#0F766E", accent: "#F5F0E1", pattern: "checks", trim: "#D9A21B" }, look: w("hip", "street", "medium", "young"), views: 230, waClicks: 17, ageHours: 30 },
  { id: "p-mustard-pochampally", shopId: "shop-ramesh", title: "Mustard Pochampally ikat saree", description: "Hand-woven ikat from Pochampally with a maroon border.", category: "sarees", garment: "saree", pricePaise: 179900, mrpPaise: 219900, sizes: FREE, stock: 2, fabric: { base: "#D9A21B", accent: "#7F1D1D", pattern: "zigzag", trim: "#7F1D1D" }, look: w("standing", "festive", "dusky"), views: 188, waClicks: 22, ageHours: 52 },
  { id: "p-blue-party", shopId: "shop-ramesh", title: "Royal blue party saree", description: "Flowing georgette with silver floral print. Light for parties.", category: "sarees", garment: "saree", pricePaise: 129900, sizes: FREE, stock: 8, fabric: { base: "#1D4ED8", accent: "#E5E7EB", pattern: "floral", trim: "#CBD5E1" }, look: w("hip", "studio", "light", "young"), views: 97, waClicks: 6, ageHours: 75 },
  { id: "p-pink-georgette", shopId: "shop-ramesh", title: "Pink polka georgette saree", description: "Everyday georgette with white polka dots.", category: "sarees", garment: "saree", pricePaise: 74900, sizes: FREE, stock: 15, fabric: { base: "#EC4899", accent: "#FFFFFF", pattern: "polka", trim: "#BE185D" }, look: w("standing", "white", "wheatish", "young"), views: 64, waClicks: 3, ageHours: 120 },
  { id: "p-maroon-bridal", shopId: "shop-ramesh", title: "Maroon bridal lehenga", description: "Heavy zari work lehenga with dupatta. Made to measure in 7 days.", category: "lehengas", garment: "lehenga", pricePaise: 499900, mrpPaise: 649900, sizes: WOMEN, stock: 3, fabric: { base: "#7F1D1D", accent: "#E9B949", pattern: "zigzag", trim: "#E9B949" }, look: w("standing", "wedding", "light", "young"), views: 301, waClicks: 41, ageHours: 9 },
  // ---- Lakshmi Boutique
  { id: "p-pink-kurti", shopId: "shop-lakshmi", title: "Pink floral cotton kurti", description: "Straight-cut cotton kurti with a yellow floral print.", category: "kurtas", garment: "kurta", pricePaise: 59900, sizes: WOMEN, stock: 20, fabric: { base: "#DB2777", accent: "#FDE68A", pattern: "floral" }, look: w("hip", "studio", "dusky"), views: 156, waClicks: 9, ageHours: 14 },
  { id: "p-yellow-anarkali", shopId: "shop-lakshmi", title: "Yellow anarkali dress", description: "Flared anarkali with orange trim. Festive and comfortable.", category: "kurtas", garment: "dress", pricePaise: 119900, mrpPaise: 149900, sizes: WOMEN, stock: 7, fabric: { base: "#FACC15", accent: "#F97316", pattern: "buti", trim: "#EA580C" }, look: w("standing", "festive", "wheatish", "young"), views: 133, waClicks: 12, ageHours: 40 },
  { id: "p-green-chikan", shopId: "shop-lakshmi", title: "Mint chikankari kurta", description: "Lucknowi chikan embroidery on soft cotton.", category: "kurtas", garment: "kurta", pricePaise: 89900, sizes: WOMEN, stock: 9, fabric: { base: "#A7F3D0", accent: "#FFFFFF", pattern: "chikan", trim: "#34D399" }, look: w("standing", "street", "medium"), views: 88, waClicks: 5, ageHours: 66 },
  { id: "p-peach-lehenga", shopId: "shop-lakshmi", title: "Peach party lehenga", description: "Light lehenga for sangeet and parties.", category: "lehengas", garment: "lehenga", pricePaise: 349900, sizes: WOMEN, stock: 4, fabric: { base: "#FDBA74", accent: "#FFF7ED", pattern: "floral", trim: "#C2410C" }, look: w("hip", "festive", "light", "young"), views: 120, waClicks: 14, ageHours: 90 },
  { id: "p-navy-kurti", shopId: "shop-lakshmi", title: "Navy striped office kurti", description: "Simple, smart kurti for daily office wear.", category: "kurtas", garment: "kurta", pricePaise: 49900, sizes: WOMEN, stock: 14, fabric: { base: "#1E3A8A", accent: "#E0E7FF", pattern: "stripes" }, look: w("standing", "white"), views: 47, waClicks: 2, ageHours: 140 },
  // ---- Bombay Menswear
  { id: "p-cream-kurta", shopId: "shop-bombay", title: "Cream chikan kurta (men)", description: "Festive cotton kurta with pyjama.", category: "men", garment: "kurta", pricePaise: 109900, sizes: MEN, stock: 10, fabric: { base: "#EFE3C8", accent: "#B08D57", pattern: "chikan", trim: "#C9A86A" }, look: m("standing", "festive", "wheatish", "adult"), views: 140, waClicks: 11, ageHours: 20 },
  { id: "p-blue-check-shirt", shopId: "shop-bombay", title: "Blue check cotton shirt", description: "Regular fit cotton shirt for daily wear.", category: "men", garment: "shirt", pricePaise: 69900, sizes: MEN, stock: 18, fabric: { base: "#2F5DA8", accent: "#F8FAFC", pattern: "checks" }, look: m("hip", "white"), views: 92, waClicks: 4, ageHours: 48 },
  { id: "p-black-kurta", shopId: "shop-bombay", title: "Black festive kurta with gold buttas", description: "Rich festive kurta for weddings and pujas.", category: "men", garment: "kurta", pricePaise: 129900, mrpPaise: 159900, sizes: MEN, stock: 5, fabric: { base: "#1F1F23", accent: "#E8B33A", pattern: "buti", trim: "#E8B33A" }, look: m("hip", "wedding", "dusky", "adult"), views: 77, waClicks: 8, ageHours: 100 },
  { id: "p-olive-shirt", shopId: "shop-bombay", title: "Olive striped casual shirt", description: "Linen-blend shirt, great for outings.", category: "men", garment: "shirt", pricePaise: 74900, sizes: MEN, stock: 11, fabric: { base: "#4D5B2A", accent: "#E7E5D8", pattern: "stripes" }, look: m("standing", "street", "medium"), views: 58, waClicks: 3, ageHours: 160 },
  { id: "p-maroon-tee", shopId: "shop-bombay", title: "Maroon cotton t-shirt", description: "Soft round-neck t-shirt.", category: "men", garment: "tshirt", pricePaise: 39900, sizes: MEN, stock: 25, fabric: { base: "#881337", accent: "#9F1239", pattern: "plain" }, look: m("hip", "studio", "light"), views: 40, waClicks: 1, ageHours: 190 },
  // ---- Chinni Kids Corner
  { id: "p-kids-yellow-frock", shopId: "shop-chinni", title: "Yellow polka frock", description: "Cotton frock with an orange border. Soft on the skin.", category: "kids", garment: "dress", pricePaise: 44900, sizes: KIDS, stock: 9, fabric: { base: "#FACC15", accent: "#FFFFFF", pattern: "polka", trim: "#F97316" }, look: g("standing", "festive"), views: 101, waClicks: 7, ageHours: 12 },
  { id: "p-kids-green-kurta", shopId: "shop-chinni", title: "Green kurta pyjama set", description: "Festive kurta set for boys.", category: "kids", garment: "kurta", pricePaise: 54900, sizes: KIDS, stock: 6, fabric: { base: "#15803D", accent: "#FDE68A", pattern: "buti", trim: "#EAB308" }, look: b("hip", "shop"), views: 76, waClicks: 6, ageHours: 36 },
  { id: "p-kids-pink-lehenga", shopId: "shop-chinni", title: "Pink pattu lehenga for girls", description: "Traditional pattu langa with gold border.", category: "kids", garment: "lehenga", pricePaise: 89900, sizes: KIDS, stock: 4, fabric: { base: "#DB2777", accent: "#FDE68A", pattern: "buti", trim: "#EAB308" }, look: g("standing", "wedding", "medium"), views: 118, waClicks: 13, ageHours: 60 },
  { id: "p-kids-blue-shirt", shopId: "shop-chinni", title: "Blue check shirt for boys", description: "Cotton half-sleeve shirt for school and outings.", category: "kids", garment: "shirt", pricePaise: 34900, sizes: KIDS, stock: 16, fabric: { base: "#0EA5E9", accent: "#F8FAFC", pattern: "checks" }, look: b("standing", "white", "wheatish"), views: 35, waClicks: 1, ageHours: 200 },
];

export const marketImageUrl = (productId: string, n: number) => `/samples/market/${productId}-${n + 1}.jpg`;
export const marketBeforeUrl = (productId: string) => `/samples/market/${productId}-before.jpg`;
export const shopLogoUrl = (shopId: string) => `/samples/shops/${shopId}.png`;
