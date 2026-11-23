"use client";
import { MapPin, Phone, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/app-chrome";
import { useMarketQuery } from "@/components/market-state";
import { StatusPill, useOrderDate } from "@/components/market/order-card";
import { StatusTimeline } from "@/components/market/status-timeline";
import { useAuthed } from "@/components/providers";
import { OrderActions } from "@/components/seller/order-actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { SmartImage } from "@/components/ui/smart-image";
import { ensureShop } from "@/lib/client/ensure-shop";
import { rupees } from "@/lib/utils";

export default function SellerOrderPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("orders");
  const ts = useTranslations("sellerOrders");
  const tco = useTranslations("checkout");
  const tc = useTranslations("common");
  const { market, profile } = useAuthed();
  const date = useOrderDate();
  const shop = useMarketQuery(() => ensureShop(market, profile), [market, profile.id], []);
  const order = useMarketQuery(() => market.getOrder(id), [market, id], ["orders"]);
  const o = order.data;

  if (o === null || (o && shop.data && o.shopId !== shop.data.id)) {
    return (
      <>
        <AppHeader back="/seller/orders" side="seller" />
        <EmptyState title={tc("somethingWrong")} />
      </>
    );
  }

  return (
    <>
      <AppHeader back="/seller/orders" side="seller" title={o ? t("order", { code: o.code }) : undefined} />
      <main className="mx-auto max-w-5xl px-4 pb-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:px-6">
        {!o || !shop.data ? (
          <div className="skeleton h-80 rounded-[var(--radius-card)]" />
        ) : (
          <>
            <div>
            <section className="rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink-soft">{ts("buyer")}</p>
                  <p className="font-display text-xl">{o.buyerName}</p>
                  <p className="text-ink-soft">{date(o.createdAt)}</p>
                </div>
                <StatusPill status={o.status} />
              </div>
              <div className="mt-3 flex gap-2 rounded-2xl bg-saffron-50 p-3 text-[15px]">
                {o.deliveryType === "delivery" ? <MapPin className="size-5 shrink-0 text-accent-strong" aria-hidden /> : <Store className="size-5 shrink-0 text-accent-strong" aria-hidden />}
                <p>
                  <b>{o.deliveryType === "delivery" ? tco("homeDelivery") : tco("pickup")}</b>
                  {o.address ? ` · ${o.address.line1}, ${o.address.city} – ${o.address.pincode}` : ""}
                  <br />
                  {o.paymentMethod === "cod" ? tco("cod") : tco("payAtShop")}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <a href={`tel:${o.buyerPhone.replace(/\s/g, "")}`}>
                  <Phone aria-hidden />
                  {o.buyerPhone}
                </a>
              </Button>
            </section>

            <section className="mt-4 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
              <ul className="divide-y divide-line">
                {o.items.map((it) => (
                  <li key={it.id} className="flex gap-3 py-2">
                    <span className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-lg bg-saffron-50">
                      <SmartImage src={it.image} alt="" sizes="56px" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 font-medium">{it.title}</span>
                      <span className="text-sm text-ink-soft">
                        {it.size} × {it.qty}
                      </span>
                    </span>
                    <span className="font-semibold">{rupees(it.pricePaise * it.qty)}</span>
                  </li>
                ))}
              </ul>
              <p className="flex justify-between border-t border-line pt-2 font-display text-lg font-bold">
                <span>{tco("payment")}</span>
                <span>{rupees(o.totalPaise)}</span>
              </p>
            </section>

            <section className="mt-4">
              <OrderActions order={o} shopName={shop.data.name} />
            </section>

            </div>
            <section className="mt-4 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft lg:sticky lg:top-24 lg:mt-0">
              <StatusTimeline order={o} />
            </section>
          </>
        )}
      </main>
    </>
  );
}
