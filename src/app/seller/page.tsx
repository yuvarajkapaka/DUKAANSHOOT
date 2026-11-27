"use client";
import { m as motion } from "framer-motion";
import { ArrowRight, Camera, Eye, Package, ShoppingBag, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-chrome";
import { GoldRule, Grain, Jaali, RangoliMotif, SectionHead, TempleBorder, Zari } from "@/components/brand/ornaments";
import { useMarketQuery, useMarketState } from "@/components/market-state";
import { OrderCard } from "@/components/market/order-card";
import { useAuthed } from "@/components/providers";
import { WhatsAppIcon } from "@/components/results/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Counter, PullToRefresh } from "@/components/ui/feedback";
import { Reveal } from "@/components/ui/reveal";
import { useCreateStore } from "@/lib/client/create-store";
import { ensureShop } from "@/lib/client/ensure-shop";
import { enter, tap } from "@/lib/motion";
import { cn } from "@/lib/utils";

// marigold, indigo, teal, butter (same tiles as the market categories)
const STAT_TILES = ["tile-sarees", "tile-kurtas", "tile-lehengas", "tile-kids"];

export default function SellerDashboard() {
  const t = useTranslations("seller");
  const th = useTranslations("home");
  const tn = useTranslations("nav");
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
          <div className="anim-rise pt-1">
            <p className="eyebrow">
              <Zari className="size-2.5" />
              {tn("dashboard")}
            </p>
            <h1 className="mt-1 font-display text-[1.9rem] leading-tight md:text-4xl">{th("greeting", { name: profile.shopName })}</h1>
          </div>

          {waiting ? (
            <Link href="/seller/orders" className="anim-rise group relative mt-4 flex min-h-14 items-center gap-3 overflow-hidden rounded-full bg-[linear-gradient(120deg,#d42a52,#9b0e32)] px-5 text-white shadow-warm transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.99]">
              <span className="relative flex size-3">
                <span key={waiting} className="anim-ping absolute inline-flex size-full rounded-full bg-white" aria-hidden />
                <span className="relative inline-flex size-3 rounded-full bg-white" />
              </span>
              <span className="relative flex-1 font-display text-[17px] font-semibold">
                {waiting} · {t("newOrders")}
              </span>
              <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          ) : null}

          {/* Rangoli Grid stat tiles: 2×2 on phones, one row on laptops */}
          <div className="stagger mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
            {stats.map(({ icon: Icon, label, value, href }, i) => (
              <Link
                key={label}
                href={href}
                style={{ "--i": i } as React.CSSProperties}
                className={cn(STAT_TILES[i % STAT_TILES.length], "tile tile-hover edge-gold flex min-h-32 flex-col justify-between rounded-[var(--radius-lux)] p-4 shadow-soft active:scale-[0.97] md:p-5")}
              >
                <span className="relative flex size-10 items-center justify-center rounded-xl bg-white/20 shadow-[0_0_0_1px_rgb(255_255_255/0.28),inset_0_1px_0_rgb(255_255_255/0.4)] backdrop-blur-sm">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="relative">
                  <span className="block font-display text-[2.1rem] leading-none font-semibold md:text-[2.6rem]">{ready ? <Counter value={value} /> : <span className="skeleton inline-block h-8 w-12 rounded" />}</span>
                  <span className="mt-1.5 block text-[13px] leading-tight font-semibold tracking-[0.04em] uppercase opacity-80">{label}</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="lg:mt-6 lg:grid lg:grid-flow-dense lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6">
          <motion.button
            type="button"
            variants={enter}
            initial="hidden"
            animate="show"
            custom={0.2}
            whileTap={tap}
            onClick={() => {
              reset();
              router.push("/seller/create/capture");
            }}
            className="panel-night sheen group relative mt-5 flex w-full items-center gap-4 overflow-hidden rounded-[var(--radius-lux)] p-5 text-left shadow-warm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-e3)] lg:col-start-2 lg:mt-0"
          >
            <Jaali className="text-gold-light opacity-[0.1]" />
            <RangoliMotif className="spin-slow absolute -top-10 -right-10 size-40 text-gold-light opacity-[0.18]" />
            <Grain />
            <TempleBorder className="absolute inset-x-0 top-0 h-1.5 text-gold opacity-60" />
            <span className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl bg-foil shadow-[0_8px_20px_-8px_rgb(0_0_0/0.7)] transition-transform duration-300 ease-pop group-hover:-rotate-6 group-hover:scale-105">
              <Camera className="size-8 text-on-gold" aria-hidden />
            </span>
            <span className="relative">
              <span className="text-foil block font-display text-2xl leading-tight font-semibold">{t("makePhotos")}</span>
              <span className="text-[15px] font-medium text-mist/75">{t("makePhotosHint")}</span>
            </span>
          </motion.button>

          <section className="mt-6 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0" aria-labelledby="ro">
            <SectionHead
              id="ro"
              eyebrow={t("todayOrders")}
              title={t("recentOrders")}
              action={
                <Link href="/seller/orders" className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent-strong underline decoration-gold decoration-1 underline-offset-[6px] hover:decoration-2">
                  {t("seeOrders")}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            />
            {!orders.data ? (
              <div className="skeleton h-28 rounded-[var(--radius-card)]" />
            ) : !orders.data.length ? (
              <p className="rounded-[var(--radius-lux)] border border-dashed border-gold/40 bg-gold-soft/30 p-6 text-center text-ink-soft">{t("noOrders")}</p>
            ) : (
              <div className="grid gap-3">
                {orders.data.slice(0, 5).map((o, i) => (
                  <Reveal key={o.id} variant="rise" delay={i * 0.05}>
                    <OrderCard order={o} href={`/seller/orders/${o.id}`} title={o.buyerName} index={i} highlight={lastOrderEvent?.type === "orders" && lastOrderEvent.orderId === o.id && o.status === "new"} />
                  </Reveal>
                ))}
              </div>
            )}
          </section>

          {s ? (
            <Reveal as="section" delay={0.1} className="card-lux mt-6 p-5 lg:col-start-2 lg:mt-0">
              <p className="eyebrow">
                <Zari className="size-2.5" />
                {t("yourShop")}
              </p>
              <p className="mt-1.5 truncate font-mono text-[15px] text-ink-soft">/shop/{s.slug}</p>
              <GoldRule className="mt-3" diamond={false} />
              <div className="mt-4 grid grid-cols-2 gap-2">
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
            </Reveal>
          ) : null}
          </div>
        </main>
      </PullToRefresh>
    </>
  );
}
