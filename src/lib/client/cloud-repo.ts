"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sampleInputUrl } from "../art/samples";
import type { GarmentType, Generation, LookOptions, Payment, Profile, ShopType } from "../types";
import { makeVariants } from "./image";
import type { NewGeneration, NewImage, Repo } from "./repo";

const PUBLIC_PREFIX = "public:";
const thumbPath = (p: string) => p.replace(/\.jpg$/, ".t400.jpg");
const mediumPath = (p: string) => p.replace(/\.jpg$/, ".m1000.jpg");
const META_KEY = "ds_cloud_gen_meta";

interface GenRow {
  id: string;
  created_at: string;
  upload_id: string | null;
  options: { garmentType: GarmentType; look: LookOptions; sampleId?: string | null };
  status: Generation["status"];
  provider_job_id: string | null;
  error: string | null;
  credits_used: number;
  generated_images?: { id: string; image_path: string; created_at: string }[];
}

/** Supabase-backed storage for real accounts. Credits change only on the server. */
export class CloudRepo implements Repo {
  readonly kind = "cloud" as const;
  constructor(
    private readonly sb: SupabaseClient,
    private readonly userId: string,
    private readonly email: string | null,
  ) {}

  /* per-device extras the user can't write to the DB (e.g. swapped fallback job ids) */
  private meta(): Record<string, { jobId?: string; note?: Generation["note"] }> {
    try {
      return JSON.parse(localStorage.getItem(META_KEY) || "{}");
    } catch {
      return {};
    }
  }

  async getProfile(): Promise<Profile | null> {
    const { data } = await this.sb.from("profiles").select("*").eq("id", this.userId).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      role: data.role ?? null,
      name: data.name ?? "",
      city: data.city ?? "",
      email: data.email ?? this.email,
      shopName: data.shop_name,
      shopType: data.shop_type as ShopType,
      phone: data.phone,
      language: data.language,
      credits: data.credits,
      defaults: data.defaults ?? {},
      isDemo: !!data.is_demo,
      createdAt: data.created_at,
    };
  }

  async updateProfile(patch: Parameters<Repo["updateProfile"]>[0]) {
    const row: Record<string, unknown> = {};
    if (patch.shopName !== undefined) row.shop_name = patch.shopName;
    if (patch.shopType !== undefined) row.shop_type = patch.shopType;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.language !== undefined) row.language = patch.language;
    if (patch.defaults !== undefined) row.defaults = patch.defaults;
    if (patch.role !== undefined) row.role = patch.role;
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.city !== undefined) row.city = patch.city;
    const { error } = await this.sb.from("profiles").update(row).eq("id", this.userId);
    if (error) throw error;
    return (await this.getProfile())!;
  }

  async spendCredits() {
    return (await this.getProfile())?.credits ?? 0; // done atomically by start_generation()
  }
  async addCredits() {
    return (await this.getProfile())?.credits ?? 0; // done by mark_payment_paid() after verification
  }

  async saveUpload(blob: Blob, garmentType: GarmentType) {
    const fd = new FormData();
    fd.append("file", blob, "garment.jpg");
    fd.append("garmentType", garmentType);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "UPLOAD_FAILED");
    return { uploadId: body.uploadId as string };
  }

  async getUploadBlob(uploadId: string) {
    const { data } = await this.sb.from("uploads").select("image_path").eq("id", uploadId).maybeSingle();
    if (!data) return null;
    const { data: blob } = await this.sb.storage.from("uploads").download(data.image_path);
    return blob ?? null;
  }

  private async toGenerations(rows: GenRow[]): Promise<Generation[]> {
    const meta = this.meta();
    const paths = rows.flatMap((r) => (r.generated_images ?? []).map((i) => i.image_path)).filter((p) => !p.startsWith(PUBLIC_PREFIX));
    const uploadIds = rows.map((r) => r.upload_id).filter(Boolean) as string[];
    const signed = new Map<string, string>();
    if (paths.length) {
      // originals + their 400px thumbnails ("<path>.t400.jpg")
      const { data } = await this.sb.storage.from("generated").createSignedUrls([...paths, ...paths.map(thumbPath)], 3600);
      data?.forEach((d) => d.signedUrl && d.path && signed.set(d.path, d.signedUrl));
    }
    const thumbs = new Map<string, string>();
    if (uploadIds.length) {
      const { data: ups } = await this.sb.from("uploads").select("id,image_path").in("id", uploadIds);
      if (ups?.length) {
        const { data } = await this.sb.storage.from("uploads").createSignedUrls(ups.map((u) => u.image_path), 3600);
        ups.forEach((u, i) => data?.[i]?.signedUrl && thumbs.set(u.id, data[i].signedUrl!));
      }
    }
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      garmentType: r.options.garmentType,
      look: r.options.look,
      source: r.options.sampleId ? { kind: "sample", sampleId: r.options.sampleId } : { kind: "upload", uploadId: r.upload_id ?? "" },
      status: r.status,
      jobId: meta[r.id]?.jobId ?? r.provider_job_id ?? undefined,
      error: r.error,
      creditsUsed: r.credits_used,
      note: meta[r.id]?.note ?? (r.options.sampleId ? "sample" : null),
      garmentThumb: r.options.sampleId ? sampleInputUrl(r.options.sampleId) : r.upload_id ? thumbs.get(r.upload_id) : undefined,
      images: (r.generated_images ?? [])
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((i) => ({
          id: i.id,
          url: i.image_path.startsWith(PUBLIC_PREFIX) ? i.image_path.slice(PUBLIC_PREFIX.length) : signed.get(i.image_path) ?? "",
          thumb: i.image_path.startsWith(PUBLIC_PREFIX) ? undefined : signed.get(thumbPath(i.image_path)),
          createdAt: i.created_at,
        }))
        .filter((i) => i.url),
    }));
  }

  async createGeneration(g: NewGeneration) {
    if (!g.serverId) throw new Error("Missing server generation id");
    await this.updateGeneration(g.serverId, { jobId: g.jobId });
    return (await this.getGeneration(g.serverId))!;
  }

  async getGeneration(id: string) {
    const { data } = await this.sb.from("generations").select("*, generated_images(id,image_path,created_at)").eq("id", id).maybeSingle();
    if (!data) return null;
    return (await this.toGenerations([data as GenRow]))[0];
  }

  async listGenerations(limit = 200) {
    const { data } = await this.sb
      .from("generations")
      .select("*, generated_images(id,image_path,created_at)")
      .order("created_at", { ascending: false })
      .limit(limit);
    return this.toGenerations((data ?? []) as GenRow[]);
  }

  async updateGeneration(id: string, patch: Parameters<Repo["updateGeneration"]>[1]) {
    // status lives in Postgres and is set by the server; only device-side extras are stored here
    const meta = this.meta();
    meta[id] = { ...meta[id], ...(patch.jobId ? { jobId: patch.jobId } : {}), ...(patch.note !== undefined ? { note: patch.note } : {}) };
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }

  async addImages(id: string, images: NewImage[]) {
    const rows: { generation_id: string; user_id: string; image_path: string }[] = [];
    for (const im of images) {
      if (im.blob) {
        const path = `${this.userId}/${id}/${crypto.randomUUID()}.jpg`;
        const v = await makeVariants(im.blob);
        const { error } = await this.sb.storage.from("generated").upload(path, v.original, { contentType: im.blob.type || "image/jpeg" });
        if (error) throw error;
        await this.sb.storage.from("generated").upload(thumbPath(path), v.thumb, { contentType: "image/jpeg" });
        if (v.medium) await this.sb.storage.from("generated").upload(mediumPath(path), v.medium, { contentType: "image/jpeg" });
        rows.push({ generation_id: id, user_id: this.userId, image_path: path });
      } else if (im.src) rows.push({ generation_id: id, user_id: this.userId, image_path: PUBLIC_PREFIX + im.src });
    }
    if (rows.length) {
      const { error } = await this.sb.from("generated_images").insert(rows);
      if (error) throw error;
    }
  }

  async deleteImage(_generationId: string, imageId: string) {
    const { data } = await this.sb.from("generated_images").select("image_path").eq("id", imageId).maybeSingle();
    if (data && !data.image_path.startsWith(PUBLIC_PREFIX)) await this.sb.storage.from("generated").remove([data.image_path, thumbPath(data.image_path), mediumPath(data.image_path)]);
    await this.sb.from("generated_images").delete().eq("id", imageId);
  }

  async getImageBlob(_generationId: string, imageId: string) {
    const { data } = await this.sb.from("generated_images").select("image_path").eq("id", imageId).maybeSingle();
    if (!data) return null;
    if (data.image_path.startsWith(PUBLIC_PREFIX)) {
      const r = await fetch(data.image_path.slice(PUBLIC_PREFIX.length));
      return r.ok ? r.blob() : null;
    }
    const { data: blob } = await this.sb.storage.from("generated").download(data.image_path);
    return blob ?? null;
  }

  async listPayments(): Promise<Payment[]> {
    const { data } = await this.sb.from("payments").select("*").order("created_at", { ascending: false });
    return (data ?? []).map((p) => ({
      id: p.id,
      orderId: p.razorpay_order_id,
      paymentId: p.razorpay_payment_id,
      amountPaise: p.amount_paise,
      credits: p.credits_added,
      status: p.status,
      createdAt: p.created_at,
    }));
  }

  async recordPayment() {
    // payments are written by the server
  }

  async signOut() {
    localStorage.removeItem(META_KEY);
    await this.sb.auth.signOut();
  }

  async deleteAccount() {
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) throw new Error("DELETE_FAILED");
    localStorage.removeItem(META_KEY);
    await this.sb.auth.signOut().catch(() => {});
  }
}
