import { SEED_PRODUCTS } from "@/lib/art/market-seed";
import { seedToProduct } from "@/lib/market/seed-product";
import { ProductClient } from "./product-client";

/**
 * Product data lives on the device (demo) or in Supabase and loads in the browser.
 * Catalogue items are rendered on the server straight away (their hero photo is a
 * priority next/image, so it's preloaded at the right size and format); live
 * stock/views replace the seed values after load.
 */
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seed = SEED_PRODUCTS.find((p) => p.id === id);
  return <ProductClient initial={seed ? seedToProduct(seed, new Date(0).toISOString()) : undefined} />;
}
