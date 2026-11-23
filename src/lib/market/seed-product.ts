import { MARKET_IMAGE_COUNT, marketBeforeUrl, marketImageUrl, type SeedProduct } from "../art/market-seed";
import type { Product } from "./types";

/** Catalogue item → Product (used to seed the device store and to server-render product pages). */
export function seedToProduct(p: SeedProduct, createdAt: string): Product {
  return {
    id: p.id,
    shopId: p.shopId,
    title: p.title,
    description: p.description,
    category: p.category,
    pricePaise: p.pricePaise,
    mrpPaise: p.mrpPaise ?? null,
    sizes: p.sizes,
    stock: p.stock,
    status: "active",
    images: Array.from({ length: MARKET_IMAGE_COUNT }, (_, n) => marketImageUrl(p.id, n)),
    beforeImage: marketBeforeUrl(p.id),
    views: p.views,
    waClicks: p.waClicks,
    createdAt,
  };
}
