import type { Category, DeliveryOption } from "../art/market-seed";
import type { GarmentType, ShopType } from "../types";

export type { Category, DeliveryOption };
export type Role = "seller" | "buyer";

export const CATEGORIES: Category[] = ["sarees", "kurtas", "men", "kids", "lehengas", "jewellery"];

export const SIZE_PRESETS: Record<Category, string[]> = {
  sarees: ["Free size"],
  kurtas: ["S", "M", "L", "XL", "XXL"],
  men: ["S", "M", "L", "XL", "XXL"],
  kids: ["2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-12Y"],
  lehengas: ["S", "M", "L", "XL"],
  jewellery: ["Free size"],
};

export function categoryForGarment(g: GarmentType, kids = false): Category {
  if (kids) return "kids";
  if (g === "saree") return "sarees";
  if (g === "lehenga") return "lehengas";
  if (g === "shirt" || g === "tshirt" || g === "pants") return "men";
  return "kurtas";
}

export interface Shop {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  city: string;
  whatsapp: string;
  delivery: DeliveryOption;
  shopType: ShopType;
  logo?: string | null;
  createdAt: string;
}

export type ProductStatus = "active" | "hidden" | "soldout";

export interface Product {
  id: string;
  shopId: string;
  title: string;
  description: string;
  category: Category;
  pricePaise: number;
  mrpPaise?: number | null;
  sizes: string[];
  stock: number;
  status: ProductStatus;
  /** image refs: "/public/path", "idb:<key>" (device demo) or https URL */
  images: string[];
  /** the plain item photo, for the before/after slider */
  beforeImage?: string | null;
  views: number;
  waClicks: number;
  createdAt: string;
}

export type OrderStatus = "new" | "accepted" | "packed" | "shipped" | "ready" | "delivered" | "rejected" | "cancelled";
export const ACTIVE_STATUSES: OrderStatus[] = ["new", "accepted", "packed", "shipped", "ready"];

/** the happy path a seller moves an order through */
export function nextStatus(o: Pick<Order, "status" | "deliveryType">): OrderStatus | null {
  switch (o.status) {
    case "new":
      return "accepted";
    case "accepted":
      return "packed";
    case "packed":
      return o.deliveryType === "pickup" ? "ready" : "shipped";
    case "shipped":
    case "ready":
      return "delivered";
    default:
      return null;
  }
}

export function timelineSteps(deliveryType: Order["deliveryType"]): OrderStatus[] {
  return ["new", "accepted", "packed", deliveryType === "pickup" ? "ready" : "shipped", "delivered"];
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  line1: string;
  city: string;
  pincode: string;
  isDefault: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  title: string;
  pricePaise: number;
  size: string;
  qty: number;
  image: string;
}

export interface Order {
  id: string;
  /** short human id shown to people, e.g. "DS-4821" */
  code: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  shopId: string;
  shopName: string;
  status: OrderStatus;
  deliveryType: "delivery" | "pickup";
  address: Omit<Address, "id" | "isDefault"> | null;
  totalPaise: number;
  paymentMethod: "cod" | "pay_at_shop";
  cancelReason?: string | null;
  items: OrderItem[];
  history: { status: OrderStatus; at: string; by: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  size: string;
  qty: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: "order_new" | "order_status" | "order_cancelled";
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface ProductQuery {
  q?: string;
  category?: Category;
  city?: string;
  size?: string;
  minPaise?: number;
  maxPaise?: number;
  shopId?: string;
  sort?: "new" | "price_low" | "price_high";
  limit?: number;
}

export interface NewProduct {
  title: string;
  description: string;
  category: Category;
  pricePaise: number;
  mrpPaise?: number | null;
  sizes: string[];
  stock: number;
  images: string[];
  beforeImage?: string | null;
}

export interface PlaceOrderInput {
  shopId: string;
  items: { productId: string; size: string; qty: number }[];
  deliveryType: "delivery" | "pickup";
  address: Order["address"];
  buyerName: string;
  buyerPhone: string;
  paymentMethod: Order["paymentMethod"];
}

export type MarketEvent =
  | { type: "orders"; orderId: string; shopId: string; buyerId: string; kind: "new" | "status" }
  | { type: "products"; productId?: string }
  | { type: "notifications"; userId: string }
  | { type: "cart"; userId: string }
  | { type: "wishlist"; userId: string };

/**
 * Marketplace data. Two implementations:
 *  - LocalMarket : one shared IndexedDB "world" on this device + BroadcastChannel
 *                  realtime between tabs (zero-setup demo, two windows side by side)
 *  - CloudMarket : Supabase Postgres + RLS + Realtime (works across phones)
 */
export interface MarketStore {
  readonly kind: "local" | "cloud";
  /* public */
  listShops(city?: string): Promise<Shop[]>;
  getShopBySlug(slug: string): Promise<Shop | null>;
  getShop(id: string): Promise<Shop | null>;
  listProducts(q?: ProductQuery): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  getProductsByIds(ids: string[]): Promise<Product[]>;
  trackView(productId: string): Promise<void>;
  trackWhatsApp(productId: string): Promise<void>;
  listCities(): Promise<string[]>;

  /* cart: works for guests too (userId may be "guest") */
  getCart(userId: string): Promise<CartItem[]>;
  setCart(userId: string, items: CartItem[]): Promise<void>;

  /* buyer (logged in) */
  getWishlist(userId: string): Promise<string[]>;
  toggleWishlist(userId: string, productId: string): Promise<boolean>;
  listAddresses(userId: string): Promise<Address[]>;
  saveAddress(userId: string, a: Omit<Address, "id"> & { id?: string }): Promise<Address>;
  placeOrder(userId: string, input: PlaceOrderInput): Promise<Order>;
  listMyOrders(userId: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  cancelOrder(userId: string, orderId: string, reason: string): Promise<Order>;

  /* seller */
  getMyShop(userId: string): Promise<Shop | null>;
  saveShop(userId: string, s: Partial<Omit<Shop, "id" | "ownerId" | "createdAt">>): Promise<Shop>;
  isSlugFree(slug: string, exceptShopId?: string): Promise<boolean>;
  listShopProducts(shopId: string): Promise<Product[]>;
  /** stores a product photo and returns its image ref ("idb:…" on device, public https URL in the cloud) */
  uploadProductImage(userId: string, blob: Blob): Promise<string>;
  createProduct(userId: string, p: NewProduct): Promise<Product>;
  updateProduct(userId: string, id: string, patch: Partial<NewProduct & { status: ProductStatus }>): Promise<Product>;
  deleteProduct(userId: string, id: string): Promise<void>;
  listShopOrders(shopId: string): Promise<Order[]>;
  setOrderStatus(userId: string, orderId: string, status: OrderStatus, reason?: string): Promise<Order>;

  /* notifications */
  listNotifications(userId: string): Promise<Notification[]>;
  markNotificationsRead(userId: string): Promise<void>;

  /* realtime */
  subscribe(cb: (e: MarketEvent) => void): () => void;
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40) || "shop"
  );
}
