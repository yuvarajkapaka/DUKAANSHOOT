"use client";
import { createStore, get, set, type UseStore } from "idb-keyval";
import { resizeBlob } from "../client/image";
import { storeImageBlob } from "../client/image-ref";
import { DEMO_BUYER_ID, SEED_PRODUCTS, SEED_SHOPS, shopLogoUrl } from "../art/market-seed";
import { seedToProduct } from "./seed-product";
import {
  ACTIVE_STATUSES,
  nextStatus,
  slugify,
  type Address,
  type CartItem,
  type MarketEvent,
  type MarketStore,
  type NewProduct,
  type Notification,
  type Order,
  type OrderStatus,
  type PlaceOrderInput,
  type Product,
  type ProductQuery,
  type Shop,
} from "./types";

const SEED_VERSION = "2";
const CHANNEL = "dukaanshoot-market";

let store: UseStore | null = null;
const db = () => (store ??= createStore("dukaanshoot", "kv"));
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const orderCode = () => "DS-" + Math.floor(1000 + Math.random() * 9000);

/* --------------------------------------------------------------- realtime */
type Listener = (e: MarketEvent) => void;
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;
function getChannel() {
  if (channel || typeof BroadcastChannel === "undefined") return channel;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (m) => listeners.forEach((l) => l(m.data as MarketEvent));
  return channel;
}
function emit(e: MarketEvent) {
  listeners.forEach((l) => l(e));
  getChannel()?.postMessage(e);
}

/* serialise writes inside this tab so read-modify-write never interleaves */
let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function read<T>(key: string, fallback: T): Promise<T> {
  return (await get<T>(key, db())) ?? fallback;
}

/* ------------------------------------------------------------------- seed */
let seeding: Promise<void> | null = null;
function ensureSeed(): Promise<void> {
  return (seeding ??= (async () => {
    if ((await get("m:v", db())) === SEED_VERSION) return;
    const shops: Shop[] = SEED_SHOPS.map((s, i) => ({
      id: s.id,
      ownerId: s.ownerId,
      slug: s.slug,
      name: s.name,
      city: s.city,
      whatsapp: s.whatsapp,
      delivery: s.delivery,
      shopType: s.shopType,
      logo: shopLogoUrl(s.id),
      createdAt: ago(24 * (60 + i * 30)),
    }));
    const products: Product[] = SEED_PRODUCTS.map((p) => seedToProduct(p, ago(p.ageHours)));
    const prod = (id: string) => products.find((p) => p.id === id)!;
    const item = (id: string, size: string, qty = 1) => {
      const p = prod(id);
      return { id: uid(), productId: id, title: p.title, pricePaise: p.pricePaise, size, qty, image: p.images[0] };
    };
    const hist = (steps: OrderStatus[], startH: number, by: string) => steps.map((status, i) => ({ status, at: ago(startH - i * 3), by: i === 0 ? by : "seller" }));
    const addr = { name: "Priya Reddy", phone: "9123456780", line1: "Flat 302, Sri Sai Residency, Madhapur", city: "Hyderabad", pincode: "500081" };
    const mk = (o: Omit<Order, "id" | "code" | "totalPaise" | "updatedAt" | "createdAt">): Order => ({
      ...o,
      id: uid(),
      code: orderCode(),
      totalPaise: o.items.reduce((s, i) => s + i.pricePaise * i.qty, 0),
      createdAt: o.history[0].at,
      updatedAt: o.history[o.history.length - 1].at,
    });
    const orders: Order[] = [
      mk({ buyerId: "buyer-anitha", buyerName: "Anitha K", buyerPhone: "9988776655", shopId: "shop-ramesh", shopName: "Ramesh Sarees", status: "new", deliveryType: "pickup", address: null, paymentMethod: "pay_at_shop", items: [item("p-teal-cotton", "Free size")], history: hist(["new"], 0.7, "buyer") }),
      mk({ buyerId: "buyer-kavya", buyerName: "Kavya M", buyerPhone: "9090909090", shopId: "shop-ramesh", shopName: "Ramesh Sarees", status: "accepted", deliveryType: "delivery", address: { name: "Kavya M", phone: "9090909090", line1: "12-4, Gandhi Nagar", city: "Hyderabad", pincode: "500080" }, paymentMethod: "cod", items: [item("p-maroon-bridal", "M")], history: hist(["new", "accepted"], 6, "buyer") }),
      mk({ buyerId: DEMO_BUYER_ID, buyerName: "Priya Reddy", buyerPhone: "9123456780", shopId: "shop-ramesh", shopName: "Ramesh Sarees", status: "shipped", deliveryType: "delivery", address: addr, paymentMethod: "cod", items: [item("p-red-kanjivaram", "Free size")], history: hist(["new", "accepted", "packed", "shipped"], 28, "buyer") }),
      mk({ buyerId: DEMO_BUYER_ID, buyerName: "Priya Reddy", buyerPhone: "9123456780", shopId: "shop-lakshmi", shopName: "Lakshmi Boutique", status: "delivered", deliveryType: "delivery", address: addr, paymentMethod: "cod", items: [item("p-pink-kurti", "M"), item("p-navy-kurti", "M")], history: hist(["new", "accepted", "packed", "shipped", "delivered"], 130, "buyer") }),
    ];
    const notifs: Notification[] = [
      { id: uid(), userId: "demo-seller", type: "order_new", title: `New order ${orders[0].code}`, body: "Anitha K · Teal cotton check saree", link: `/seller/orders/${orders[0].id}`, read: false, createdAt: orders[0].createdAt },
      { id: uid(), userId: DEMO_BUYER_ID, type: "order_status", title: `Order ${orders[2].code} shipped`, body: "Ramesh Sarees shipped your order", link: `/account/orders/${orders[2].id}`, read: false, createdAt: orders[2].updatedAt },
    ];
    await set("m:shops", shops, db());
    await set("m:products", products, db());
    await set("m:orders", orders, db());
    await set("m:notifs", notifs, db());
    await set(`m:wish:${DEMO_BUYER_ID}`, ["p-maroon-bridal", "p-yellow-anarkali"], db());
    await set(`m:addr:${DEMO_BUYER_ID}`, [{ id: uid(), ...addr, isDefault: true }], db());
    await set("m:v", SEED_VERSION, db());
  })());
}

/* --------------------------------------------------------------- helpers */
const SYNONYMS: Record<string, string[]> = {
  sarees: ["saree", "sari", "చీర", "साड़ी", "साडी"],
  kurtas: ["kurta", "kurti", "dress", "కుర్తా", "कुर्ता", "कुर्ती"],
  men: ["men", "shirt", "gents", "పురుష", "पुरुष", "शर्ट"],
  kids: ["kid", "child", "frock", "పిల్ల", "बच्च"],
  lehengas: ["lehenga", "langa", "లెహంగా", "लहंगा"],
  jewellery: ["jewel", "necklace", "నగ", "गहन"],
};

function matches(p: Product, shop: Shop | undefined, q: string) {
  const t = q.toLowerCase().trim();
  if (!t) return true;
  const hay = `${p.title} ${p.description} ${shop?.name ?? ""} ${shop?.city ?? ""} ${p.category}`.toLowerCase();
  if (t.split(/\s+/).every((w) => hay.includes(w))) return true;
  return Object.entries(SYNONYMS).some(([cat, words]) => cat === p.category && words.some((w) => t.includes(w.toLowerCase())));
}

function notify(list: Notification[], n: Omit<Notification, "id" | "read" | "createdAt">) {
  list.unshift({ ...n, id: uid(), read: false, createdAt: now() });
  return list.slice(0, 200);
}

/* ------------------------------------------------------------------ store */
export class LocalMarket implements MarketStore {
  readonly kind = "local" as const;

  private async shops() {
    await ensureSeed();
    return read<Shop[]>("m:shops", []);
  }
  private async products() {
    await ensureSeed();
    return read<Product[]>("m:products", []);
  }
  private async orders() {
    await ensureSeed();
    return read<Order[]>("m:orders", []);
  }

  async listShops(city?: string) {
    const shops = await this.shops();
    return city ? shops.filter((s) => s.city.toLowerCase() === city.toLowerCase()) : shops;
  }
  async getShopBySlug(slug: string) {
    return (await this.shops()).find((s) => s.slug === slug) ?? null;
  }
  async getShop(id: string) {
    return (await this.shops()).find((s) => s.id === id) ?? null;
  }
  async listCities() {
    return Array.from(new Set((await this.shops()).map((s) => s.city))).sort();
  }

  async listProducts(q: ProductQuery = {}) {
    const [products, shops] = await Promise.all([this.products(), this.shops()]);
    const byId = new Map(shops.map((s) => [s.id, s]));
    let out = products.filter((p) => p.status !== "hidden");
    if (q.shopId) out = out.filter((p) => p.shopId === q.shopId);
    if (q.category) out = out.filter((p) => p.category === q.category);
    if (q.city) out = out.filter((p) => byId.get(p.shopId)?.city.toLowerCase() === q.city!.toLowerCase());
    if (q.size) out = out.filter((p) => p.sizes.includes(q.size!));
    if (q.minPaise != null) out = out.filter((p) => p.pricePaise >= q.minPaise!);
    if (q.maxPaise != null) out = out.filter((p) => p.pricePaise <= q.maxPaise!);
    if (q.q) out = out.filter((p) => matches(p, byId.get(p.shopId), q.q!));
    out.sort((a, b) =>
      q.sort === "price_low" ? a.pricePaise - b.pricePaise : q.sort === "price_high" ? b.pricePaise - a.pricePaise : b.createdAt.localeCompare(a.createdAt),
    );
    return q.limit ? out.slice(0, q.limit) : out;
  }

  async getProduct(id: string) {
    return (await this.products()).find((p) => p.id === id) ?? null;
  }
  async getProductsByIds(ids: string[]) {
    const set = new Set(ids);
    return (await this.products()).filter((p) => set.has(p.id));
  }

  private bump(id: string, field: "views" | "waClicks") {
    return locked(async () => {
      const products = await this.products();
      await set("m:products", products.map((p) => (p.id === id ? { ...p, [field]: p[field] + 1 } : p)), db());
    });
  }
  trackView(productId: string) {
    return this.bump(productId, "views");
  }
  trackWhatsApp(productId: string) {
    return this.bump(productId, "waClicks");
  }

  /* ---------------------------------------------------------------- cart */
  async getCart(userId: string) {
    return read<CartItem[]>(`m:cart:${userId}`, []);
  }
  async setCart(userId: string, items: CartItem[]) {
    await set(`m:cart:${userId}`, items, db());
    emit({ type: "cart", userId });
  }

  /* --------------------------------------------------------------- buyer */
  async getWishlist(userId: string) {
    await ensureSeed();
    return read<string[]>(`m:wish:${userId}`, []);
  }
  async toggleWishlist(userId: string, productId: string) {
    return locked(async () => {
      const list = await this.getWishlist(userId);
      const on = !list.includes(productId);
      await set(`m:wish:${userId}`, on ? [productId, ...list] : list.filter((x) => x !== productId), db());
      emit({ type: "wishlist", userId });
      return on;
    });
  }

  async listAddresses(userId: string) {
    await ensureSeed();
    return read<Address[]>(`m:addr:${userId}`, []);
  }
  async saveAddress(userId: string, a: Omit<Address, "id"> & { id?: string }) {
    return locked(async () => {
      const list = await this.listAddresses(userId);
      const addr: Address = { ...a, id: a.id ?? uid() };
      let next = list.filter((x) => x.id !== addr.id);
      if (addr.isDefault || !next.length) next = next.map((x) => ({ ...x, isDefault: false }));
      next.unshift({ ...addr, isDefault: addr.isDefault || !list.length });
      await set(`m:addr:${userId}`, next, db());
      return addr;
    });
  }

  /** Atomic within this device: checks + reduces stock, writes order + seller notification. */
  async placeOrder(userId: string, input: PlaceOrderInput) {
    return locked(async () => {
      const [products, shops, orders] = await Promise.all([this.products(), this.shops(), this.orders()]);
      const shop = shops.find((s) => s.id === input.shopId);
      if (!shop) throw new Error("SHOP_NOT_FOUND");
      const items = input.items.map((it) => {
        const p = products.find((x) => x.id === it.productId);
        if (!p || p.shopId !== shop.id || p.status !== "active") throw new Error("PRODUCT_UNAVAILABLE");
        if (p.stock < it.qty) throw new Error("OUT_OF_STOCK");
        return { p, it };
      });
      for (const { p, it } of items) p.stock -= it.qty;
      const t = now();
      const order: Order = {
        id: uid(),
        code: orderCode(),
        buyerId: userId,
        buyerName: input.buyerName,
        buyerPhone: input.buyerPhone,
        shopId: shop.id,
        shopName: shop.name,
        status: "new",
        deliveryType: input.deliveryType,
        address: input.deliveryType === "delivery" ? input.address : null,
        paymentMethod: input.paymentMethod,
        items: items.map(({ p, it }) => ({ id: uid(), productId: p.id, title: p.title, pricePaise: p.pricePaise, size: it.size, qty: it.qty, image: p.images[0] })),
        totalPaise: items.reduce((s, { p, it }) => s + p.pricePaise * it.qty, 0),
        history: [{ status: "new", at: t, by: userId }],
        createdAt: t,
        updatedAt: t,
      };
      await set("m:products", products, db());
      await set("m:orders", [order, ...orders], db());
      const notifs = await read<Notification[]>("m:notifs", []);
      await set(
        "m:notifs",
        notify(notifs, { userId: shop.ownerId, type: "order_new", title: `New order ${order.code}`, body: `${order.buyerName} · ${order.items.map((i) => i.title).join(", ")}`, link: `/seller/orders/${order.id}` }),
        db(),
      );
      emit({ type: "orders", orderId: order.id, shopId: shop.id, buyerId: userId, kind: "new" });
      emit({ type: "notifications", userId: shop.ownerId });
      emit({ type: "products" });
      return order;
    });
  }

  async listMyOrders(userId: string) {
    return (await this.orders()).filter((o) => o.buyerId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getOrder(id: string) {
    return (await this.orders()).find((o) => o.id === id) ?? null;
  }

  private async changeOrder(orderId: string, actor: string, check: (o: Order, shop: Shop) => void, status: OrderStatus, reason?: string) {
    return locked(async () => {
      const [orders, shops, products] = await Promise.all([this.orders(), this.shops(), this.products()]);
      const o = orders.find((x) => x.id === orderId);
      if (!o) throw new Error("NOT_FOUND");
      const shop = shops.find((s) => s.id === o.shopId)!;
      check(o, shop);
      o.status = status;
      o.updatedAt = now();
      o.history.push({ status, at: o.updatedAt, by: actor });
      if (reason) o.cancelReason = reason;
      // stock comes back when an order is cancelled or rejected
      if (status === "cancelled" || status === "rejected") {
        for (const it of o.items) {
          const p = products.find((x) => x.id === it.productId);
          if (p) p.stock += it.qty;
        }
        await set("m:products", products, db());
      }
      await set("m:orders", orders, db());
      const notifs = await read<Notification[]>("m:notifs", []);
      const toSeller = status === "cancelled";
      await set(
        "m:notifs",
        notify(notifs, {
          userId: toSeller ? shop.ownerId : o.buyerId,
          type: toSeller ? "order_cancelled" : "order_status",
          title: `${o.code}: ${status}`,
          body: toSeller ? `${o.buyerName} cancelled${reason ? ` — ${reason}` : ""}` : `${shop.name}${reason ? ` — ${reason}` : ""}`,
          link: toSeller ? `/seller/orders/${o.id}` : `/account/orders/${o.id}`,
        }),
        db(),
      );
      emit({ type: "orders", orderId: o.id, shopId: o.shopId, buyerId: o.buyerId, kind: "status" });
      emit({ type: "notifications", userId: toSeller ? shop.ownerId : o.buyerId });
      if (status === "cancelled" || status === "rejected") emit({ type: "products" });
      return o;
    });
  }

  cancelOrder(userId: string, orderId: string, reason: string) {
    return this.changeOrder(
      orderId,
      userId,
      (o) => {
        if (o.buyerId !== userId) throw new Error("FORBIDDEN");
        if (o.status !== "new") throw new Error("TOO_LATE");
      },
      "cancelled",
      reason,
    );
  }

  setOrderStatus(userId: string, orderId: string, status: OrderStatus, reason?: string) {
    return this.changeOrder(
      orderId,
      "seller",
      (o, shop) => {
        if (shop.ownerId !== userId) throw new Error("FORBIDDEN");
        const ok = status === "rejected" ? ["new", "accepted", "packed"].includes(o.status) : nextStatus(o) === status;
        if (!ok || !ACTIVE_STATUSES.includes(o.status)) throw new Error("BAD_STATUS");
      },
      status,
      reason,
    );
  }

  /* -------------------------------------------------------------- seller */
  async getMyShop(userId: string) {
    return (await this.shops()).find((s) => s.ownerId === userId) ?? null;
  }

  async isSlugFree(slug: string, exceptShopId?: string) {
    return !(await this.shops()).some((s) => s.slug === slug && s.id !== exceptShopId);
  }

  async saveShop(userId: string, patch: Partial<Omit<Shop, "id" | "ownerId" | "createdAt">>) {
    return locked(async () => {
      const shops = await this.shops();
      let shop = shops.find((s) => s.ownerId === userId);
      const wantSlug = patch.slug ? slugify(patch.slug) : undefined;
      if (!shop) {
        let slug = wantSlug || slugify(patch.name ?? "my-shop");
        while (shops.some((s) => s.slug === slug)) slug = `${slug}-${Math.floor(Math.random() * 90 + 10)}`;
        shop = {
          id: "shop-" + uid().slice(0, 8),
          ownerId: userId,
          slug,
          name: patch.name ?? "My Shop",
          city: patch.city ?? "Hyderabad",
          whatsapp: patch.whatsapp ?? "",
          delivery: patch.delivery ?? "both",
          shopType: patch.shopType ?? "sarees",
          logo: patch.logo ?? null,
          createdAt: now(),
        };
        shops.push(shop);
      } else {
        if (wantSlug && shops.some((s) => s.slug === wantSlug && s.id !== shop!.id)) throw new Error("SLUG_TAKEN");
        Object.assign(shop, patch, wantSlug ? { slug: wantSlug } : {});
      }
      await set("m:shops", shops, db());
      emit({ type: "products" });
      return shop;
    });
  }

  async listShopProducts(shopId: string) {
    return (await this.products()).filter((p) => p.shopId === shopId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async uploadProductImage(_userId: string, blob: Blob) {
    return storeImageBlob(await resizeBlob(blob, 1000, 0.85)); // medium size is plenty for product pages
  }

  async createProduct(userId: string, p: NewProduct) {
    const shop = await this.getMyShop(userId);
    if (!shop) throw new Error("NO_SHOP");
    return locked(async () => {
      const products = await this.products();
      const product: Product = { ...p, id: "p-" + uid().slice(0, 12), shopId: shop.id, status: "active", views: 0, waClicks: 0, createdAt: now() };
      await set("m:products", [product, ...products], db());
      emit({ type: "products", productId: product.id });
      return product;
    });
  }

  async updateProduct(userId: string, id: string, patch: Partial<NewProduct & { status: Product["status"] }>) {
    const shop = await this.getMyShop(userId);
    return locked(async () => {
      const products = await this.products();
      const p = products.find((x) => x.id === id);
      if (!p || !shop || p.shopId !== shop.id) throw new Error("FORBIDDEN");
      Object.assign(p, patch);
      await set("m:products", products, db());
      emit({ type: "products", productId: id });
      return p;
    });
  }

  async deleteProduct(userId: string, id: string) {
    const shop = await this.getMyShop(userId);
    await locked(async () => {
      const products = await this.products();
      const p = products.find((x) => x.id === id);
      if (!p || !shop || p.shopId !== shop.id) throw new Error("FORBIDDEN");
      await set("m:products", products.filter((x) => x.id !== id), db());
      emit({ type: "products", productId: id });
    });
  }

  async listShopOrders(shopId: string) {
    return (await this.orders()).filter((o) => o.shopId === shopId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /* -------------------------------------------------------- notifications */
  async listNotifications(userId: string) {
    await ensureSeed();
    return (await read<Notification[]>("m:notifs", [])).filter((n) => n.userId === userId);
  }
  async markNotificationsRead(userId: string) {
    await locked(async () => {
      const all = await read<Notification[]>("m:notifs", []);
      await set("m:notifs", all.map((n) => (n.userId === userId ? { ...n, read: true } : n)), db());
    });
    emit({ type: "notifications", userId });
  }

  subscribe(cb: (e: MarketEvent) => void) {
    getChannel();
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }
}
