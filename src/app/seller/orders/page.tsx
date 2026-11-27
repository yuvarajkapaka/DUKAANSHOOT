"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import { ease, enter, scrim, spring } from "@/lib/motion";
import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app-chrome";
import { useMarketQuery, useMarketState } from "@/components/market-state";
import { OrderCard } from "@/components/market/order-card";
import { useAuthed } from "@/components/providers";
import { OrderActions } from "@/components/seller/order-actions";
import { OrdersTable } from "@/components/seller/orders-table";
import { Button } from "@/components/ui/button";
import { PartyArt, useCelebrate } from "@/components/ui/celebration";
import { Chip } from "@/components/ui/chip";
import { EmptyState, PullToRefresh } from "@/components/ui/feedback";
import { ensureShop } from "@/lib/client/ensure-shop";
import type { Order } from "@/lib/market/types";

const TABS = {
  new: (o: Order) => o.status === "new",
  active: (o: Order) => ["accepted", "packed", "shipped", "ready"].includes(o.status),
  done: (o: Order) => ["delivered", "rejected", "cancelled"].includes(o.status),
};

function FirstSale({ onClose }: { onClose: () => void }) {
  const t = useTranslations("sellerOrders");
  useCelebrate();
  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cream/97 px-6 text-center" variants={scrim} initial="hidden" animate="show" exit="exit" role="dialog" aria-modal="true" aria-label={t("firstSaleTitle")}>
      <PartyArt />
      <motion.h1 variants={enter} initial="hidden" animate="show" custom={0.4} className="mt-4 font-display text-3xl">
        {t("firstSaleTitle")}
      </motion.h1>
      <motion.p variants={enter} initial="hidden" animate="show" custom={0.52} className="mt-2 max-w-xs text-lg text-ink-soft">
        {t("firstSaleBody")}
      </motion.p>
      <Button size="lg" className="mt-8" onClick={onClose}>
        {t("accept")} →
      </Button>
    </motion.div>
  );
}

export default function SellerOrdersPage() {
  const t = useTranslations("sellerOrders");
  const ts = useTranslations("seller");
  const { market, profile } = useAuthed();
  const { lastOrderEvent } = useMarketState();
  const [tab, setTab] = useState<keyof typeof TABS>("new");
  const [firstSale, setFirstSale] = useState(false);
  const shop = useMarketQuery(() => ensureShop(market, profile), [market, profile.id], []);
  // null until the shop is known, so "no shop yet" is never mistaken for "zero orders" (which would make every order look new)
  const orders = useMarketQuery(() => (shop.data ? market.listShopOrders(shop.data.id) : Promise.resolve(null)), [market, shop.data?.id], ["orders"]);
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  // realtime: a new order slides in from the top with a glowing border (the "ding" plays globally)
  useEffect(() => {
    if (!orders.data) return;
    if (!seen.current) {
      seen.current = new Set(orders.data.map((o) => o.id));
      return;
    }
    const arrived = orders.data.filter((o) => !seen.current!.has(o.id));
    if (!arrived.length) return;
    arrived.forEach((o) => seen.current!.add(o.id));
    setFresh((f) => new Set([...f, ...arrived.map((o) => o.id)]));
    setTab("new");
    const real = orders.data.filter((o) => o.status !== "cancelled" && o.status !== "rejected");
    if (real.length === arrived.length && !localStorage.getItem(`ds_first_sale_${profile.id}`)) {
      localStorage.setItem(`ds_first_sale_${profile.id}`, "1");
      setFirstSale(true);
    }
  }, [orders.data, profile.id, lastOrderEvent]);

  const list = (orders.data ?? []).filter(TABS[tab]);
  const counts = Object.fromEntries(Object.entries(TABS).map(([k, f]) => [k, (orders.data ?? []).filter(f).length]));

  return (
    <>
      <AppHeader title={t("title")} side="seller" />
      <PullToRefresh onRefresh={async () => orders.reload()}>
        <main className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="grid grid-cols-3 gap-2 md:max-w-xl" role="radiogroup" aria-label={t("title")}>
            {(Object.keys(TABS) as (keyof typeof TABS)[]).map((k) => (
              <Chip key={k} selected={tab === k} onClick={() => setTab(k)} className="justify-center px-2">
                {t(k === "new" ? "tabNew" : k === "active" ? "tabActive" : "tabDone")}
                {counts[k] ? <span className="rounded-full bg-black/10 px-1.5 text-xs">{counts[k]}</span> : null}
              </Chip>
            ))}
          </div>

          {!orders.data ? (
            <div className="mt-4 space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="skeleton h-40 rounded-[var(--radius-card)]" />
              ))}
            </div>
          ) : !list.length ? (
            <EmptyState
              title={t("empty")}
              body={tab === "new" ? ts("noOrders") : t("emptyBody")}
              action={
                tab === "new" ? (
                  <Button asChild variant="soft">
                    <Link href="/seller/shop">
                      <Share2 aria-hidden />
                      {ts("yourShop")}
                    </Link>
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
            <div className="mt-4 hidden lg:block">{shop.data ? <OrdersTable orders={list} shopName={shop.data.name} fresh={fresh} /> : null}</div>
            <ul className="mt-4 grid gap-3 md:grid-cols-2 lg:hidden">
              <AnimatePresence initial={false}>
                {list.map((o) => (
                  <motion.li
                    key={o.id}
                    layout
                    // a fresh order drops in from above; a handled one slides out quietly
                    initial={fresh.has(o.id) ? { opacity: 0, y: -48, scale: 0.97, filter: "blur(4px)" } : false}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: 32, transition: ease.exit }}
                    transition={spring.soft}
                    className="relative"
                  >
                    {fresh.has(o.id) && o.status === "new" ? (
                      <span className="absolute -top-2 left-3 z-10 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-on-accent shadow-lift" style={{ animation: "soft-pulse 1.6s ease-in-out 3" }}>
                        {t("newBadge")}
                      </span>
                    ) : null}
                    <OrderCard order={o} href={`/seller/orders/${o.id}`} title={o.buyerName} highlight={fresh.has(o.id) && o.status === "new"} />
                    {shop.data && !TABS.done(o) ? (
                      <div className="-mt-2 rounded-b-[var(--radius-card)] bg-paper px-3 pb-3 shadow-soft">
                        <OrderActions order={o} shopName={shop.data.name} compact />
                      </div>
                    ) : null}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            </>
          )}
        </main>
      </PullToRefresh>
      <AnimatePresence>{firstSale ? <FirstSale onClose={() => setFirstSale(false)} /> : null}</AnimatePresence>
    </>
  );
}
