"use client";
import { m as motion } from "framer-motion";
import { ArrowRight, Camera, Eye, Package, ShoppingBag, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-chrome";
import { useMarketQuery, useMarketState } from "@/components/market-state";
import { OrderCard } from "@/components/market/order-card";
import { useAuthed } from "@/components/providers";
import { WhatsAppIcon } from "@/components/results/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Counter, PullToRefresh } from "@/components/ui/feedback";
import { useCreateStore } from "@/lib/client/create-store";
import { ensureShop } from "@/lib/client/ensure-shop";
import { cn } from "@/lib/utils";

// marigold, indigo, teal, butter (same tiles as the market categories)
const STAT_TILES = ["tile-sarees", "tile-kurtas", "tile-lehengas", "tile-kids"];

export default function SellerDashboard() {
  const t = useTranslations("seller");
  const th = useTranslations("home");
  const router = useRouter();
  const reset = useCreateStore((s) => s.reset);
  const { market, profile } = useAuthed();
  const { lastOrderEvent } = useMarketState();
  const shop = useMarketQuery(() => ensureShop(market, profile), [market, profile.id], ["products"]);
  const s = shop.data;
  const products = useMarketQuery(() => (s ? market.listShopProducts(s.id) : Promise.resolve([])), [market, s?.id], ["products"]);
  const orders = useMarketQuery(() => (s ? market.listShopOrders(s.id) : Promise.resolve([])), [market, s?.id], ["orders"]);

  const today = new Date().toDateString();
  const todayOrders = (orders.data ?? []).filter((o) => new Date(o.createdAt).toDateString() === today).length;
  const waiting = (orders.data ?? []).filter((o) => o.status === "new").length;
  const views = (products.data ?? []).reduce((a, p) => a + p.views, 0);
  const wa = (products.data ?? []).reduce((a, p) => a + p.waClicks, 0);
  const ready = !!products.data && !!orders.data;

  const stats = [
    { icon: ShoppingBag, label: t("todayOrders"), value: todayOrders, href: "/seller/orders" },
    { icon: Package, label: t("totalProducts"), value: products.data?.length ?? 0, href: "/seller/products" },
    { icon: Eye, label: t("views"), value: views, href: "/seller/products" },
    { icon: WhatsAppIcon, label: t("waClicks"), value: wa, href: "/seller/products" },
  ];

  return (
    <>
      <AppHeader side="seller" />
      <PullToRefresh
        onRefresh={async () => {
          products.reload();
          orders.reload();
        }}
      >
        <main className="mx-auto max-w-6xl px-4 lg:px-6">
          <h1 className="anim-rise font-display text-3xl leading-none">{th("greeting", { name: profile.shopName })}</h1>

          {waiting ? (
            <Link href="/seller/orders" className="anim-rise mt-3 flex min-h-14 items-center gap-3 rounded-2xl bg-[#E11D48] px-4 text-white shadow-warm transition-transform hover:-translate-y-0.5">
              <span className="relative flex size-3">
                <span className="absolute inline-flex size-full rounded-full bg-white" style={{ animation: "soft-pulse 1.4s infinite" }} />
                <span className="relative inline-flex size-3 rounded-full bg-white" />
              </span>
              <span className="flex-1 font-bold">
                {waiting} · {t("newOrders")}
              </span>
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          ) : null}

          {/* Rangoli Grid stat tiles: 2×2 on phones, one row on laptops */}
          <div className="stagger mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
            {stats.map(({ icon: Icon, label, value, href }, i) => (
              <Link
                key={label}
                href={href}
                style={{ "--i": i } as React.CSSProperties}
                className={cn(STAT_TILES[i % STAT_TILES.length], "flex min-h-32 flex-col justify-between rounded-[var(--radius-card)] border-2 border-ink p-3.5 transition-[transform,box-shadow] hover:-translate-y-1 hover:-rotate-1 hover:shadow-lift active:scale-[0.97] md:p-4")}
              >
                <span className="flex size-10 items-center justify-center rounded-xl border-2 border-current/40 bg-white/15">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-display text-3xl leading-none font-extrabold md:text-4xl">{ready ? <Counter value={value} /> : <span className="skeleton inline-block h-8 w-12 rounded" />}</span>
                  <span className="mt-1 block text-[14px] leading-tight font-bold opacity-85">{label}</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="lg:mt-6 lg:grid lg:grid-flow-dense lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              reset();
              router.push("/seller/create/capture");
            }}
            className="relative mt-4 flex w-full items-center gap-4 overflow-hidden rounded-[var(--radius-card)] bg-saffron-500 p-5 text-left text-night shadow-warm transition-transform hover:-translate-y-1 lg:col-start-2 lg:mt-0"
          >
            <svg className="spin-slow absolute -top-8 -right-8 size-28 text-saffron-300/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19" /></svg>
            <span className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl border-2 border-[#1E1B4B] bg-[#FFF4E0]">
              <Camera className="size-8 text-night" aria-hidden />
            </span>
            <span className="relative">
              <span className="block font-display text-2xl leading-tight font-extrabold">{t("makePhotos")}</span>
              <span className="text-[15px] font-medium">{t("makePhotosHint")}</span>
            </span>
          </motion.button>

          <section className="mt-6 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0" aria-labelledby="ro">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="ro" className="text-2xl">
                {t("recentOrders")}
              </h2>
              <Link href="/seller/orders" className="inline-flex min-h-12 items-center gap-1 font-bold underline decoration-2 underline-offset-4 hover:text-accent-strong">
                {t("seeOrders")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            {!orders.data ? (
              <div className="skeleton h-28 rounded-[var(--radius-card)]" />
            ) : !orders.data.length ? (
              <p className="rounded-[var(--radius-card)] border-2 border-dashed border-line p-5 text-center text-ink-soft">{t("noOrders")}</p>
            ) : (
              <div className="stagger grid gap-3">
                {orders.data.slice(0, 5).map((o, i) => (
                  <OrderCard key={o.id} order={o} href={`/seller/orders/${o.id}`} title={o.buyerName} index={i} highlight={lastOrderEvent?.type === "orders" && lastOrderEvent.orderId === o.id && o.status === "new"} />
                ))}
              </div>
            )}
          </section>

          {s ? (
            <section className="mt-6 rounded-[var(--radius-card)] bg-butter-tile p-4 shadow-warm lg:col-start-2 lg:mt-0">
              <p className="text-sm font-bold tracking-wide uppercase">{t("yourShop")}</p>
              <p className="mt-1 truncate font-mono text-[15px]">/shop/{s.slug}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button asChild variant="soft" size="sm">
                  <Link href="/seller/shop">
                    <Store aria-hidden />
                    {s.name.length > 14 ? s.name.slice(0, 13) + "…" : s.name}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/market">
                    <Eye aria-hidden />
                    {t("buyerView")}
                  </Link>
                </Button>
              </div>
            </section>
          ) : null}
          </div>
        </main>
      </PullToRefresh>
    </>
  );
}
