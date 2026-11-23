"use client";
import { clear, createStore, del, get, set, type UseStore } from "idb-keyval";
import { DEMO_BUYER_ID, DEMO_SELLER_ID } from "../art/market-seed";
import { SAMPLE_GARMENTS, sampleInputUrl, sampleResultUrl } from "../art/samples";
import type { GarmentType, Generation, GeneratedImage, Payment, Profile } from "../types";
import { makeVariants } from "./image";
import type { NewGeneration, NewImage, Repo } from "./repo";

interface StoredImage {
  id: string;
  src?: string; // public path
  blobKey?: string; // IndexedDB key (original)
  thumbKey?: string; // 400px
  mediumKey?: string; // 1000px (only when the original is bigger)
  createdAt: string;
}
type StoredGeneration = Omit<Generation, "images"> & { images: StoredImage[] };

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

let store: UseStore | null = null;
const db = () => (store ??= createStore("dukaanshoot", "kv"));

/** object URLs are cached so images don't flicker between screens */
const urlCache = new Map<string, string>();
async function objectUrl(key: string) {
  let url = urlCache.get(key);
  if (!url) {
    const blob = await get<Blob>(key, db());
    if (!blob) return "";
    url = URL.createObjectURL(blob);
    urlCache.set(key, url);
  }
  return url;
}

export const DEMO_START_CREDITS = 40;

/**
 * Device-only storage for demo accounts. Credits here are a demo wallet on the
 * phone — real accounts (CloudRepo) keep credits in Postgres.
 */
export class LocalRepo implements Repo {
  readonly kind = "local" as const;
  /** every device account keeps its own keys: "<userId>:profile", "<userId>:generations"… */
  constructor(private readonly userId: string) {}
  private k(key: string) {
    return `${this.userId}:${key}`;
  }

  private async gens(): Promise<StoredGeneration[]> {
    return (await get<StoredGeneration[]>(this.k("generations"), db())) ?? [];
  }
  private async saveGens(g: StoredGeneration[]) {
    await set(this.k("generations"), g, db());
  }

  private async toGeneration(g: StoredGeneration): Promise<Generation> {
    const images: GeneratedImage[] = [];
    for (const im of g.images) {
      if (im.src) images.push({ id: im.id, url: im.src, createdAt: im.createdAt });
      else if (im.blobKey) {
        const url = await objectUrl(im.blobKey);
        if (!url) continue;
        const thumb = im.thumbKey ? await objectUrl(im.thumbKey) : "";
        images.push({ id: im.id, url, thumb: thumb || undefined, createdAt: im.createdAt });
      }
    }
    return { ...g, images };
  }

  async getProfile() {
    return (await get<Profile>(this.k("profile"), db())) ?? null;
  }

  async updateProfile(patch: Parameters<Repo["updateProfile"]>[0]) {
    const p = await this.getProfile();
    if (!p) throw new Error("No profile");
    const next = { ...p, ...patch };
    await set(this.k("profile"), next, db());
    return next;
  }

  async spendCredits(n: number) {
    const p = await this.getProfile();
    if (!p) throw new Error("No profile");
    if (p.credits < n) throw new Error("NO_CREDITS");
    const credits = p.credits - n;
    await set(this.k("profile"), { ...p, credits }, db());
    return credits;
  }

  async addCredits(n: number) {
    const p = await this.getProfile();
    if (!p) throw new Error("No profile");
    const credits = p.credits + Math.max(0, Math.trunc(n));
    await set(this.k("profile"), { ...p, credits }, db());
    return credits;
  }

  async saveUpload(blob: Blob) {
    const uploadId = uid();
    await set(`upload:${uploadId}`, blob, db());
    return { uploadId };
  }

  async getUploadBlob(uploadId: string) {
    return (await get<Blob>(`upload:${uploadId}`, db())) ?? null;
  }

  async createGeneration(g: NewGeneration) {
    const gen: StoredGeneration = {
      id: uid(),
      createdAt: new Date().toISOString(),
      garmentType: g.garmentType,
      look: g.look,
      source: g.source,
      status: "running",
      jobId: g.jobId,
      creditsUsed: g.creditsUsed,
      garmentThumb: g.garmentThumb,
      images: [],
    };
    const all = await this.gens();
    await this.saveGens([gen, ...all].slice(0, 300));
    return this.toGeneration(gen);
  }

  async getGeneration(id: string) {
    const g = (await this.gens()).find((x) => x.id === id);
    return g ? this.toGeneration(g) : null;
  }

  async listGenerations(limit = 500) {
    const all = (await this.gens()).slice(0, limit);
    return Promise.all(all.map((g) => this.toGeneration(g)));
  }

  async updateGeneration(id: string, patch: Parameters<Repo["updateGeneration"]>[1]) {
    const all = await this.gens();
    await this.saveGens(all.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  async addImages(id: string, images: NewImage[]) {
    const now = new Date().toISOString();
    const stored: StoredImage[] = [];
    for (const im of images) {
      const imageId = uid();
      if (im.blob) {
        const key = `img:${imageId}`;
        const v = await makeVariants(im.blob);
        await set(key, v.original, db());
        await set(`${key}:400`, v.thumb, db());
        if (v.medium) await set(`${key}:1000`, v.medium, db());
        stored.push({ id: imageId, blobKey: key, thumbKey: `${key}:400`, mediumKey: v.medium ? `${key}:1000` : undefined, createdAt: now });
      } else if (im.src) stored.push({ id: imageId, src: im.src, createdAt: now });
    }
    const all = await this.gens();
    await this.saveGens(all.map((g) => (g.id === id ? { ...g, images: [...g.images, ...stored] } : g)));
  }

  async deleteImage(generationId: string, imageId: string) {
    const all = await this.gens();
    const next: StoredGeneration[] = [];
    for (const g of all) {
      if (g.id !== generationId) {
        next.push(g);
        continue;
      }
      const im = g.images.find((i) => i.id === imageId);
      for (const key of [im?.blobKey, im?.thumbKey, im?.mediumKey]) {
        if (!key) continue;
        await del(key, db());
        const u = urlCache.get(key);
        if (u) URL.revokeObjectURL(u);
        urlCache.delete(key);
      }
      const images = g.images.filter((i) => i.id !== imageId);
      if (images.length || g.status === "running") next.push({ ...g, images });
    }
    await this.saveGens(next);
  }

  async getImageBlob(generationId: string, imageId: string) {
    const g = (await this.gens()).find((x) => x.id === generationId);
    const im = g?.images.find((i) => i.id === imageId);
    if (!im) return null;
    if (im.blobKey) return (await get<Blob>(im.blobKey, db())) ?? null;
    if (im.src) {
      const r = await fetch(im.src);
      return r.ok ? r.blob() : null;
    }
    return null;
  }

  async listPayments() {
    return (await get<Payment[]>(this.k("payments"), db())) ?? [];
  }

  async recordPayment(p: Payment) {
    const all = await this.listPayments();
    await set(this.k("payments"), [p, ...all.filter((x) => x.id !== p.id)], db());
  }

  async signOut() {
    // device accounts keep their data; only the session ends (see lib/client/device-session.ts)
  }

  async deleteAccount() {
    for (const g of await this.gens()) for (const im of g.images) for (const k of [im.blobKey, im.thumbKey, im.mediumKey]) if (k) await del(k, db());
    for (const key of ["profile", "generations", "payments"]) await del(this.k(key), db());
  }

  /** wipes every demo account + the device marketplace (Settings → Reset demo) */
  static async resetDevice() {
    for (const u of urlCache.values()) URL.revokeObjectURL(u);
    urlCache.clear();
    await clear(db());
  }

  /* ------------------------------------------------------------ demo login */
  /** Demo accounts are created once and then reused, so seller + buyer share one device world. */
  static async startDemo(role: "seller" | "buyer", language: string): Promise<Profile> {
    const id = role === "seller" ? DEMO_SELLER_ID : DEMO_BUYER_ID;
    const repo = new LocalRepo(id);
    const existing = await repo.getProfile();
    if (existing) return existing;
    const profile: Profile =
      role === "seller"
        ? { id, role, name: "Ramesh", city: "Hyderabad", shopName: "Ramesh Sarees", shopType: "sarees", phone: "98765 43210", language, credits: DEMO_START_CREDITS, isDemo: true, createdAt: new Date().toISOString() }
        : { id, role, name: "Priya Reddy", city: "Hyderabad", shopName: "", shopType: "other", phone: "91234 56780", language, credits: 0, isDemo: true, createdAt: new Date().toISOString() };
    await set(repo.k("profile"), profile, db());
    if (role === "buyer") return profile;
    // a few earlier photo sessions so the seller's screens look lived-in
    const seeds: [string, number][] = [
      ["kurta-women-pink", 26],
      ["saree-teal-cotton", 3],
      ["saree-red-silk", 1],
    ];
    const gens: StoredGeneration[] = [];
    for (const [sid, hoursAgo] of seeds) {
      const s = SAMPLE_GARMENTS.find((x) => x.id === sid)!;
      const at = new Date(Date.now() - hoursAgo * 3600_000).toISOString();
      gens.unshift({
        id: uid(),
        createdAt: at,
        garmentType: s.garment as GarmentType,
        look: s.look,
        source: { kind: "sample", sampleId: s.id },
        status: "done",
        creditsUsed: 0,
        note: "sample",
        garmentThumb: sampleInputUrl(s.id),
        images: [0, 1, 2, 3].map((n) => ({ id: uid(), src: sampleResultUrl(s.id, n), createdAt: at })),
      });
    }
    await repo.saveGens(gens);
    await repo.recordPayment({
      id: uid(),
      orderId: "sim_demo_welcome",
      amountPaise: 19900,
      credits: 50,
      status: "paid",
      createdAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
    });
    return profile;
  }

  /** a brand-new device account (not a demo) — used when there is no Supabase */
  static async createAccount(role: "seller" | "buyer", language: string): Promise<Profile> {
    const id = "user-" + uid().slice(0, 8);
    const profile: Profile = { id, role, name: "", city: "", shopName: "", shopType: "sarees", phone: "", language, credits: 5, isDemo: true, createdAt: new Date().toISOString() };
    await set(new LocalRepo(id).k("profile"), profile, db());
    return profile;
  }
}
