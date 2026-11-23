"use client";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import type { Order } from "@/lib/market/types";
import { cn, rupees } from "@/lib/utils";
import { SmartImage } from "../ui/smart-image";

export const STATUS_TONE: Record<Order["status"], string> = {
  new: "bg-info/12 text-info",
  accepted: "bg-accent-soft text-accent-strong",
  packed: "bg-accent-soft text-accent-strong",
  shipped: "bg-accent-soft text-accent-strong",
  ready: "bg-accent-soft text-accent-strong",
  delivered: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  cancelled: "bg-line text-ink-soft",
};

export function StatusPill({ status }: { status: Order["status"] }) {
  const t = useTranslations("status");
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[13px] font-bold", STATUS_TONE[status])}>{t(status)}</span>;
}

export function useOrderDate() {
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-IN" : `${locale}-IN`, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return (iso: string) => fmt.format(new Date(iso));
}

export function OrderCard({ order, href, title, index = 0, highlight }: { order: Order; href: string; title: string; index?: number; highlight?: boolean }) {
  const t = useTranslations("orders");
  const date = useOrderDate();
  return (
    <Link
      href={href}
      style={{ "--i": index } as React.CSSProperties}
      className={cn(
        "relative block rounded-[var(--radius-card)] bg-paper p-3 shadow-soft transition-transform active:scale-[0.98]",
        highlight && "ring-2 ring-accent shadow-[0_0_0_6px_var(--accent-glow)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{title}</p>
          <p className="text-sm text-ink-soft">
            {order.code} · {date(order.createdAt)}
          </p>
        </div>
        <StatusPill status={order.status} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex -space-x-3">
          {order.items.slice(0, 3).map((it) => (
            <span key={it.id} className="relative block aspect-[4/5] w-12 overflow-hidden rounded-lg border-2 border-paper bg-saffron-50">
              <SmartImage src={it.image} alt="" sizes="48px" />
            </span>
          ))}
        </div>
        <p className="min-w-0 flex-1 truncate text-sm text-ink-soft">{t("items", { count: order.items.reduce((s, i) => s + i.qty, 0) })}</p>
        <p className="font-display font-bold">{rupees(order.totalPaise)}</p>
        <ChevronRight className="size-5 text-ink-soft" aria-hidden />
      </div>
    </Link>
  );
}
