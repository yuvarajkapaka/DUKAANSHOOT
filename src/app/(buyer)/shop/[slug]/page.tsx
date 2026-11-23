"use client";
import { MapPin, Share2, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-chrome";
import { useMarketQuery } from "@/components/market-state";
import { ProductCard, ProductGrid, ProductGridSkeleton } from "@/components/market/product-card";
import { ShopLogo } from "@/components/market/shop-logo";
import { useSession } from "@/components/providers";
import { WhatsAppIcon } from "@/components/results/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useTranslations("shop");
  const tp = useTranslations("product");
  const tm = useTranslations("market");
  const ts = useTranslations("shopSettings");
  const { market } = useSession();
  const shop = useMarketQuery(() => market.getShopBySlug(slug), [market, slug], ["products"]);
  const s = shop.data;
  const products = useMarketQuery(() => (s ? market.listProducts({ shopId: s.id }) : Promise.resolve([])), [market, s?.id], ["products"]);

  if (shop.data === null) {
    return (
      <>
        <AppHeader back="/market" />
        <EmptyState title={t("notFound")} action={<Button asChild><Link href="/market">{tm("seeAll")}</Link></Button>} />
      </>
    );
  }

  const share = async () => {
    if (!s) return;
    const url = `${location.origin}/shop/${s.slug}`;
    const text = ts("shareText", { shop: s.name, url });
    if (navigator.share) await navigator.share({ title: s.name, text, url }).catch(() => {});
    else {
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success(ts("copied"));
    }
  };

  return (
    <>
      <AppHeader back={true} wide />
      <main className="mx-auto max-w-6xl px-4">
        {!s ? (
          <div className="skeleton h-44 rounded-[var(--radius-card)]" />
        ) : (
          <section className="anim-rise relative overflow-hidden rounded-[var(--radius-card)] bg-paper p-5 shadow-soft">
            <div className="absolute -top-16 -right-16 size-48 rounded-full bg-accent-soft" aria-hidden />
            <div className="relative flex items-center gap-4">
              <ShopLogo shop={s} size={72} className="rounded-3xl shadow-soft" />
              <div className="min-w-0">
                <h1 className="font-display text-2xl leading-tight">{s.name}</h1>
                <p className="mt-1 flex items-center gap-1 text-ink-soft">
                  <MapPin className="size-4" aria-hidden />
                  {s.city}
                </p>
                <p className="flex items-center gap-1 text-sm text-ink-soft">
                  <Truck className="size-4" aria-hidden />
                  {s.delivery === "both" ? tp("both") : s.delivery === "pickup" ? tp("pickup") : tp("delivery")}
                </p>
              </div>
            </div>
            <div className="relative mt-4 grid grid-cols-2 gap-2">
              <Button variant="whatsapp" size="sm" onClick={() => window.open(`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`, "_blank", "noopener")}>
                <WhatsAppIcon className="size-5" />
                {t("chat")}
              </Button>
              <Button variant="outline" size="sm" onClick={share}>
                <Share2 aria-hidden />
                {t("share")}
              </Button>
            </div>
          </section>
        )}

        <h2 className="mt-6 mb-3 font-display text-xl">
          {t("products")} {products.data ? <span className="text-base font-normal text-ink-soft">· {tm("products", { count: products.data.length })}</span> : null}
        </h2>
        {!products.data ? (
          <ProductGridSkeleton wide />
        ) : !products.data.length ? (
          <EmptyState title={t("empty")} />
        ) : (
          <ProductGrid wide>
            {products.data.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} priority={i < 2} />
            ))}
          </ProductGrid>
        )}
      </main>
    </>
  );
}
