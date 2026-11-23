"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resizeBlob } from "../client/image";
import { slugify } from "./types";
import type {
  Address,
  CartItem,
  MarketEvent,
  MarketStore,
  NewProduct,
  Notification,
  Order,
  OrderStatus,
  PlaceOrderInput,
  Product,
  ProductQuery,
  Shop,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const toShop = (r: any): Shop => ({
  id: r.id,
  ownerId: r.owner_id,
  slug: r.slug,
  name: r.name,
  city: r.city,
  whatsapp: r.whatsapp,
  delivery: r.delivery,
  shopType: r.shop_type,
  logo: r.logo,
  createdAt: r.created_at,
});
const toProduct = (r: any): Product => ({
  id: r.id,
  shopId: r.shop_id,
  title: r.title,
  description: r.description,
  category: r.category,
  pricePaise: r.price_paise,
  mrpPaise: r.mrp_paise,
  sizes: r.sizes ?? [],
  stock: r.stock,
  status: r.status,
  images: ((r.product_images ?? []) as { url: string; position: number }[]).sort((a, b) => a.position - b.position).map((i) => i.url),
  beforeImage: r.before_image,
  views: r.views,
  waClicks: r.wa_clicks,
  createdAt: r.created_at,
});
const toOrder = (r: any): Order => ({
  id: r.id,
  code: r.code,
  buyerId: r.buyer_id,
  buyerName: r.buyer_name,
  buyerPhone: r.buyer_phone,
  shopId: r.shop_id,
  shopName: r.shops?.name ?? "",
  status: r.status,
  deliveryType: r.delivery_type,
  address: r.address,
  totalPaise: r.total_paise,
  paymentMethod: r.payment_method,
  cancelReason: r.cancel_reason,
  items: (r.order_items ?? []).map((i: any) => ({ id: i.id, productId: i.product_id, title: i.title_snapshot, pricePaise: i.price_paise_snapshot, size: i.size, qty: i.qty, image: i.image_path })),
  history: ((r.order_status_history ?? []) as any[]).sort((a, b) => a.created_at.localeCompare(b.created_at)).map((h) => ({ status: h.status as OrderStatus, at: h.created_at, by: h.changed_by ?? "" })),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const PRODUCT_SELECT = "*, product_images(url, position)";
const ORDER_SELECT = "*, shops(name), order_items(*), order_status_history(*)";
const GUEST_CART = "ds_guest_cart";

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Supabase marketplace. RLS + Postgres functions enforce who can do what. */
export class CloudMarket implements MarketStore {
  readonly kind = "cloud" as const;
  private listeners = new Set<(e: MarketEvent) => void>();
  private channel: ReturnType<SupabaseClient["channel"]> | null = null;

  constructor(private readonly sb: SupabaseClient) {}

  private emit(e: MarketEvent) {
    this.listeners.forEach((l) => l(e));
  }

  /* ------------------------------------------------------------- public */
  async listShops(city?: string) {
    let q = this.sb.from("shops").select("*").order("created_at");
    if (city) q = q.ilike("city", city);
    return must(await q).map(toShop);
  }
  async getShopBySlug(slug: string) {
    const r = must(await this.sb.from("shops").select("*").eq("slug", slug).maybeSingle());
    return r ? toShop(r) : null;
  }
  async getShop(id: string) {
    const r = must(await this.sb.from("shops").select("*").eq("id", id).maybeSingle());
    return r ? toShop(r) : null;
  }
  async listCities() {
    return Array.from(new Set(must(await this.sb.from("shops").select("city")).map((r: any) => r.city as string))).filter(Boolean).sort();
  }

  async listProducts(q: ProductQuery = {}) {
    let query = this.sb.from("products").select(q.city ? `${PRODUCT_SELECT}, shops!inner(city)` : PRODUCT_SELECT).neq("status", "hidden");
    if (q.shopId) query = query.eq("shop_id", q.shopId);
    if (q.category) query = query.eq("category", q.category);
    if (q.city) query = query.ilike("shops.city", q.city);
    if (q.size) query = query.contains("sizes", [q.size]);
    if (q.minPaise != null) query = query.gte("price_paise", q.minPaise);
    if (q.maxPaise != null) query = query.lte("price_paise", q.maxPaise);
    if (q.q) {
      const term = q.q.replace(/[%,()]/g, " ").trim();
      if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }
    query = q.sort === "price_low" ? query.order("price_paise") : q.sort === "price_high" ? query.order("price_paise", { ascending: false }) : query.order("created_at", { ascending: false });
    query = query.limit(q.limit ?? 120);
    return must(await query).map(toProduct);
  }
  async getProduct(id: string) {
    const r = must(await this.sb.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle());
    return r ? toProduct(r) : null;
  }
  async getProductsByIds(ids: string[]) {
    if (!ids.length) return [];
    return must(await this.sb.from("products").select(PRODUCT_SELECT).in("id", ids)).map(toProduct);
  }
  async trackView(productId: string) {
    await this.sb.rpc("track_product", { p_id: productId, p_field: "views" });
  }
  async trackWhatsApp(productId: string) {
    await this.sb.rpc("track_product", { p_id: productId, p_field: "wa" });
  }

  /* --------------------------------------------------------------- cart */
  async getCart(userId: string): Promise<CartItem[]> {
    if (userId === "guest") return JSON.parse(localStorage.getItem(GUEST_CART) || "[]");
    return must(await this.sb.from("cart_items").select("*").eq("user_id", userId)).map((r: any) => ({ id: r.id, productId: r.product_id, size: r.size, qty: r.qty }));
  }
  async setCart(userId: string, items: CartItem[]) {
    if (userId === "guest") localStorage.setItem(GUEST_CART, JSON.stringify(items));
    else {
      must(await this.sb.from("cart_items").delete().eq("user_id", userId));
      if (items.length) must(await this.sb.from("cart_items").insert(items.map((i) => ({ user_id: userId, product_id: i.productId, size: i.size, qty: i.qty }))));
    }
    this.emit({ type: "cart", userId });
  }

  /* -------------------------------------------------------------- buyer */
  async getWishlist(userId: string) {
    return must(await this.sb.from("wishlists").select("product_id").eq("user_id", userId).order("created_at", { ascending: false })).map((r: any) => r.product_id as string);
  }
  async toggleWishlist(userId: string, productId: string) {
    const existing = must(await this.sb.from("wishlists").select("product_id").eq("user_id", userId).eq("product_id", productId).maybeSingle());
    if (existing) must(await this.sb.from("wishlists").delete().eq("user_id", userId).eq("product_id", productId));
    else must(await this.sb.from("wishlists").insert({ user_id: userId, product_id: productId }));
    this.emit({ type: "wishlist", userId });
    return !existing;
  }
  async listAddresses(userId: string) {
    return must(await this.sb.from("addresses").select("*").eq("user_id", userId).order("is_default", { ascending: false })).map(
      (r: any): Address => ({ id: r.id, name: r.name, phone: r.phone, line1: r.line1, city: r.city, pincode: r.pincode, isDefault: r.is_default }),
    );
  }
  async saveAddress(userId: string, a: Omit<Address, "id"> & { id?: string }) {
    const row = { user_id: userId, name: a.name, phone: a.phone, line1: a.line1, city: a.city, pincode: a.pincode, is_default: a.isDefault };
    const r = must(await (a.id ? this.sb.from("addresses").update(row).eq("id", a.id) : this.sb.from("addresses").insert(row)).select("*").single()) as any;
    return { id: r.id, name: r.name, phone: r.phone, line1: r.line1, city: r.city, pincode: r.pincode, isDefault: r.is_default };
  }
  async placeOrder(_userId: string, input: PlaceOrderInput) {
    const { data, error } = await this.sb.rpc("place_order", {
      p_shop_id: input.shopId,
      p_items: input.items.map((i) => ({ product_id: i.productId, size: i.size, qty: i.qty })),
      p_delivery_type: input.deliveryType,
      p_address: input.address,
      p_buyer_name: input.buyerName,
      p_buyer_phone: input.buyerPhone,
      p_payment_method: input.paymentMethod,
    });
    if (error) throw new Error(/OUT_OF_STOCK|PRODUCT_UNAVAILABLE/.exec(error.message)?.[0] ?? error.message);
    return (await this.getOrder(data as string))!;
  }
  async listMyOrders(userId: string) {
    return must(await this.sb.from("orders").select(ORDER_SELECT).eq("buyer_id", userId).order("created_at", { ascending: false })).map(toOrder);
  }
  async getOrder(id: string) {
    const r = must(await this.sb.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle());
    return r ? toOrder(r) : null;
  }
  async cancelOrder(_userId: string, orderId: string, reason: string) {
    const { error } = await this.sb.rpc("cancel_order", { p_order_id: orderId, p_reason: reason });
    if (error) throw new Error(error.message);
    return (await this.getOrder(orderId))!;
  }

  /* ------------------------------------------------------------- seller */
  async getMyShop(userId: string) {
    const r = must(await this.sb.from("shops").select("*").eq("owner_id", userId).maybeSingle());
    return r ? toShop(r) : null;
  }
  async isSlugFree(slug: string, exceptShopId?: string) {
    let q = this.sb.from("shops").select("id").eq("slug", slug);
    if (exceptShopId) q = q.neq("id", exceptShopId);
    return !must(await q).length;
  }
  async saveShop(userId: string, s: Partial<Omit<Shop, "id" | "ownerId" | "createdAt">>) {
    const existing = await this.getMyShop(userId);
    const row: Record<string, unknown> = {};
    if (s.name !== undefined) row.name = s.name;
    if (s.city !== undefined) row.city = s.city;
    if (s.whatsapp !== undefined) row.whatsapp = s.whatsapp;
    if (s.delivery !== undefined) row.delivery = s.delivery;
    if (s.shopType !== undefined) row.shop_type = s.shopType;
    if (s.logo !== undefined) row.logo = s.logo;
    if (s.slug !== undefined) row.slug = slugify(s.slug);
    if (existing) return toShop(must(await this.sb.from("shops").update(row).eq("id", existing.id).select("*").single()));
    let slug = (row.slug as string) || slugify(s.name ?? "shop");
    if (slug.length < 2) slug = `shop-${userId.slice(0, 6)}`;
    while (!(await this.isSlugFree(slug))) slug = `${slug}-${Math.floor(Math.random() * 90 + 10)}`;
    return toShop(must(await this.sb.from("shops").insert({ ...row, slug, owner_id: userId, name: s.name ?? "My Shop" }).select("*").single()));
  }
  async listShopProducts(shopId: string) {
    return must(await this.sb.from("products").select(PRODUCT_SELECT).eq("shop_id", shopId).order("created_at", { ascending: false })).map(toProduct);
  }
  async uploadProductImage(userId: string, blob: Blob) {
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const medium = await resizeBlob(blob, 1000, 0.85);
    const { error } = await this.sb.storage.from("products").upload(path, medium, { contentType: "image/jpeg" });
    if (error) throw new Error(error.message);
    return this.sb.storage.from("products").getPublicUrl(path).data.publicUrl;
  }
  private async writeImages(productId: string, images: string[]) {
    must(await this.sb.from("product_images").delete().eq("product_id", productId));
    if (images.length) must(await this.sb.from("product_images").insert(images.map((url, position) => ({ product_id: productId, url, position }))));
  }
  async createProduct(userId: string, p: NewProduct) {
    const shop = await this.getMyShop(userId);
    if (!shop) throw new Error("NO_SHOP");
    const r = must(
      await this.sb
        .from("products")
        .insert({ shop_id: shop.id, title: p.title, description: p.description, category: p.category, price_paise: p.pricePaise, mrp_paise: p.mrpPaise ?? null, sizes: p.sizes, stock: p.stock, before_image: p.beforeImage ?? null })
        .select("id")
        .single(),
    ) as any;
    await this.writeImages(r.id, p.images);
    return (await this.getProduct(r.id))!;
  }
  async updateProduct(_userId: string, id: string, patch: Partial<NewProduct & { status: Product["status"] }>) {
    const row: Record<string, unknown> = {};
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.category !== undefined) row.category = patch.category;
    if (patch.pricePaise !== undefined) row.price_paise = patch.pricePaise;
    if (patch.mrpPaise !== undefined) row.mrp_paise = patch.mrpPaise;
    if (patch.sizes !== undefined) row.sizes = patch.sizes;
    if (patch.stock !== undefined) row.stock = patch.stock;
    if (patch.status !== undefined) row.status = patch.status;
    if (Object.keys(row).length) must(await this.sb.from("products").update(row).eq("id", id));
    if (patch.images) await this.writeImages(id, patch.images);
    return (await this.getProduct(id))!;
  }
  async deleteProduct(_userId: string, id: string) {
    must(await this.sb.from("products").delete().eq("id", id));
  }
  async listShopOrders(shopId: string) {
    return must(await this.sb.from("orders").select(ORDER_SELECT).eq("shop_id", shopId).order("created_at", { ascending: false })).map(toOrder);
  }
  async setOrderStatus(_userId: string, orderId: string, status: OrderStatus, reason?: string) {
    const { error } = await this.sb.rpc("set_order_status", { p_order_id: orderId, p_status: status, p_reason: reason ?? null });
    if (error) throw new Error(error.message);
    return (await this.getOrder(orderId))!;
  }

  /* ------------------------------------------------------ notifications */
  async listNotifications(userId: string) {
    return must(await this.sb.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100)).map(
      (r: any): Notification => ({ id: r.id, userId: r.user_id, type: r.type, title: r.title, body: r.body, link: r.link, read: r.read, createdAt: r.created_at }),
    );
  }
  async markNotificationsRead(userId: string) {
    must(await this.sb.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false));
    this.emit({ type: "notifications", userId });
  }

  /* ----------------------------------------------------------- realtime */
  subscribe(cb: (e: MarketEvent) => void) {
    this.listeners.add(cb);
    if (!this.channel) {
      // Supabase Realtime respects RLS: each user only receives rows they may read
      this.channel = this.sb
        .channel("dukaanshoot-market")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => {
          const r = (p.new && Object.keys(p.new).length ? p.new : p.old) as any;
          this.emit({ type: "orders", orderId: r.id, shopId: r.shop_id, buyerId: r.buyer_id, kind: p.eventType === "INSERT" ? "new" : "status" });
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (p) => this.emit({ type: "notifications", userId: (p.new as any).user_id }))
        .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (p) => this.emit({ type: "products", productId: (p.new as any)?.id }))
        .subscribe();
    }
    return () => {
      this.listeners.delete(cb);
    };
  }
}
