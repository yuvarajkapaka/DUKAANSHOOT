// Seeds a Supabase project for the TWO-PHONE demo:
//   - demo seller + demo buyer accounts (used by "Demo as Seller / Buyer")
//   - the 4 sample shops (each with its own owner account) and 20 products
//   - product photos + shop logos uploaded to the public `products` bucket
//
// Run AFTER applying supabase/migrations/0001_init.sql and 0002_marketplace.sql:
//   node --env-file=.env.local scripts/seed-supabase.mjs
// Needs: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//        DEMO_SELLER_EMAIL, DEMO_SELLER_PASSWORD, DEMO_BUYER_EMAIL, DEMO_BUYER_PASSWORD
// Safe to run more than once (existing users/shops/products are reused).
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_SELLER_ID, MARKET_IMAGE_COUNT, SEED_PRODUCTS, SEED_SHOPS } from "../src/lib/art/market-seed.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing ${k} (see .env.example)`);
  return v;
};
const sb = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

async function ensureUser(email, password) {
  for (let page = 1; page < 20; page++) {
    const { users } = must(await sb.auth.admin.listUsers({ page, perPage: 200 }), "listUsers");
    const hit = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (users.length < 200) break;
  }
  return must(await sb.auth.admin.createUser({ email, password, email_confirm: true }), `createUser ${email}`).user.id;
}

async function upload(ownerId, file, contentType) {
  const key = `${ownerId}/seed/${path.basename(file)}`;
  const body = await readFile(path.join(root, "public", file));
  const { error } = await sb.storage.from("products").upload(key, body, { contentType, upsert: true });
  if (error) throw new Error(`upload ${file}: ${error.message}`);
  return sb.storage.from("products").getPublicUrl(key).data.publicUrl;
}

// ---- accounts
const sellerId = await ensureUser(env("DEMO_SELLER_EMAIL"), env("DEMO_SELLER_PASSWORD"));
const buyerId = await ensureUser(env("DEMO_BUYER_EMAIL"), env("DEMO_BUYER_PASSWORD"));
must(await sb.from("profiles").update({ role: "buyer", name: "Priya Reddy", city: "Hyderabad", phone: "91234 56780" }).eq("id", buyerId), "buyer profile");
console.log("demo buyer", buyerId);

// ---- shops (the demo seller owns Ramesh Sarees; other shops get their own hidden owner accounts)
const shopIdMap = {};
for (const s of SEED_SHOPS) {
  const ownerId = s.ownerId === DEMO_SELLER_ID ? sellerId : await ensureUser(`${s.slug}@seed.dukaanshoot.invalid`, randomBytes(18).toString("base64url"));
  must(
    await sb.from("profiles").update({ role: "seller", shop_name: s.name, shop_type: s.shopType, city: s.city, phone: s.whatsapp, credits: 40 }).eq("id", ownerId),
    `profile ${s.slug}`,
  );
  const logo = await upload(ownerId, `samples/shops/${s.id}.png`, "image/png");
  const row = { owner_id: ownerId, slug: s.slug, name: s.name, city: s.city, whatsapp: s.whatsapp, delivery: s.delivery, shop_type: s.shopType, logo };
  const shop = must(await sb.from("shops").upsert(row, { onConflict: "owner_id" }).select("id").single(), `shop ${s.slug}`);
  shopIdMap[s.id] = { id: shop.id, ownerId };
  console.log("shop", s.slug);
}

// ---- products
for (const p of SEED_PRODUCTS) {
  const { id: shopId, ownerId } = shopIdMap[p.shopId];
  const existing = must(await sb.from("products").select("id").eq("shop_id", shopId).eq("title", p.title).maybeSingle(), "find product");
  if (existing) continue;
  const images = [];
  for (let n = 0; n < MARKET_IMAGE_COUNT; n++) images.push(await upload(ownerId, `samples/market/${p.id}-${n + 1}.jpg`, "image/jpeg"));
  const before = await upload(ownerId, `samples/market/${p.id}-before.jpg`, "image/jpeg");
  const row = {
    shop_id: shopId,
    title: p.title,
    description: p.description,
    category: p.category,
    price_paise: p.pricePaise,
    mrp_paise: p.mrpPaise ?? null,
    sizes: p.sizes,
    stock: p.stock,
    before_image: before,
    views: p.views,
    wa_clicks: p.waClicks,
    created_at: new Date(Date.now() - p.ageHours * 3600_000).toISOString(),
  };
  const created = must(await sb.from("products").insert(row).select("id").single(), `product ${p.id}`);
  must(await sb.from("product_images").insert(images.map((url, position) => ({ product_id: created.id, url, position }))), `images ${p.id}`);
  console.log("product", p.id);
}
// the shared demo accounts are read-only towards the public market (migration 0003)
must(await sb.from("profiles").update({ is_demo: true }).in("id", [sellerId, buyerId]), "mark demo accounts (run supabase/migrations/0003_security.sql first)");

console.log("\nDone. Set DEMO_SELLER_* and DEMO_BUYER_* in Vercel too, so the demo buttons sign into these accounts.");
