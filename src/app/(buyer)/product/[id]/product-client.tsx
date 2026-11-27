"use client";
import { Eye, MapPin, ShoppingBag, Store, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-chrome";
import { useMarketQuery, useMarketState } from "@/components/market-state";
import { HeartButton } from "@/components/market/heart-button";
import { PhotoCarousel } from "@/components/market/photo-carousel";
import { ProductCard, ProductGrid } from "@/components/market/product-card";
import { ShopLogo } from "@/components/market/shop-logo";
import { useSession } from "@/components/providers";
import { WhatsAppIcon } from "@/components/results/whatsapp-icon";
import { BeforeAfter } from "@/components/ui/before-after";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/feedback";
import type { Product } from "@/lib/market/types";
import { cn, rupees } from "@/lib/utils";

export function ProductClient({ initial }: { initial?: Product }) {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("product");
  const tm = useTranslations("market");
  const tp = useTranslations("products");
  const tcat = useTranslations("categories");
  const { market } = useSession();
  const { addToCart } = useMarketState();
  const heroRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<string | null>(null);
  const [tab, setTab] = useState<"photos" | "compare">("photos");

  const product = useMarketQuery(() => market.getProduct(id), [market, id], ["products"]);
  const p = product.data === undefined ? initial : product.data;
  const shop = useMarketQuery(() => (p ? market.getShop(p.shopId) : Promise.resolve(null)), [market, p?.shopId], ["products"]);
  const more = useMarketQuery(() => (p ? market.listProducts({ shopId: p.shopId, limit: 7 }) : Promise.resolve([])), [market, p?.shopId], ["products"]);

  useEffect(() => {
    if (p && p.sizes.length === 1) setSize(p.sizes[0]);
  }, [p]);
  // count one view per product per browser session
  useEffect(() => {
    const k = `ds_viewed_${id}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
    void market.trackView(id).catch(() => {});
  }, [id, market]);

  if (product.data === null) {
    return (
      <>
        <AppHeader back="/market" />
        <EmptyState title={t("notFound")} action={<Button asChild><Link href="/market">{tm("seeAll")}</Link></Button>} />
      </>
    );
  }

  const s = shop.data;
  const sold = !!p && (p.status === "soldout" || p.stock <= 0);
  const off = p?.mrpPaise && p.mrpPaise > p.pricePaise ? Math.round((1 - p.pricePaise / p.mrpPaise) * 100) : 0;

  const add = async () => {
    if (!p) return;
    if (!size) {
      toast(t("pickSize"));
      document.getElementById("sizes")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    await addToCart(p.id, size, 1, heroRef.current);
    toast.success(t("added"));
  };

  const whatsapp = () => {
    if (!p || !s) return;
    void market.trackWhatsApp(p.id).catch(() => {});
    const text = t("waText", { shop: s.name, title: p.title, size: size ?? p.sizes[0], price: (p.pricePaise / 100).toLocaleString("en-IN") }) + `\n${location.origin}/product/${p.id}`;
    window.open(`https://wa.me/${s.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  return (
    <>
      <AppHeader back={true} />
      <main className="mx-auto max-w-6xl px-4 pb-24 md:pb-10 lg:px-6">
        {!p ? (
          <div className="space-y-3">
            <div className="skeleton aspect-[4/5] rounded-[var(--radius-lux)]" />
            <div className="skeleton h-6 w-3/4 rounded" />
            <div className="skeleton h-8 w-1/3 rounded" />
          </div>
        ) : (
          <>
            <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
            <div>
            {p.beforeImage ? (
              <div className="edge mb-3 grid grid-cols-2 gap-1 rounded-full bg-paper p-1 shadow-soft lg:ml-[88px]" role="tablist">
                {(["photos", "compare"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={tab === k}
                    onClick={() => setTab(k)}
                    className={cn("min-h-11 rounded-full text-[15px] font-semibold transition-all duration-300", tab === k ? "panel-night text-ivory shadow-[0_4px_12px_-6px_rgb(21_18_46/0.6)]" : "text-ink-soft hover:text-ink")}
                  >
                    {k === "photos" ? tp("photos") : t("beforeAfter")}
                  </button>
                ))}
              </div>
            ) : null}

            {tab === "compare" && p.beforeImage ? (
              <BeforeAfter before={p.beforeImage} after={p.images[0]} />
            ) : (
              <PhotoCarousel ref={heroRef} images={p.images} alt={p.title} overlay={<HeartButton productId={p.id} size="lg" className="absolute top-3 right-3" />} />
            )}

            </div>
            <div className="md:sticky md:top-24">
            <span className={cn(`tile tile-${p.category}`, "edge-gold mt-5 inline-block rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.14em] uppercase shadow-soft md:mt-0")}>
              <span className="relative">{tcat(p.category)}</span>
            </span>
            <h1 className="anim-rise mt-2 font-display text-[1.75rem] leading-[1.02] md:text-4xl">{p.title}</h1>
            <div className="anim-rise mt-3 flex flex-wrap items-center gap-2.5" style={{ animationDelay: "80ms" }}>
              <span className="font-display text-[2rem] leading-none font-semibold tracking-[-0.02em] md:text-[2.5rem]">{rupees(p.pricePaise)}</span>
              {off ? (
                <>
                  <span className="text-lg text-ink-soft line-through">{rupees(p.mrpPaise!)}</span>
                  <span className="rounded-full bg-[linear-gradient(135deg,#1f9d57,#0f6b3a)] px-2.5 py-1 text-[12px] font-bold tracking-[0.06em] text-white shadow-[0_0_0_1px_rgb(255_255_255/0.3),0_6px_14px_-6px_rgb(0_0_0/0.5)]">{tm("off", { n: off })}</span>
                </>
              ) : null}
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
              {sold ? <span className="font-bold text-danger">{tm("soldOut")}</span> : p.stock <= 3 ? <span className="font-bold text-danger">{tm("onlyLeft", { n: p.stock })}</span> : null}
              <span className="inline-flex items-center gap-1">
                <Eye className="size-4" aria-hidden />
                {t("views", { n: p.views })}
              </span>
            </p>

            <section id="sizes" className="mt-5">
              <h2 className="mb-2 font-display text-lg font-semibold tracking-[0.01em]">{t("sizes")}</h2>
              <span aria-hidden className="rule-gold mb-3 block max-w-[120px]" />
              <ChipGroup label={t("sizes")}>
                {p.sizes.map((sz) => (
                  <Chip key={sz} selected={size === sz} onClick={() => setSize(sz)}>
                    {sz}
                  </Chip>
                ))}
              </ChipGroup>
            </section>

            {/* desktop: buttons live in the sticky details column */}
            <div className="mt-6 hidden grid-cols-2 gap-3 md:grid">
              <Button size="lg" onClick={add} disabled={sold}>
                <ShoppingBag aria-hidden />
                {t("addToCart")}
              </Button>
              <Button variant="whatsapp" size="lg" onClick={whatsapp}>
                <WhatsAppIcon className="size-5" />
                {t("orderWhatsApp")}
              </Button>
            </div>

            {p.description ? (
              <section className="mt-5">
                <h2 className="mb-1 font-display text-lg font-semibold">{t("description")}</h2>
                <p className="leading-relaxed text-ink-soft">{p.description}</p>
              </section>
            ) : null}

            {/* seller shop card */}
            {s ? (
              <section className="card-lux mt-6 p-5" aria-label={t("soldBy")}>
                <p className="eyebrow">{t("soldBy")}</p>
                <div className="mt-2 flex items-center gap-3">
                  <ShopLogo shop={s} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg">{s.name}</p>
                    <p className="flex items-center gap-1 text-sm text-ink-soft">
                      <MapPin className="size-4" aria-hidden />
                      {s.city}
                    </p>
                  </div>
                  <Button asChild variant="soft" size="sm">
                    <Link href={`/shop/${s.slug}`}>
                      <Store aria-hidden />
                      {t("visitShop")}
                    </Link>
                  </Button>
                </div>
                <p className="mt-3 flex items-center gap-2 text-[15px]">
                  <Truck className="size-5 text-accent-strong" aria-hidden />
                  {s.delivery === "both" ? t("both") : s.delivery === "pickup" ? t("pickup") : t("delivery")} · {t("cod")}
                </p>
              </section>
            ) : null}

            </div>
            </div>

            {more.data && more.data.filter((x) => x.id !== p.id).length ? (
              <section className="mt-7 lg:mt-12">
                <h2 className="mb-3 text-2xl">{t("more")}</h2>
                <ProductGrid wide>
                  {more.data
                    .filter((x) => x.id !== p.id)
                    .slice(0, 6)
                    .map((x, i) => (
                      <ProductCard key={x.id} product={x} index={i} />
                    ))}
                </ProductGrid>
              </section>
            ) : null}
          </>
        )}
      </main>

      {p ? (
        <div className="fixed-bar z-20 px-4 pb-2 md:hidden">
          <div className="mx-auto grid max-w-xl grid-cols-2 gap-2 rounded-[22px] bg-cream p-2 shadow-warm">
            <Button variant="whatsapp" onClick={whatsapp} className="px-3 text-[15px]">
              <WhatsAppIcon className="size-5" />
              {t("orderWhatsApp")}
            </Button>
            <Button onClick={add} disabled={sold} className="px-3 text-[15px]">
              <ShoppingBag aria-hidden />
              {t("addToCart")}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
