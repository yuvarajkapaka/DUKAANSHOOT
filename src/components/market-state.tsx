"use client";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { playDing, flyToCart } from "@/lib/client/effects";
import type { CartItem, MarketEvent } from "@/lib/market/types";
import { useSession } from "./providers";

interface MarketState {
  cart: CartItem[];
  /** false until the saved cart has been read (so "empty" isn't assumed too early) */
  cartReady: boolean;
  cartCount: number;
  addToCart: (productId: string, size: string, qty?: number, fromImage?: HTMLElement | null) => Promise<void>;
  updateCart: (id: string, qty: number) => Promise<void>;
  removeFromCart: (ids: string[]) => Promise<void>;
  wishlist: Set<string>;
  /** returns null when the user must log in first (we redirect them) */
  toggleWishlist: (productId: string) => Promise<boolean | null>;
  unread: number;
  refreshNotifications: () => void;
  /** last realtime order event for the seller's shop (drives the "new order" card animation) */
  lastOrderEvent: MarketEvent | null;
  myShopId: string | null;
}

const Ctx = createContext<MarketState | null>(null);
export function useMarketState() {
  const c = useContext(Ctx);
  if (!c) throw new Error("MarketState missing");
  return c;
}

/** Re-runs `load` whenever the marketplace changes (in this tab, another tab, or — in cloud mode — another phone). */
export function useMarketQuery<T>(load: () => Promise<T>, deps: unknown[], types: MarketEvent["type"][] = ["products", "orders"]) {
  const { market } = useSession();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;
  const run = useCallback(() => {
    loadRef
      .current()
      .then((d) => {
        setData(d);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);
  useEffect(() => {
    run();
    return market.subscribe((e) => types.includes(e.type) && run());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, run, ...deps]);
  return { data, error, reload: run };
}

export function MarketStateProvider({ children }: { children: React.ReactNode }) {
  const { market, profile, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("notify");
  const userId = profile?.id ?? "guest";
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [unread, setUnread] = useState(0);
  const [lastOrderEvent, setLastOrderEvent] = useState<MarketEvent | null>(null);
  const [myShopId, setMyShopId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // load + merge a guest cart into the account cart after login
  useEffect(() => {
    if (status === "loading") return;
    (async () => {
      let items = await market.getCart(userId);
      if (userId !== "guest") {
        const guest = await market.getCart("guest");
        if (guest.length) {
          items = [...items, ...guest.filter((g) => !items.some((i) => i.productId === g.productId && i.size === g.size))];
          await market.setCart(userId, items);
          await market.setCart("guest", []);
        }
        setWishlist(new Set(await market.getWishlist(userId)));
      } else setWishlist(new Set());
      setCart(items);
      setCartReady(true);
    })().catch(() => setCartReady(true));
  }, [market, userId, status]);

  useEffect(() => {
    if (!profile) {
      setUnread(0);
      setMyShopId(null);
      return;
    }
    market
      .listNotifications(profile.id)
      .then((n) => setUnread(n.filter((x) => !x.read).length))
      .catch(() => {});
    if (profile.role === "seller") market.getMyShop(profile.id).then((s) => setMyShopId(s?.id ?? null)).catch(() => {});
  }, [market, profile, tick]);

  // realtime
  useEffect(() => {
    return market.subscribe((e) => {
      if (e.type === "cart" && e.userId === userId) void market.getCart(userId).then(setCart);
      if (e.type === "wishlist" && e.userId === userId) void market.getWishlist(userId).then((w) => setWishlist(new Set(w)));
      if (e.type === "notifications" && profile && e.userId === profile.id) setTick((x) => x + 1);
      if (e.type === "orders") {
        if (myShopId && e.shopId === myShopId) {
          setLastOrderEvent(e);
          if (e.kind === "new") {
            playDing();
            if (!pathname.startsWith("/seller/orders")) {
              toast(t("newOrder"), { description: t("newOrderBody"), action: { label: t("open"), onClick: () => router.push(`/seller/orders/${e.orderId}`) }, duration: 8000 });
            }
          }
        }
        if (profile && e.buyerId === profile.id && e.kind === "status") setTick((x) => x + 1);
      }
    });
  }, [market, userId, profile, myShopId, pathname, router, t]);

  const value = useMemo<MarketState>(
    () => ({
      cart,
      cartReady,
      cartCount: cart.reduce((s, i) => s + i.qty, 0),
      addToCart: async (productId, size, qty = 1, fromImage) => {
        const existing = cart.find((i) => i.productId === productId && i.size === size);
        const next = existing
          ? cart.map((i) => (i === existing ? { ...i, qty: Math.min(10, i.qty + qty) } : i))
          : [...cart, { id: crypto.randomUUID(), productId, size, qty }];
        setCart(next);
        if (fromImage) flyToCart(fromImage);
        await market.setCart(userId, next);
      },
      updateCart: async (id, qty) => {
        const next = cart.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(10, qty)) } : i));
        setCart(next);
        await market.setCart(userId, next);
      },
      removeFromCart: async (ids) => {
        const next = cart.filter((i) => !ids.includes(i.id));
        setCart(next);
        await market.setCart(userId, next);
      },
      wishlist,
      toggleWishlist: async (productId) => {
        if (!profile) {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
          return null;
        }
        const on = !wishlist.has(productId);
        setWishlist((w) => {
          const n = new Set(w);
          if (on) n.add(productId);
          else n.delete(productId);
          return n;
        });
        await market.toggleWishlist(profile.id, productId);
        return on;
      },
      unread,
      refreshNotifications: () => setTick((x) => x + 1),
      lastOrderEvent,
      myShopId,
    }),
    [cart, cartReady, wishlist, unread, lastOrderEvent, myShopId, market, userId, profile, router, pathname],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
