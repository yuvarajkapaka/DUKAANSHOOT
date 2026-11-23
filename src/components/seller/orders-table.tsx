"use client";
import { ArrowDown, ArrowUp, ArrowUpDown, Home, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { StatusPill, useOrderDate } from "@/components/market/order-card";
import { SmartImage } from "@/components/ui/smart-image";
import type { Order } from "@/lib/market/types";
import { cn, rupees } from "@/lib/utils";
import { OrderActions } from "./order-actions";

type SortKey = "date" | "customer" | "total" | "status";
const STATUS_ORDER = ["new", "accepted", "packed", "ready", "shipped", "delivered", "rejected", "cancelled"];

/** Laptop/desktop: orders as a sortable data table (phones get cards). */
export function OrdersTable({ orders, shopName, fresh }: { orders: Order[]; shopName: string; fresh: Set<string> }) {
  const t = useTranslations("sellerOrders");
  const to = useTranslations("orders");
  const tco = useTranslations("checkout");
  const tc = useTranslations("shop");
  const tcart = useTranslations("cart");
  const tst = useTranslations("status");
  const date = useOrderDate();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: -1 });

  const sorted = [...orders].sort((a, b) => {
    const v =
      sort.key === "date"
        ? a.createdAt.localeCompare(b.createdAt)
        : sort.key === "customer"
          ? a.buyerName.localeCompare(b.buyerName)
          : sort.key === "total"
            ? a.totalPaise - b.totalPaise
            : STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    return v * sort.dir;
  });

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => {
    const on = sort.key === k;
    const Icon = on ? (sort.dir === 1 ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th scope="col" aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={cn("px-3 py-2 text-left", className)}>
        <button type="button" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : k === "date" || k === "total" ? -1 : 1 }))} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-1 font-semibold hover:bg-accent-soft">
          {children}
          <Icon className={cn("size-4", !on && "opacity-40")} aria-hidden />
        </button>
      </th>
    );
  };

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-soft">
      <table className="w-full text-[15px]">
        <thead className="border-b border-line text-sm text-ink-soft">
          <tr>
            <Th k="date">{to("details")}</Th>
            <Th k="customer">{t("buyer")}</Th>
            <th scope="col" className="px-3 py-2 text-left font-semibold">
              {tc("products")}
            </th>
            <Th k="total" className="text-right">
              {tcart("total")}
            </Th>
            <Th k="status">{tst("title")}</Th>
            <th scope="col" className="w-[260px] px-3 py-2">
              <span className="sr-only">{t("accept")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((o) => (
            <tr key={o.id} className={cn("border-b border-line align-middle transition-colors last:border-0 hover:bg-saffron-50", fresh.has(o.id) && o.status === "new" && "bg-accent-soft")}>
              <td className="px-3 py-3">
                <Link href={`/seller/orders/${o.id}`} className="font-semibold hover:underline">
                  {o.code}
                </Link>
                <span className="block text-sm text-ink-soft">{date(o.createdAt)}</span>
              </td>
              <td className="px-3 py-3">
                <span className="font-medium">{o.buyerName}</span>
                <span className="flex items-center gap-1 text-sm text-ink-soft">
                  {o.deliveryType === "delivery" ? <Home className="size-3.5" aria-hidden /> : <Store className="size-3.5" aria-hidden />}
                  {o.deliveryType === "delivery" ? tco("homeDelivery") : tco("pickup")}
                </span>
              </td>
              <td className="px-3 py-3">
                <span className="flex -space-x-2">
                  {o.items.slice(0, 3).map((it) => (
                    <span key={it.id} className="relative block aspect-[4/5] w-9 overflow-hidden rounded-md border-2 border-paper bg-saffron-50" title={`${it.title} · ${it.size} × ${it.qty}`}>
                      <SmartImage src={it.image} alt={it.title} sizes="36px" />
                    </span>
                  ))}
                </span>
              </td>
              <td className="px-3 py-3 text-right font-display font-bold">{rupees(o.totalPaise)}</td>
              <td className="px-3 py-3">
                <StatusPill status={o.status} />
              </td>
              <td className="px-3 py-2">{["delivered", "rejected", "cancelled"].includes(o.status) ? null : <OrderActions order={o} shopName={shopName} compact />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
