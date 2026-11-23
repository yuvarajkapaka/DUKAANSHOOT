"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import { ArrowRight, Minus, Plus, Search, Store, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-chrome";
import { useMarketState } from "@/components/market-state";
import { useSession } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { SmartImage } from "@/components/ui/smart-image";
import { useCartGroups } from "@/components/market/use-cart-groups";
import { rupees } from "@/lib/utils";

export default function CartPage() {
  const t = useTranslations("cart");
  const router = useRouter();
  const { profile } = useSession();
  const { cart, updateCart, removeFromCart } = useMarketState();
  const { groups, unavailable } = useCartGroups();
  const total = (groups ?? []).reduce((s, g) => s + g.totalPaise, 0);

  return (
    <>
      <AppHeader title={t("title")} />
      <main className="mx-auto max-w-6xl px-4 pb-32 lg:px-6 lg:pb-10">
        {!cart.length ? (
          <EmptyState
            title={t("empty")}
            body={t("emptyBody")}
            action={
              <Button asChild>
                <Link href="/market">
                  <Search aria-hidden />
                  {t("browse")}
                </Link>
              </Button>
            }
          />
        ) : !groups ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-36 rounded-[var(--radius-card)]" />
            ))}
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
          <div>
            <p className="mb-3 text-[15px] text-ink-soft">{t("separate")}</p>
            <AnimatePresence initial={false}>
              {groups.map((g) => (
                <motion.section key={g.shop.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="mb-4 rounded-[var(--radius-card)] bg-paper p-3 shadow-soft">
                  <h2 className="mb-2 flex items-center gap-2 px-1 text-lg">
                    <Store className="size-5 text-accent-strong" aria-hidden />
                    {t("fromShop", { shop: g.shop.name })}
                  </h2>
                  <ul className="divide-y divide-line">
                    <AnimatePresence initial={false}>
                      {g.lines.map(({ item, product }) => (
                        <motion.li key={item.id} layout exit={{ opacity: 0, x: -40 }} className="flex gap-3 py-3">
                          <Link href={`/product/${product.id}`} className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-xl bg-saffron-50">
                            <SmartImage src={product.images[0]} alt="" sizes="80px" />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 leading-snug font-medium">{product.title}</p>
                            <p className="text-sm text-ink-soft">{t("size", { size: item.size })}</p>
                            <p className="font-display font-bold">{rupees(product.pricePaise * item.qty)}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="flex items-center rounded-full border-2 border-line" role="group" aria-label={t("qty")}>
                                <button type="button" className="flex size-11 items-center justify-center disabled:opacity-40" disabled={item.qty <= 1} onClick={() => updateCart(item.id, item.qty - 1)} aria-label="−1">
                                  <Minus className="size-5" aria-hidden />
                                </button>
                                <motion.span key={item.qty} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-6 text-center font-bold" aria-live="polite">
                                  {item.qty}
                                </motion.span>
                                <button type="button" className="flex size-11 items-center justify-center disabled:opacity-40" disabled={item.qty >= Math.min(10, product.stock)} onClick={() => updateCart(item.id, item.qty + 1)} aria-label="+1">
                                  <Plus className="size-5" aria-hidden />
                                </button>
                              </div>
                              <button type="button" onClick={() => removeFromCart([item.id])} className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-danger active:bg-red-50">
                                <Trash2 className="size-4" aria-hidden />
                                {t("remove")}
                              </button>
                            </div>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                  <p className="flex justify-between border-t border-line px-1 pt-2 font-semibold">
                    <span>{t("subtotal")}</span>
                    <span>{rupees(g.totalPaise)}</span>
                  </p>
                </motion.section>
              ))}
            </AnimatePresence>
            {unavailable.length ? (
              <div className="mb-4 flex items-center justify-between rounded-2xl bg-red-50 p-3 text-danger dark:bg-red-950/40">
                <span>
                  {unavailable.length} × {t("unavailable")}
                </span>
                <Button variant="danger" size="sm" onClick={() => removeFromCart(unavailable.map((u) => u.id))}>
                  <Trash2 aria-hidden />
                  {t("remove")}
                </Button>
              </div>
            ) : null}
          </div>
          {/* desktop: sticky order summary */}
          <aside className="sticky top-24 hidden rounded-[var(--radius-card)] bg-paper p-5 shadow-soft lg:block">
            <h2 className="text-lg">{t("total")}</h2>
            <ul className="mt-3 grid gap-2 text-[15px]">
              {groups.map((g) => (
                <li key={g.shop.id} className="flex justify-between gap-2">
                  <span className="truncate text-ink-soft">{g.shop.name}</span>
                  <span className="font-semibold">{rupees(g.totalPaise)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex justify-between border-t border-line pt-3 font-display text-2xl font-bold">
              <span>{t("total")}</span>
              <span>{rupees(total)}</span>
            </p>
            <Button size="lg" block className="mt-4" onClick={() => router.push(profile ? "/checkout" : "/login?next=/checkout")}>
              {t("checkout")}
              <ArrowRight aria-hidden />
            </Button>
            <p className="mt-3 text-center text-sm text-ink-soft">{t("separate")}</p>
          </aside>
          </div>
        )}
      </main>

      {groups?.length ? (
        <div className="fixed-bar z-20 px-4 pb-2 lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-[22px] bg-paper p-2 pl-4 shadow-warm">
            <div>
              <p className="text-sm text-ink-soft">{t("total")}</p>
              <p className="font-display text-xl font-bold">{rupees(total)}</p>
            </div>
            <Button size="lg" className="ml-auto" onClick={() => router.push(profile ? "/checkout" : "/login?next=/checkout")}>
              {t("checkout")}
              <ArrowRight aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
