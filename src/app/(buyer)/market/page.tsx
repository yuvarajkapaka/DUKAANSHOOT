"use client";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-chrome";
import { GoldRule, Grain, Jaali, Paisley, RangoliMotif, SectionHead, TempleBorder, Zari } from "@/components/brand/ornaments";
import { useMarketQuery } from "@/components/market-state";
import { ProductCard, ProductGrid, ProductGridSkeleton } from "@/components/market/product-card";
import { ShopLogo } from "@/components/market/shop-logo";
import { useSession } from "@/components/providers";
import { Chip } from "@/components/ui/chip";
import { EmptyState, ErrorState, PullToRefresh } from "@/components/ui/feedback";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Sheet } from "@/components/ui/sheet";
import { CATEGORIES } from "@/lib/market/types";
import { cn } from "@/lib/utils";

const CITY_KEY = "ds_city";

export default function MarketHome() {
  const t = useTranslations("market");
  const tc = useTranslations("categories");
  const tcm = useTranslations("common");
  const { market, profile } = useSession();
  const [city, setCity] = useState<string | null>(null);
  const [cityOpen, setCityOpen] = useState(false);

  useEffect(() => {
    setCity(localStorage.getItem(CITY_KEY) || profile?.city || null);
  }, [profile?.city]);

  const shops = useMarketQuery(() => market.listShops(), [market], ["products"]);
  const cities = useMarketQuery(() => market.listCities(), [market], ["products"]);
  const products = useMarketQuery(() => market.listProducts({ limit: 12 }), [market], ["products"]);
  const shopById = new Map((shops.data ?? []).map((s) => [s.id, s]));
  const nearShops = (shops.data ?? []).filter((s) => !city || s.city === city);

  const pickCity = (c: string | null) => {
    setCity(c);
    if (c) localStorage.setItem(CITY_KEY, c);
    else localStorage.removeItem(CITY_KEY);
    setCityOpen(false);
  };

  return (
    <>
      <AppHeader wide />
      <PullToRefresh
        onRefresh={async () => {
          shops.reload();
          products.reload();
          await new Promise((r) => setTimeout(r, 500));
        }}
      >
        <main className="mx-auto max-w-[1440px] px-4 lg:px-6 lg:pt-4">
          {profile?.role === "seller" ? (
            <Link href="/seller" className="anim-rise edge-gold mb-3 flex min-h-12 items-center justify-between gap-2 rounded-full bg-gold-soft px-4 py-2 text-[15px] font-semibold text-gold-deep">
              {t("sellerView")}
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                {t("backToShop")}
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
          ) : null}

          <div className="anim-rise pt-1">
            <p className="eyebrow">
              <Zari className="size-2.5" />
              {tcm("appName")}
            </p>
            <h1 className="mt-1 font-display text-[1.9rem] leading-tight md:text-4xl">{t("hello", { name: profile?.name ? `, ${profile.name.split(" ")[0]}` : "" })}</h1>
          </div>

          {/* search bar (phones; tablets/desktops have it in the header) */}
          <Link
            href="/search?focus=1"
            className="anim-rise edge mt-3 flex min-h-14 items-center gap-3 rounded-full bg-paper px-5 font-medium text-ink-soft shadow-soft transition-transform active:scale-[0.98] md:hidden"
            style={{ animationDelay: "60ms" }}
          >
            <Search className="size-5 text-gold-deep" aria-hidden />
            {t("searchPlaceholder")}
          </Link>

          {/* hero: an editorial night panel — jaali screen, brass temple border,
              aurora mesh and arch-framed photographs */}
          <section className="anim-pop-in panel-night relative mt-5 flex min-h-52 rounded-[var(--radius-lux)] p-6 shadow-warm md:min-h-72 md:p-10 lg:p-12">
            <span aria-hidden className="bg-mesh pointer-events-none absolute inset-0 opacity-60 blur-[40px]" />
            <Jaali className="text-gold-light opacity-[0.1]" />
            <RangoliMotif className="spin-slow pointer-events-none absolute -top-16 -left-20 size-72 text-gold-light opacity-[0.1]" />
            <Paisley className="pointer-events-none absolute right-6 bottom-4 size-28 text-gold-light opacity-[0.14] md:size-40" />
            <Grain />
            <TempleBorder className="absolute inset-x-0 top-0 h-1.5 text-gold opacity-60" />

            <div className="relative z-10 flex max-w-[58%] flex-col items-start justify-between gap-4 md:max-w-[52%]">
              <div>
                <p className="anim-rise eyebrow text-gold-light/90" style={{ animationDelay: "180ms" }}>
                  <Zari className="size-2.5" />
                  {t("shopsNear")}
                </p>
                <p className="anim-rise mt-2.5 font-display text-[2rem] leading-[1.02] font-semibold text-ivory md:text-[3.25rem]" style={{ animationDelay: "260ms" }}>
                  {t("heroTitle")}
                </p>
                <GoldRule className="anim-draw-x mt-4 max-w-[220px]" diamond={false} style={{ animationDelay: "420ms" }} />
                <p className="anim-rise mt-4 max-w-sm text-[15px] text-mist/75 md:text-lg" style={{ animationDelay: "480ms" }}>
                  {t("heroBody")}
                </p>
              </div>
              <Link
                href="/search?sort=new"
                style={{ animationDelay: "560ms" }}
                className="anim-rise sheen group inline-flex min-h-12 items-center gap-2 rounded-full bg-foil px-5 text-[15px] font-bold text-on-gold shadow-[0_10px_24px_-10px_rgb(0_0_0/0.7)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-12px_rgb(0_0_0/0.75)] active:translate-y-px active:scale-[0.98]"
              >
                {t("shopNow")}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>

            <div className="absolute right-3 bottom-5 flex items-end gap-3 md:top-1/2 md:right-10 md:bottom-auto md:-translate-y-1/2 md:gap-5" aria-hidden>
              {["p-red-kanjivaram", "p-pink-kurti", "p-cream-kurta", "p-kids-yellow-frock"].map((id, i) => (
                <span
                  key={id}
                  className={cn(
                    "relative block w-28 shrink-0 md:w-32 lg:w-36",
                    i % 2 && "translate-y-4",
                    i > 0 && "hidden",
                    i === 1 && "md:block",
                    i > 1 && "xl:block",
                  )}
                >
                  <span className="anim-rise block" style={{ animationDelay: `${320 + i * 110}ms` }}>
                  <span className={cn("block", i % 2 === 0 && "float-slow")} style={{ animationDelay: `${-i * 1.7}s` }}>
                  <Image
                    src={`/samples/market/${id}-${(i % 3) + 1}.jpg`}
                    alt=""
                    width={160}
                    height={200}
                    sizes="(max-width: 767px) 112px, 160px"
                    className="arch-soft aspect-[4/5] w-full object-cover shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_55%,transparent),0_26px_50px_-18px_rgb(0_0_0/0.8)]"
                    loading="lazy"
                  />
                  <span className="arch-soft absolute inset-0 bg-[linear-gradient(160deg,rgb(255_255_255/0.24),transparent_40%)]" />
                  </span>
                  </span>
                </span>
              ))}
            </div>
          </section>

          {/* categories: textured colour tiles with a brass hairline, popping in one after another */}
          <nav aria-label={tc("all")} className="mt-5 grid grid-cols-3 gap-2.5 md:grid-cols-6 md:gap-3.5">
            {CATEGORIES.map((c, i) => (
              <Link
                key={c}
                href={`/search?category=${c}`}
                style={{ animationDelay: `${60 + i * 55}ms` }}
                className={cn(
                  `tile tile-${c}`,
                  "anim-pop-in tile-hover edge-gold flex h-20 items-end rounded-[18px] p-3 text-[15px] leading-tight font-bold shadow-soft md:h-24 md:p-3.5 md:text-base",
                )}
              >
                <span className="relative">{tc(c)}</span>
              </Link>
            ))}
          </nav>

          {/* shops near you */}
          <section className="mt-9" aria-labelledby="shops-h">
            <SectionHead
              id="shops-h"
              eyebrow={tc("all")}
              title={city ? t("shopsIn", { city }) : t("shopsNear")}
              action={
                <button
                  type="button"
                  onClick={() => setCityOpen(true)}
                  className="edge inline-flex min-h-11 items-center gap-1.5 rounded-full bg-paper px-3.5 font-semibold shadow-soft transition-transform hover:-translate-y-0.5 active:translate-y-px"
                >
                  <MapPin className="size-4 text-gold-deep" aria-hidden />
                  {city ?? t("allCities")}
                </button>
              }
            />
            {shops.error ? (
              <ErrorState onRetry={shops.reload} />
            ) : !shops.data ? (
              <div className="flex gap-3 overflow-hidden">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-28 w-40 shrink-0 rounded-[var(--radius-card)]" />
                ))}
              </div>
            ) : (
              // keyed by city so a new city's shops get their own entrance
              <RevealGroup key={city ?? "all"} className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pt-1 pb-3">
                {(nearShops.length ? nearShops : shops.data).map((s) => (
                  <RevealItem key={s.id} className="shrink-0">
                  <Link
                    href={`/shop/${s.slug}`}
                    className="card-lux flex w-40 flex-col gap-2 p-3.5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-warm active:scale-[0.97] lg:w-52"
                  >
                    <ShopLogo shop={s} size={48} />
                    <span className="line-clamp-1 font-display text-[17px] font-semibold">{s.name}</span>
                    <span className="-mt-1.5 flex items-center gap-1 text-[13px] text-ink-soft">
                      <MapPin className="size-3.5" aria-hidden />
                      {s.city}
                    </span>
                  </Link>
                  </RevealItem>
                ))}
              </RevealGroup>
            )}
          </section>

          {/* new arrivals */}
          <section className="mt-9" aria-labelledby="new-h">
            <SectionHead
              id="new-h"
              eyebrow={t("shopNow")}
              title={t("newArrivals")}
              action={
                <Link href="/search?sort=new" className="group inline-flex min-h-11 items-center gap-1 font-semibold text-accent-strong underline decoration-gold decoration-1 underline-offset-[6px] hover:decoration-2">
                  {t("seeAll")}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </Link>
              }
            />
            {products.error ? (
              <ErrorState onRetry={products.reload} />
            ) : !products.data ? (
              <ProductGridSkeleton wide />
            ) : !products.data.length ? (
              <EmptyState title={t("noProducts")} body={t("noProductsBody")} />
            ) : (
              <ProductGrid wide>
                {products.data.map((p, i) => (
                  <ProductCard key={p.id} product={p} shop={shopById.get(p.shopId)} index={i} priority={i < 2} />
                ))}
              </ProductGrid>
            )}
          </section>
        </main>
      </PullToRefresh>

      <Sheet open={cityOpen} onOpenChange={setCityOpen} title={t("chooseCity")}>
        <div className="flex flex-wrap gap-2.5 pb-6" role="radiogroup" aria-label={t("chooseCity")}>
          <Chip selected={!city} onClick={() => pickCity(null)}>
            {t("allCities")}
          </Chip>
          {(cities.data ?? []).map((c) => (
            <Chip key={c} selected={city === c} onClick={() => pickCity(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </Sheet>
    </>
  );
}
