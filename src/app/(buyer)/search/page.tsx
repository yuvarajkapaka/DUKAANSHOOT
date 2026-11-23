"use client";
import { ArrowUpDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/app-chrome";
import { useMarketQuery } from "@/components/market-state";
import { ProductCard, ProductGrid, ProductGridSkeleton } from "@/components/market/product-card";
import { useSession } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { Sheet } from "@/components/ui/sheet";
import { CATEGORIES, SIZE_PRESETS, type Category, type ProductQuery } from "@/lib/market/types";

const PRICE_BANDS: { key: string; min?: number; max?: number }[] = [
  { key: "u500", max: 50000 },
  { key: "500-1000", min: 50000, max: 100000 },
  { key: "1000-2500", min: 100000, max: 250000 },
  { key: "a2500", min: 250000 },
];
const POPULAR = ["silk saree", "kurti", "lehenga", "kids", "shirt", "cotton"];

function SearchInner() {
  const t = useTranslations("search");
  const tc = useTranslations("categories");
  const router = useRouter();
  const params = useSearchParams();
  const { market } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q: ProductQuery = useMemo(
    () => ({
      q: params.get("q") ?? undefined,
      category: (params.get("category") as Category) ?? undefined,
      city: params.get("city") ?? undefined,
      size: params.get("size") ?? undefined,
      minPaise: params.get("min") ? Number(params.get("min")) : undefined,
      maxPaise: params.get("max") ? Number(params.get("max")) : undefined,
      sort: (params.get("sort") as ProductQuery["sort"]) ?? "new",
    }),
    [params],
  );
  const [text, setText] = useState(q.q ?? "");

  useEffect(() => {
    if (params.get("focus")) inputRef.current?.focus();
  }, [params]);

  const setParam = (patch: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams(params.toString());
    next.delete("focus");
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    router.replace(`/search?${next.toString()}`, { scroll: false });
  };

  // debounce typing
  useEffect(() => {
    const id = setTimeout(() => {
      if ((q.q ?? "") !== text) setParam({ q: text });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const results = useMarketQuery(() => market.listProducts(q), [market, q], ["products"]);
  const shops = useMarketQuery(() => market.listShops(), [market], ["products"]);
  const cities = useMarketQuery(() => market.listCities(), [market], ["products"]);
  const shopById = new Map((shops.data ?? []).map((s) => [s.id, s]));
  const band = PRICE_BANDS.find((b) => b.min === q.minPaise && b.max === q.maxPaise)?.key;
  const sizes = Array.from(new Set((q.category ? SIZE_PRESETS[q.category] : Object.values(SIZE_PRESETS).flat()).filter(Boolean)));
  const activeFilters = [q.city, q.size, band].filter(Boolean).length;
  const bandLabel = (b: (typeof PRICE_BANDS)[number]) =>
    b.min === undefined ? t("under", { n: b.max! / 100 }) : b.max === undefined ? t("above", { n: b.min / 100 }) : t("from", { a: b.min / 100, b: b.max / 100 });

  const filterFields = (
    <>
          <fieldset>
            <legend className="mb-2 font-semibold">{t("price")}</legend>
            <div className="flex flex-wrap gap-2">
              <Chip selected={!band} onClick={() => setParam({ min: null, max: null })}>
                {t("any")}
              </Chip>
              {PRICE_BANDS.map((b) => (
                <Chip key={b.key} selected={band === b.key} onClick={() => setParam({ min: b.min?.toString(), max: b.max?.toString() })}>
                  {bandLabel(b)}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-semibold">{t("city")}</legend>
            <div className="flex flex-wrap gap-2">
              <Chip selected={!q.city} onClick={() => setParam({ city: null })}>
                {t("any")}
              </Chip>
              {(cities.data ?? []).map((c) => (
                <Chip key={c} selected={q.city === c} onClick={() => setParam({ city: c })}>
                  {c}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-semibold">{t("size")}</legend>
            <div className="flex flex-wrap gap-2">
              <Chip selected={!q.size} onClick={() => setParam({ size: null })}>
                {t("any")}
              </Chip>
              {sizes.map((s) => (
                <Chip key={s} selected={q.size === s} onClick={() => setParam({ size: s })}>
                  {s}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 flex items-center gap-1.5 font-semibold">
              <ArrowUpDown className="size-4" aria-hidden />
              {t("sort")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["new", t("sortNew")],
                  ["price_low", t("sortLow")],
                  ["price_high", t("sortHigh")],
                ] as const
              ).map(([k, label]) => (
                <Chip key={k} selected={q.sort === k} onClick={() => setParam({ sort: k })}>
                  {label}
                </Chip>
              ))}
            </div>
          </fieldset>
    </>
  );

  return (
    <>
      <AppHeader back="/market" wide />
      <main className="mx-auto max-w-[1440px] px-4 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:px-6">
        {/* laptops/desktops: filters always visible on the left */}
        <aside className="hidden lg:block" aria-label={t("filters")}>
          <div className="sticky top-24 grid gap-5 rounded-[var(--radius-card)] bg-paper p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">{t("filters")}</h2>
              {activeFilters ? (
                <button type="button" onClick={() => setParam({ city: null, size: null, min: null, max: null })} className="text-sm font-semibold text-accent-strong hover:underline">
                  {t("clear")}
                </button>
              ) : null}
            </div>
            {filterFields}
          </div>
        </aside>
        <div className="min-w-0">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ q: text });
            inputRef.current?.blur();
          }}
          className="flex min-h-14 items-center gap-2 rounded-full border-2 border-line bg-paper px-4 shadow-soft focus-within:border-accent lg:hidden"
        >
          <Search className="size-6 shrink-0 text-accent-strong" aria-hidden />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            type="search"
            enterKeyHint="search"
            placeholder={t("title")}
            aria-label={t("title")}
            className="min-h-12 w-full bg-transparent text-lg outline-none"
          />
          {text ? (
            <button type="button" onClick={() => setText("")} className="flex size-10 shrink-0 items-center justify-center rounded-full active:bg-accent-soft" aria-label={t("clear")}>
              <X className="size-5" aria-hidden />
            </button>
          ) : null}
        </form>

        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label={t("category")}>
          <Chip selected={!q.category} onClick={() => setParam({ category: null, size: null })} className="shrink-0">
            {tc("all")}
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} selected={q.category === c} onClick={() => setParam({ category: c, size: null })} className="shrink-0">
              {tc(c)}
            </Chip>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="font-semibold" aria-live="polite">
            {results.data ? t("results", { count: results.data.length }) : " "}
          </p>
          <Button variant="outline" size="sm" onClick={() => setFiltersOpen(true)} className="lg:hidden">
            <SlidersHorizontal aria-hidden />
            {t("filters")}
            {activeFilters ? <span className="rounded-full bg-accent px-1.5 text-xs text-on-accent">{activeFilters}</span> : null}
          </Button>
        </div>

        {!q.q && !q.category && !activeFilters ? (
          <div className="mt-3">
            <p className="mb-2 text-sm font-semibold text-ink-soft">{t("recent")}</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((p) => (
                <button key={p} type="button" onClick={() => setText(p)} className="min-h-10 rounded-full bg-accent-soft px-3 text-[15px] font-medium text-accent-strong active:scale-95">
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          {results.error ? (
            <ErrorState onRetry={results.reload} />
          ) : !results.data ? (
            <ProductGridSkeleton wide />
          ) : !results.data.length ? (
            <EmptyState
              title={t("empty")}
              body={t("emptyBody")}
              action={
                <Button variant="soft" onClick={() => router.replace("/search")}>
                  <X aria-hidden />
                  {t("clear")}
                </Button>
              }
            />
          ) : (
            <ProductGrid wide>
              {results.data.map((p, i) => (
                <ProductCard key={p.id} product={p} shop={shopById.get(p.shopId)} index={i} priority={i < 2} />
              ))}
            </ProductGrid>
          )}
        </div>
        </div>
      </main>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen} title={t("filters")}>
        <div className="grid gap-5 pb-2">
          {filterFields}
          <div className="safe-bottom sticky bottom-0 -mx-4 grid grid-cols-[auto_1fr] gap-2 bg-cream px-4 pt-2">
            <Button variant="ghost" onClick={() => setParam({ city: null, size: null, min: null, max: null, sort: null })}>
              {t("clear")}
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>{t("apply", { count: results.data?.length ?? 0 })}</Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
