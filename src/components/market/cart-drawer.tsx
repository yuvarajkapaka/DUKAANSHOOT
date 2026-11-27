"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, m as motion } from "framer-motion";
import { DUR, EASE, scrim, spring } from "@/lib/motion";
import { ArrowRight, ShoppingBag, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarketState } from "../market-state";
import { useSession } from "../providers";
import { Button } from "../ui/button";
import { SmartImage } from "../ui/smart-image";
import { rupees } from "@/lib/utils";
import { useCartGroups } from "./use-cart-groups";

/** Desktop: the cart slides in from the right instead of leaving the page. */
export function CartDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("cart");
  const tc = useTranslations("common");
  const router = useRouter();
  const { profile } = useSession();
  const { removeFromCart } = useMarketState();
  const { groups } = useCartGroups();
  const total = (groups ?? []).reduce((s, g) => s + g.totalPaise, 0);
  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-night/40" variants={scrim} initial="hidden" animate="show" exit="exit" />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.aside
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-cream shadow-2xl outline-none"
                initial={{ x: "100%" }}
                animate={{ x: 0, transition: spring.snappy }}
                exit={{ x: "100%", transition: { duration: DUR.normal, ease: EASE.in } }}
              >
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <Dialog.Title className="flex items-center gap-2 font-display text-xl">
                    <ShoppingBag className="size-6 text-accent-strong" aria-hidden />
                    {t("title")}
                  </Dialog.Title>
                  <Dialog.Description className="sr-only">{t("separate")}</Dialog.Description>
                  <Dialog.Close className="inline-flex size-11 items-center justify-center rounded-full hover:bg-accent-soft" aria-label={tc("close")}>
                    <X className="size-6" aria-hidden />
                  </Dialog.Close>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {!groups ? (
                    <div className="skeleton h-32 rounded-2xl" />
                  ) : !groups.length ? (
                    <p className="py-10 text-center text-ink-soft">{t("empty")}</p>
                  ) : (
                    groups.map((g) => (
                      <section key={g.shop.id} className="mb-4">
                        <h3 className="mb-2 font-semibold">{t("fromShop", { shop: g.shop.name })}</h3>
                        <ul className="grid gap-3">
                          {g.lines.map(({ item, product }) => (
                            <li key={item.id} className="flex gap-3 rounded-2xl bg-paper p-2 shadow-soft">
                              <span className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-xl bg-saffron-50">
                                <SmartImage src={product.images[0]} alt="" sizes="64px" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 text-[15px] font-medium">{product.title}</span>
                                <span className="text-sm text-ink-soft">
                                  {item.size} × {item.qty}
                                </span>
                                <span className="block font-bold">{rupees(product.pricePaise * item.qty)}</span>
                              </span>
                              <button type="button" onClick={() => removeFromCart([item.id])} className="self-start rounded-full p-2 text-danger hover:bg-red-50" aria-label={t("remove")} title={t("remove")}>
                                <Trash2 className="size-5" aria-hidden />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))
                  )}
                </div>
                {groups?.length ? (
                  <div className="safe-bottom grid gap-2 border-t border-line px-5 pt-4">
                    <p className="flex justify-between font-display text-xl font-bold">
                      <span>{t("total")}</span>
                      <span>{rupees(total)}</span>
                    </p>
                    <Button size="lg" onClick={() => go(profile ? "/checkout" : "/login?next=/checkout")}>
                      {t("checkout")}
                      <ArrowRight aria-hidden />
                    </Button>
                    <Button asChild variant="ghost">
                      <Link href="/cart" onClick={() => onOpenChange(false)}>
                        {t("title")} →
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
