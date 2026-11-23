"use client";
import { m as motion } from "framer-motion";
import { Banknote, CreditCard, Home, ListChecks, Lock, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppHeader, RequireAuth } from "@/components/app-chrome";
import { useMarketState } from "@/components/market-state";
import { useAuthed } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { DrawnCheck, useCelebrate } from "@/components/ui/celebration";
import { SmartImage } from "@/components/ui/smart-image";
import type { Address, Order } from "@/lib/market/types";
import { cn, rupees } from "@/lib/utils";
import { useCartGroups } from "@/components/market/use-cart-groups";

const input = "min-h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-lg outline-none focus:border-accent";

function Placed({ orders }: { orders: Order[] }) {
  const t = useTranslations("checkout");
  useCelebrate();
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <DrawnCheck />
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-4 font-display text-3xl">
        {t("placedTitle")}
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="mt-2 text-xl font-semibold text-accent-strong">
        {orders.length === 1 ? t("placedTo", { shop: orders[0].shopName }) : t("placedToMany", { n: orders.length })}
      </motion.p>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-2 text-ink-soft">
        {t("placedBody")}
      </motion.p>
      <div className="mt-8 grid w-full gap-3">
        <Button asChild size="lg">
          <Link href={orders.length === 1 ? `/account/orders/${orders[0].id}` : "/account/orders"}>
            <ListChecks aria-hidden />
            {t("track")}
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/market">{t("continue")}</Link>
        </Button>
      </div>
    </main>
  );
}

function CheckoutInner() {
  const t = useTranslations("checkout");
  const tcart = useTranslations("cart");
  const router = useRouter();
  const { market, profile } = useAuthed();
  const { removeFromCart } = useMarketState();
  const { groups } = useCartGroups();
  const [name, setName] = useState(profile.name || profile.shopName || "");
  const [phone, setPhone] = useState((profile.phone ?? "").replace(/\D/g, "").slice(-10));
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrId, setAddrId] = useState<string | "new">("new");
  const [addr, setAddr] = useState({ line1: "", city: profile.city ?? "", pincode: "" });
  const [modes, setModes] = useState<Record<string, "delivery" | "pickup">>({});
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<Order[] | null>(null);
  // the cart empties while orders are placed — don't treat that as "nothing to check out"
  const placing = useRef(false);

  useEffect(() => {
    market.listAddresses(profile.id).then((list) => {
      setAddresses(list);
      const d = list.find((a) => a.isDefault) ?? list[0];
      if (d) setAddrId(d.id);
    });
  }, [market, profile.id]);

  useEffect(() => {
    if (groups && !groups.length && !placed && !placing.current) router.replace("/cart");
  }, [groups, placed, router]);

  if (placed) return <Placed orders={placed} />;

  const modeFor = (shopId: string, delivery: string) => (delivery === "both" ? (modes[shopId] ?? "delivery") : (delivery as "delivery" | "pickup"));
  const needsAddress = (groups ?? []).some((g) => modeFor(g.shop.id, g.shop.delivery) === "delivery");
  const total = (groups ?? []).reduce((s, g) => s + g.totalPaise, 0);

  const place = async () => {
    if (!groups) return;
    if (!name.trim()) return toast.error(t("needName"));
    if (phone.replace(/\D/g, "").length < 10) return toast.error(t("needPhone"));
    let address: Order["address"] = null;
    if (needsAddress) {
      const saved = addresses.find((a) => a.id === addrId);
      if (saved) address = { name: saved.name, phone: saved.phone, line1: saved.line1, city: saved.city, pincode: saved.pincode };
      else {
        if (!addr.line1.trim() || !addr.city.trim() || !/^\d{6}$/.test(addr.pincode)) return toast.error(t("needAddress"));
        address = { name: name.trim(), phone, ...addr };
        await market.saveAddress(profile.id, { ...address, isDefault: !addresses.length });
      }
    }
    setBusy(true);
    placing.current = true;
    const done: Order[] = [];
    try {
      for (const g of groups) {
        const mode = modeFor(g.shop.id, g.shop.delivery);
        const order = await market.placeOrder(profile.id, {
          shopId: g.shop.id,
          items: g.lines.map((l) => ({ productId: l.product.id, size: l.item.size, qty: l.item.qty })),
          deliveryType: mode,
          address: mode === "delivery" ? address : null,
          buyerName: name.trim(),
          buyerPhone: phone,
          paymentMethod: mode === "delivery" ? "cod" : "pay_at_shop",
        });
        done.push(order);
        await removeFromCart(g.lines.map((l) => l.item.id));
      }
      window.scrollTo({ top: 0 });
      setPlaced(done);
    } catch (e) {
      const msg = (e as Error).message;
      const failed = groups[done.length];
      toast.error(msg === "OUT_OF_STOCK" || msg === "PRODUCT_UNAVAILABLE" ? t("outOfStock", { title: failed?.lines[0]?.product.title ?? "" }) : msg);
      if (done.length) setPlaced(done);
      else placing.current = false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppHeader title={t("title")} back="/cart" />
      <main className="mx-auto max-w-6xl px-4 pb-40 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8 lg:px-6 lg:pb-10">
        <div>
        <section className="rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
          <h2 className="mb-3 text-lg">{t("contact")}</h2>
          <div className="grid gap-3">
            <label className="grid gap-1 font-semibold">
              {t("name")}
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            <label className="grid gap-1 font-semibold">
              {t("phone")}
              <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" maxLength={14} />
            </label>
          </div>
        </section>

        {(groups ?? []).map((g) => {
          const mode = modeFor(g.shop.id, g.shop.delivery);
          return (
            <section key={g.shop.id} className="mt-4 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
              <h2 className="mb-1 flex items-center gap-2 text-lg">
                <Store className="size-5 text-accent-strong" aria-hidden />
                {g.shop.name}
              </h2>
              <p className="mb-3 text-sm text-ink-soft">
                {g.lines.map((l) => `${l.product.title} × ${l.item.qty}`).join(", ")} · <b>{rupees(g.totalPaise)}</b>
              </p>
              <p className="mb-2 font-semibold">{t("delivery")}</p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("delivery")}>
                {(["delivery", "pickup"] as const).map((m) => {
                  const allowed = g.shop.delivery === "both" || g.shop.delivery === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={mode === m}
                      disabled={!allowed}
                      onClick={() => setModes((x) => ({ ...x, [g.shop.id]: m }))}
                      className={cn(
                        "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-[15px] font-semibold transition active:scale-95 disabled:opacity-40",
                        mode === m ? "border-accent bg-accent-soft" : "border-line",
                      )}
                    >
                      {m === "delivery" ? <Home className="size-5" aria-hidden /> : <Store className="size-5" aria-hidden />}
                      {m === "delivery" ? t("homeDelivery") : t("pickup")}
                    </button>
                  );
                })}
              </div>
              {g.shop.delivery !== "both" ? <p className="mt-2 text-sm text-ink-soft">{g.shop.delivery === "pickup" ? t("onlyPickup") : t("onlyDelivery")}</p> : null}
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-saffron-50 px-3 py-2 text-[15px]">
                <Banknote className="size-5 text-leaf" aria-hidden />
                {t("payment")}: <b>{mode === "delivery" ? t("cod") : t("payAtShop")}</b>
              </p>
            </section>
          );
        })}

        {needsAddress ? (
          <section className="mt-4 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
            <h2 className="mb-3 text-lg">{t("address")}</h2>
            {addresses.length ? (
              <div className="mb-3 grid gap-2" role="radiogroup" aria-label={t("savedAddresses")}>
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={addrId === a.id}
                    onClick={() => setAddrId(a.id)}
                    className={cn("rounded-2xl border-2 p-3 text-left transition active:scale-[0.98]", addrId === a.id ? "border-accent bg-accent-soft" : "border-line")}
                  >
                    <p className="font-semibold">{a.name}</p>
                    <p className="text-sm text-ink-soft">
                      {a.line1}, {a.city} – {a.pincode}
                    </p>
                  </button>
                ))}
                <button type="button" role="radio" aria-checked={addrId === "new"} onClick={() => setAddrId("new")} className={cn("min-h-12 rounded-2xl border-2 px-3 text-left font-semibold", addrId === "new" ? "border-accent bg-accent-soft" : "border-line")}>
                  + {t("newAddress")}
                </button>
              </div>
            ) : null}
            {addrId === "new" ? (
              <div className="grid gap-3">
                <label className="grid gap-1 font-semibold">
                  {t("line1")}
                  <input className={input} value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} autoComplete="street-address" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1 font-semibold">
                    {t("city")}
                    <input className={input} value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} autoComplete="address-level2" />
                  </label>
                  <label className="grid gap-1 font-semibold">
                    {t("pincode")}
                    <input className={input} value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} inputMode="numeric" autoComplete="postal-code" />
                  </label>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="mt-4 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
          <h2 className="mb-3 text-lg">{t("payment")}</h2>
          <div className="grid gap-2">
            <div className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-accent bg-accent-soft px-3 font-semibold">
              <Banknote className="size-6 text-leaf" aria-hidden />
              {t("cod")} / {t("payAtShop")}
            </div>
            <div className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-dashed border-line px-3 text-ink-soft" aria-disabled="true">
              <CreditCard className="size-6" aria-hidden />
              {t("online")}
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-line px-2 py-0.5 text-xs font-bold">
                <Lock className="size-3" aria-hidden />
                {t("comingSoon")}
              </span>
            </div>
          </div>
        </section>
        </div>

        {/* desktop: sticky summary with the place-order button */}
        <aside className="sticky top-24 hidden rounded-[var(--radius-card)] bg-paper p-5 shadow-soft lg:block">
          <h2 className="text-lg">{t("title")}</h2>
          <ul className="mt-3 grid gap-3">
            {(groups ?? []).flatMap((g) =>
              g.lines.map((l) => (
                <li key={l.item.id} className="flex items-center gap-3 text-[15px]">
                  <span className="relative aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-lg bg-saffron-50">
                    <SmartImage src={l.product.images[0]} alt="" sizes="48px" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {l.product.title} × {l.item.qty}
                  </span>
                  <span className="font-semibold">{rupees(l.product.pricePaise * l.item.qty)}</span>
                </li>
              )),
            )}
          </ul>
          <p className="mt-4 flex justify-between border-t border-line pt-3 font-display text-2xl font-bold">
            <span>{tcart("total")}</span>
            <span>{rupees(total)}</span>
          </p>
          <Button size="lg" block className="mt-4" loading={busy} disabled={!groups?.length} onClick={place}>
            {busy ? t("placing") : (groups?.length ?? 0) > 1 ? t("placeN", { n: groups!.length, total: rupees(total) }) : t("place", { total: rupees(total) })}
          </Button>
        </aside>
      </main>

      <div className="fixed-bar z-20 px-4 pb-2 lg:hidden">
        <div className="mx-auto max-w-xl">
          <Button size="lg" block loading={busy} disabled={!groups?.length} onClick={place}>
            {busy ? t("placing") : (groups?.length ?? 0) > 1 ? t("placeN", { n: groups!.length, total: rupees(total) }) : t("place", { total: rupees(total) })}
          </Button>
        </div>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutInner />
    </RequireAuth>
  );
}
