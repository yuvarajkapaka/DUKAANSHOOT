"use client";
import { MapPin, Phone, Radio, Store, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AppHeader, RequireAuth } from "@/components/app-chrome";
import { useMarketQuery } from "@/components/market-state";
import { StatusPill, useOrderDate } from "@/components/market/order-card";
import { StatusTimeline } from "@/components/market/status-timeline";
import { useAuthed } from "@/components/providers";
import { WhatsAppIcon } from "@/components/results/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/feedback";
import { Sheet } from "@/components/ui/sheet";
import { SmartImage } from "@/components/ui/smart-image";
import { rupees } from "@/lib/utils";

const REASONS = ["changed", "price", "mistake", "late"] as const;

function OrderInner() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("orders");
  const tco = useTranslations("checkout");
  const tc = useTranslations("common");
  const { market, profile } = useAuthed();
  const date = useOrderDate();
  const order = useMarketQuery(() => market.getOrder(id), [market, id], ["orders"]);
  const shop = useMarketQuery(() => (order.data ? market.getShop(order.data.shopId) : Promise.resolve(null)), [market, order.data?.shopId], []);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("changed");
  const [busy, setBusy] = useState(false);
  const o = order.data;

  if (o === null || (o && o.buyerId !== profile.id)) {
    return (
      <>
        <AppHeader back="/account/orders" />
        <EmptyState title={tc("somethingWrong")} />
      </>
    );
  }

  const cancel = async () => {
    setBusy(true);
    try {
      await market.cancelOrder(profile.id, id, t(`reasons.${reason}`));
      toast.success(t("cancelled"));
      setCancelOpen(false);
    } catch {
      toast.error(t("onlyNew"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppHeader back="/account/orders" title={o ? t("order", { code: o.code }) : undefined} width="5xl" />
      <main className="mx-auto max-w-5xl px-4 pb-8 lg:px-6">
        {!o ? (
          <div className="space-y-3">
            <div className="skeleton h-72 rounded-[var(--radius-card)]" />
            <div className="skeleton h-32 rounded-[var(--radius-card)]" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-ink-soft">{t("placedOn", { date: date(o.createdAt) })}</p>
              <StatusPill status={o.status} />
            </div>

            <div className="lg:mt-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
            <section className="mt-3 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft lg:sticky lg:top-24 lg:mt-0">
              <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800 dark:bg-green-950 dark:text-green-300">
                <Radio className="size-3.5" aria-hidden />
                {t("live")}
              </p>
              <StatusTimeline order={o} />
            </section>

            <div>
            <section className="mt-4 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft lg:mt-0">
              <h2 className="mb-2 text-lg">{t("details")}</h2>
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
              <p className="text-sm text-ink-soft">{o.paymentMethod === "cod" ? tco("cod") : tco("payAtShop")}</p>
              <div className="mt-3 flex gap-2 rounded-2xl bg-saffron-50 p-3 text-[15px]">
                {o.deliveryType === "delivery" ? <MapPin className="size-5 shrink-0 text-accent-strong" aria-hidden /> : <Store className="size-5 shrink-0 text-accent-strong" aria-hidden />}
                <div>
                  <p className="font-semibold">{o.deliveryType === "delivery" ? t("deliverTo") : t("pickupFrom")}</p>
                  <p className="text-ink-soft">{o.address ? `${o.address.line1}, ${o.address.city} – ${o.address.pincode}` : `${o.shopName}${shop.data ? `, ${shop.data.city}` : ""}`}</p>
                </div>
              </div>
            </section>

            {shop.data ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={`tel:+${shop.data.whatsapp.replace(/\D/g, "")}`}>
                    <Phone aria-hidden />
                    {t("callShop")}
                  </a>
                </Button>
                <Button variant="whatsapp" size="sm" onClick={() => window.open(`https://wa.me/${shop.data!.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`${o.code}: `)}`, "_blank", "noopener")}>
                  <WhatsAppIcon className="size-5" />
                  {t("whatsappShop")}
                </Button>
              </div>
            ) : null}

            {o.status === "new" ? (
              <Button variant="danger" block className="mt-4" onClick={() => setCancelOpen(true)}>
                <XCircle aria-hidden />
                {t("cancel")}
              </Button>
            ) : null}
            </div>
            </div>
          </>
        )}
      </main>

      <Sheet open={cancelOpen} onOpenChange={setCancelOpen} title={t("cancelTitle")} description={t("cancelReason")}>
        <div className="grid gap-4 pb-4">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("cancelReason")}>
            {REASONS.map((r) => (
              <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
                {t(`reasons.${r}`)}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              {tc("no")}
            </Button>
            <Button variant="danger" loading={busy} onClick={cancel}>
              <XCircle aria-hidden />
              {t("cancel")}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

export default function OrderPage() {
  return (
    <RequireAuth>
      <OrderInner />
    </RequireAuth>
  );
}
