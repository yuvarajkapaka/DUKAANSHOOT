"use client";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AppHeader, RequireAuth } from "@/components/app-chrome";
import { useMarketQuery } from "@/components/market-state";
import { OrderCard } from "@/components/market/order-card";
import { useAuthed } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PullToRefresh } from "@/components/ui/feedback";

function OrdersInner() {
  const t = useTranslations("orders");
  const { market, profile } = useAuthed();
  const orders = useMarketQuery(() => market.listMyOrders(profile.id), [market, profile.id], ["orders"]);
  return (
    <>
      <AppHeader title={t("title")} width="5xl" />
      <PullToRefresh onRefresh={async () => orders.reload()}>
        <main className="mx-auto max-w-5xl px-4 lg:px-6">
          {orders.error ? (
            <ErrorState onRetry={orders.reload} />
          ) : !orders.data ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-28 rounded-[var(--radius-card)]" />
              ))}
            </div>
          ) : !orders.data.length ? (
            <EmptyState
              title={t("empty")}
              body={t("emptyBody")}
              action={
                <Button asChild>
                  <Link href="/market">
                    <Search aria-hidden />
                    {t("title")}
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="stagger grid gap-3 md:grid-cols-2 md:gap-4">
              {orders.data.map((o, i) => (
                <OrderCard key={o.id} order={o} href={`/account/orders/${o.id}`} title={o.shopName} index={i} />
              ))}
            </div>
          )}
        </main>
      </PullToRefresh>
    </>
  );
}

export default function MyOrdersPage() {
  return (
    <RequireAuth>
      <OrdersInner />
    </RequireAuth>
  );
}
