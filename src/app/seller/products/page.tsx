"use client";
import { Camera, Eye, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AppHeader } from "@/components/app-chrome";
import { useMarketQuery } from "@/components/market-state";
import { useAuthed } from "@/components/providers";
import { WhatsAppIcon } from "@/components/results/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/feedback";
import { SmartImage } from "@/components/ui/smart-image";
import { ensureShop } from "@/lib/client/ensure-shop";
import type { ProductStatus } from "@/lib/market/types";
import { cn, rupees } from "@/lib/utils";

const TONE: Record<ProductStatus, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  hidden: "bg-line text-ink-soft",
  soldout: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

function ProductsInner() {
  const t = useTranslations("products");
  const params = useSearchParams();
  const fresh = params.get("new");
  const { market, profile } = useAuthed();
  const [filter, setFilter] = useState<ProductStatus | "all">("all");
  const list = useMarketQuery(async () => market.listShopProducts((await ensureShop(market, profile)).id), [market, profile.id], ["products", "orders"]);
  const shown = (list.data ?? []).filter((p) => filter === "all" || p.status === filter);

  return (
    <>
      <AppHeader title={t("title")} side="seller" />
      <main className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2" role="radiogroup" aria-label={t("title")}>
          {(["all", "active", "soldout", "hidden"] as const).map((f) => (
            <Chip key={f} selected={filter === f} onClick={() => setFilter(f)} className="shrink-0">
              {f === "all" ? `${t("title")} · ${list.data?.length ?? 0}` : t(f)}
            </Chip>
          ))}
        </div>
        <Button asChild block className="mt-2 md:w-auto">
          <Link href="/seller/create/capture">
            <Camera aria-hidden />
            {t("add")}
          </Link>
        </Button>

        {!list.data ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-28 rounded-[var(--radius-card)]" />
            ))}
          </div>
        ) : !shown.length ? (
          <EmptyState
            title={t("empty")}
            body={t("emptyBody")}
            action={
              <Button asChild>
                <Link href="/seller/create/capture">
                  <Camera aria-hidden />
                  {t("makeFirst")}
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="stagger mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((p, i) => (
              <li key={p.id} style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={`/seller/products/${p.id}`}
                  className={cn("flex gap-3 rounded-[var(--radius-card)] bg-paper p-3 shadow-soft transition-transform active:scale-[0.98]", fresh === p.id && "ring-2 ring-accent shadow-[0_0_0_6px_var(--accent-glow)]")}
                >
                  <span className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-xl bg-saffron-50">
                    <SmartImage src={p.images[0]} alt="" sizes="80px" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 leading-snug font-semibold">{p.title}</span>
                    <span className="block font-display text-lg font-bold">{rupees(p.pricePaise)}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-soft">
                      <span className={cn("rounded-full px-2 py-0.5 font-bold", TONE[p.status])}>{t(p.status)}</span>
                      <span>{t("stock", { n: p.stock })}</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Eye className="size-3.5" aria-hidden />
                        {p.views}
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <WhatsAppIcon className="size-3.5" />
                        {p.waClicks}
                      </span>
                    </span>
                  </span>
                  <Pencil className="size-5 shrink-0 self-center text-ink-soft" aria-label={t("edit")} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsInner />
    </Suspense>
  );
}
