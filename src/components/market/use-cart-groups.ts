"use client";
import type { CartItem, Product, Shop } from "@/lib/market/types";
import { useMarketQuery, useMarketState } from "../market-state";
import { useSession } from "../providers";

export interface CartGroup {
  shop: Shop;
  lines: { item: CartItem; product: Product }[];
  totalPaise: number;
}

/** Cart lines grouped by shop — each shop becomes its own order. */
export function useCartGroups() {
  const { market } = useSession();
  const { cart, cartReady } = useMarketState();
  const ids = Array.from(new Set(cart.map((i) => i.productId)));
  const key = ids.join(",");
  // tag the lookup with the cart it was made for, so a stale result (e.g. for the empty cart
  // before it loaded) is never mistaken for "these items no longer exist"
  const products = useMarketQuery(() => market.getProductsByIds(ids).then((list) => ({ key, list })), [market, key], ["products"]);
  const shops = useMarketQuery(() => market.listShops(), [market], ["products"]);
  if (!cartReady || !products.data || products.data.key !== key || !shops.data) return { groups: null as CartGroup[] | null, unavailable: [] as CartItem[] };
  const byId = new Map(products.data.list.map((p) => [p.id, p]));
  const groups = new Map<string, CartGroup>();
  const unavailable: CartItem[] = [];
  for (const item of cart) {
    const product = byId.get(item.productId);
    const shop = product && shops.data.find((s) => s.id === product.shopId);
    if (!product || !shop || product.status !== "active" || product.stock <= 0) {
      unavailable.push(item);
      continue;
    }
    const g = groups.get(shop.id) ?? { shop, lines: [], totalPaise: 0 };
    g.lines.push({ item, product });
    g.totalPaise += product.pricePaise * item.qty;
    groups.set(shop.id, g);
  }
  return { groups: Array.from(groups.values()), unavailable };
}

