"use client";
import type { MarketStore } from "../market/types";
import type { Profile } from "../types";

/** A seller always has a shop: create it from the profile the first time it's needed. */
export async function ensureShop(market: MarketStore, profile: Profile) {
  const existing = await market.getMyShop(profile.id);
  if (existing) return existing;
  return market.saveShop(profile.id, {
    name: profile.shopName || "My Shop",
    slug: profile.shopName || "my-shop",
    city: profile.city || "Hyderabad",
    whatsapp: (profile.phone ?? "").replace(/\D/g, "").replace(/^(?!91)(\d{10})$/, "91$1"),
    shopType: profile.shopType,
    delivery: "both",
  });
}
