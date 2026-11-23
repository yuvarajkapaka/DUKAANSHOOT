"use client";
import { Bell, CheckCheck, PackageCheck, ShoppingBag, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect } from "react";
import { AppHeader, RequireAuth, Shell } from "@/components/app-chrome";
import { useMarketQuery, useMarketState } from "@/components/market-state";
import { useOrderDate } from "@/components/market/order-card";
import { useAuthed } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

const ICON = { order_new: ShoppingBag, order_status: PackageCheck, order_cancelled: XCircle } as const;

function NotificationsInner() {
  const t = useTranslations("notify");
  const { market, profile } = useAuthed();
  const { refreshNotifications } = useMarketState();
  const date = useOrderDate();
  const side = profile.role === "seller" ? "seller" : "buyer";
  const list = useMarketQuery(() => market.listNotifications(profile.id), [market, profile.id], ["notifications", "orders"]);

  // opening the list marks everything as read (after a moment, so the new ones still glow)
  useEffect(() => {
    if (!list.data?.some((n) => !n.read)) return;
    const id = setTimeout(() => {
      void market.markNotificationsRead(profile.id).then(refreshNotifications);
    }, 1500);
    return () => clearTimeout(id);
  }, [list.data, market, profile.id, refreshNotifications]);

  return (
    <Shell side={side}>
      <AppHeader title={t("title")} side={side} back={true} width="3xl" />
      <main className="mx-auto max-w-3xl px-4">
        {!list.data ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        ) : !list.data.length ? (
          <EmptyState title={t("empty")} />
        ) : (
          <>
            <div className="mb-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => market.markNotificationsRead(profile.id).then(refreshNotifications)}>
                <CheckCheck aria-hidden />
                {t("markRead")}
              </Button>
            </div>
            <ul className="stagger grid gap-2">
              {list.data.map((n, i) => {
                const Icon = ICON[n.type] ?? Bell;
                return (
                  <li key={n.id} style={{ "--i": i } as React.CSSProperties}>
                    <Link href={n.link} className={cn("flex gap-3 rounded-2xl bg-paper p-3 shadow-soft transition-transform active:scale-[0.98]", !n.read && "ring-2 ring-accent")}>
                      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", n.read ? "bg-line text-ink-soft" : "bg-accent text-on-accent")}>
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{n.title}</span>
                        <span className="block truncate text-[15px] text-ink-soft">{n.body}</span>
                        <span className="text-xs text-ink-soft">{date(n.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </Shell>
  );
}

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsInner />
    </RequireAuth>
  );
}
