"use client";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AppHeader, RequireAuth } from "@/components/app-chrome";
import { useMarketQuery, useMarketState } from "@/components/market-state";
import { ProductCard, ProductGrid, ProductGridSkeleton } from "@/components/market/product-card";
import { useSession } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";

function WishlistInner() {
  const t = useTranslations("wishlist");
  const { market } = useSession();
  const { wishlist } = useMarketState();
  const ids = Array.from(wishlist);
  const products = useMarketQuery(() => market.getProductsByIds(ids), [market, ids.join(",")], ["products"]);
  const shops = useMarketQuery(() => market.listShops(), [market], ["products"]);
  const shopById = new Map((shops.data ?? []).map((s) => [s.id, s]));
  const list = (products.data ?? []).filter((p) => wishlist.has(p.id));
  return (
    <>
      <AppHeader title={t("title")} wide />
      <main className="mx-auto max-w-6xl px-4">
        {!products.data ? (
          <ProductGridSkeleton wide n={4} />
        ) : !list.length ? (
          <EmptyState
            title={t("empty")}
            body={t("emptyBody")}
            action={
              <Button asChild>
                <Link href="/market">
                  <Search aria-hidden />
                  {t("browse")}
                </Link>
              </Button>
            }
          />
        ) : (
          <ProductGrid wide>
            {list.map((p, i) => (
              <ProductCard key={p.id} product={p} shop={shopById.get(p.shopId)} index={i} />
            ))}
          </ProductGrid>
        )}
      </main>
    </>
  );
}

export default function WishlistPage() {
  return (
    <RequireAuth>
      <WishlistInner />
    </RequireAuth>
  );
}
