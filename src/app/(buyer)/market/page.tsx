"use client";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-chrome";
import { useMarketQuery } from "@/components/market-state";
import { ProductCard, ProductGrid, ProductGridSkeleton } from "@/components/market/product-card";
import { ShopLogo } from "@/components/market/shop-logo";
import { useSession } from "@/components/providers";
import { Chip } from "@/components/ui/chip";
import { EmptyState, ErrorState, PullToRefresh } from "@/components/ui/feedback";
import { Sheet } from "@/components/ui/sheet";
import { CATEGORIES } from "@/lib/market/types";
import { cn } from "@/lib/utils";

const CITY_KEY = "ds_city";

export default function MarketHome() {
  const t = useTranslations("market");
  const tc = useTranslations("categories");
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
            <Link href="/seller" className="anim-rise mb-3 flex min-h-12 items-center justify-between gap-2 rounded-2xl border-2 border-ink bg-saffron-100 px-4 py-2 text-[15px] font-bold text-saffron-800">
              {t("sellerView")}
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                {t("backToShop")}
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
          ) : null}

          <h1 className="font-display text-3xl leading-none">{t("hello", { name: profile?.name ? `, ${profile.name.split(" ")[0]}` : "" })}</h1>

          {/* search bar (phones; tablets/desktops have it in the header) */}
          <Link
            href="/search?focus=1"
            className="anim-rise mt-3 flex min-h-14 items-center gap-3 rounded-full border-2 border-ink bg-paper px-5 font-medium text-ink-soft transition-transform active:scale-[0.98] md:hidden"
            style={{ animationDelay: "60ms" }}
          >
            <Search className="size-6 text-accent-strong" aria-hidden />
            {t("searchPlaceholder")}
          </Link>

          {/* hero: one bold colour block */}
          <section className="anim-pop-in relative mt-4 flex min-h-44 overflow-hidden rounded-[var(--radius-card)] bg-[#E11D48] p-5 text-white shadow-warm md:min-h-56 md:p-8 lg:p-10">
            <div className="relative z-10 flex max-w-[58%] flex-col items-start justify-between gap-3 md:max-w-[50%]">
              <div>
                <p className="font-display text-[1.75rem] leading-[0.98] font-extrabold tracking-[-0.03em] md:text-5xl">{t("heroTitle")}</p>
                <p className="mt-2 text-[15px] font-medium text-white/90 md:mt-3 md:text-lg">{t("heroBody")}</p>
              </div>
              <Link href="/search?sort=new" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-[#1E1B4B] bg-[#FFF4E0] px-4 text-[15px] font-bold text-[#1E1B4B] transition-transform hover:-translate-y-0.5 active:translate-y-px">
                {t("shopNow")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="absolute right-3 bottom-4 flex items-center gap-2 md:top-1/2 md:right-8 md:bottom-auto md:-translate-y-1/2 md:gap-4" aria-hidden>
              {["p-red-kanjivaram", "p-pink-kurti", "p-cream-kurta", "p-kids-yellow-frock"].map((id, i) => (
                <Image
                  key={id}
                  src={`/samples/market/${id}-${(i % 3) + 1}.jpg`}
                  alt=""
                  width={160}
                  height={200}
                  sizes="(max-width: 767px) 112px, 160px"
                  className={cn(
                    "aspect-[4/5] w-28 rounded-2xl border-[3px] border-[#FFF4E0] object-cover md:w-32 lg:w-36",
                    i % 2 ? "translate-y-2 -rotate-3" : "-translate-y-1 rotate-[4deg]",
                    i > 0 && "hidden",
                    i === 1 && "md:block",
                    i > 1 && "xl:block",
                  )}
                  loading="lazy"
                />
              ))}
            </div>
          </section>

          {/* categories: colour tiles, pop in one after another */}
          <nav aria-label={tc("all")} className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3">
            {CATEGORIES.map((c, i) => (
              <Link
                key={c}
                href={`/search?category=${c}`}
                style={{ animationDelay: `${60 + i * 60}ms` }}
                className={cn(`tile-${c}`, "anim-pop-in tile-hover flex h-16 items-end rounded-[18px] border-2 border-ink p-2.5 text-[15px] leading-tight font-bold md:h-20 md:p-3 md:text-base")}
              >
                {tc(c)}
              </Link>
            ))}
          </nav>

          {/* shops near you */}
          <section className="mt-7" aria-labelledby="shops-h">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="shops-h" className="font-display text-2xl">
                {city ? t("shopsIn", { city }) : t("shopsNear")}
              </h2>
              <button type="button" onClick={() => setCityOpen(true)} className="inline-flex min-h-11 items-center gap-1 rounded-full border-2 border-ink bg-paper px-3 font-bold transition-transform hover:-translate-y-0.5 active:translate-y-px">
                <MapPin className="size-5" aria-hidden />
                {city ?? t("allCities")}
              </button>
            </div>
            {shops.error ? (
              <ErrorState onRetry={shops.reload} />
            ) : !shops.data ? (
              <div className="flex gap-3 overflow-hidden">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-28 w-40 shrink-0 rounded-[var(--radius-card)]" />
                ))}
              </div>
            ) : (
              <div className="no-scrollbar stagger -mx-4 flex gap-3 overflow-x-auto px-4 pt-1 pb-3">
                {(nearShops.length ? nearShops : shops.data).map((s, i) => (
                  <Link
                    key={s.id}
                    href={`/shop/${s.slug}`}
                    style={{ "--i": i } as React.CSSProperties}
                    className="flex w-40 shrink-0 flex-col gap-2 rounded-[var(--radius-card)] bg-paper p-3 shadow-soft transition-[transform,box-shadow] hover:-translate-y-1 hover:-rotate-1 hover:shadow-warm active:scale-[0.97] lg:w-52"
                  >
                    <ShopLogo shop={s} size={48} />
                    <span className="line-clamp-1 font-bold">{s.name}</span>
                    <span className="-mt-1.5 flex items-center gap-1 text-[13px] text-ink-soft">
                      <MapPin className="size-3.5" aria-hidden />
                      {s.city}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* new arrivals */}
          <section className="mt-6" aria-labelledby="new-h">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="new-h" className="font-display text-2xl">
                {t("newArrivals")}
              </h2>
              <Link href="/search?sort=new" className="inline-flex min-h-12 items-center gap-1 font-bold underline decoration-2 underline-offset-4 hover:text-accent-strong">
                {t("seeAll")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
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
