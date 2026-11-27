"use client";
import { m as motion } from "framer-motion";
import { DUR, EASE, spring } from "@/lib/motion";
import { Check, Package, PackageCheck, ShoppingBag, Store, Truck, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { timelineSteps, type Order, type OrderStatus } from "@/lib/market/types";
import { cn } from "@/lib/utils";

const ICONS: Record<OrderStatus, typeof Check> = {
  new: ShoppingBag,
  accepted: Check,
  packed: Package,
  shipped: Truck,
  ready: Store,
  delivered: PackageCheck,
  rejected: XCircle,
  cancelled: XCircle,
};

/** Steps fill one by one with a moving line; the current step pulses gently. */
export function StatusTimeline({ order }: { order: Order }) {
  const t = useTranslations("status");
  const locale = useLocale();
  const steps = timelineSteps(order.deliveryType);
  const stopped = order.status === "rejected" || order.status === "cancelled";
  const reached = stopped ? order.history.filter((h) => steps.includes(h.status)).length - 1 : steps.indexOf(order.status);
  const when = (s: OrderStatus) => order.history.find((h) => h.status === s)?.at;
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-IN" : `${locale}-IN`, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <ol className="relative" aria-label={t("title")}>
      {steps.map((s, i) => {
        const done = i <= reached;
        const current = i === reached && !stopped && order.status !== "delivered";
        const Icon = ICONS[s];
        const at = when(s);
        return (
          <li key={s} className="relative flex gap-4 pb-6 last:pb-0" aria-current={current ? "step" : undefined}>
            {i < steps.length - 1 ? (
              <span className="absolute top-12 left-[23px] h-[calc(100%-48px)] w-1 overflow-hidden rounded-full bg-line" aria-hidden>
                <motion.span
                  className="block w-full origin-top rounded-full bg-accent"
                  style={{ height: "100%" }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: i < reached ? 1 : 0 }}
                  transition={{ duration: DUR.big, delay: 0.15 + i * 0.3, ease: EASE.inOut }}
                />
              </span>
            ) : null}
            <span className="relative flex size-12 shrink-0 items-center justify-center">
              {/* where the order is now: a soft halo, and three rings when the step is first shown */}
              {current ? (
                <>
                  <span className="absolute -inset-1 rounded-full bg-accent/15" aria-hidden />
                  <span className="anim-ping absolute inset-0 rounded-full bg-accent/35" style={{ animationDelay: `${i * 0.3 + 0.4}s` }} aria-hidden />
                </>
              ) : null}
              <motion.span
                className={cn("relative flex size-12 items-center justify-center rounded-full border-2", done ? "border-accent bg-accent text-on-accent" : "border-line bg-paper text-ink-soft")}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...spring.pop, delay: i * 0.3 }}
              >
                <Icon className="size-5" aria-hidden />
              </motion.span>
            </span>
            <div className="pt-2.5">
              <p className={cn("font-semibold", !done && "text-ink-soft")}>{t(s)}</p>
              {at ? <p className="text-sm text-ink-soft">{fmt.format(new Date(at))}</p> : null}
            </div>
          </li>
        );
      })}
      {stopped ? (
        <li className="anim-rise mt-2 flex gap-4 rounded-2xl bg-red-50 p-3 text-danger dark:bg-red-950/40">
          <XCircle className="size-6 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{t(order.status)}</p>
            {order.cancelReason ? <p className="text-sm">{order.cancelReason}</p> : null}
          </div>
        </li>
      ) : null}
    </ol>
  );
}
