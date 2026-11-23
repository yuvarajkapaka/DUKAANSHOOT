import type { CreditPack } from "./types";

export const DEFAULT_PACKS: CreditPack[] = [
  { id: "p10", credits: 10, pricePaise: 4900 },
  { id: "p50", credits: 50, pricePaise: 19900, tag: "popular" },
  { id: "p150", credits: 150, pricePaise: 49900, tag: "best" },
];

/** Packs are configurable with CREDIT_PACKS='[{"id":"p10","credits":10,"pricePaise":4900}, ...]' */
export function loadPacks(): CreditPack[] {
  const raw = process.env.CREDIT_PACKS;
  if (!raw) return DEFAULT_PACKS;
  try {
    const parsed = JSON.parse(raw) as CreditPack[];
    const ok = Array.isArray(parsed) && parsed.every((p) => p.id && p.credits > 0 && p.pricePaise >= 100);
    return ok ? parsed : DEFAULT_PACKS;
  } catch {
    return DEFAULT_PACKS;
  }
}
