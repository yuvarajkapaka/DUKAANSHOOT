"use client";
import { createStore, get, set, type UseStore } from "idb-keyval";
import { useEffect, useState } from "react";

/**
 * Product images can be:
 *  - "/samples/…"   public files
 *  - "https://…"    Supabase public URLs
 *  - "idb:<key>"    a Blob kept on this device (demo mode)
 */
let store: UseStore | null = null;
const db = () => (store ??= createStore("dukaanshoot", "kv"));
const cache = new Map<string, string>();

export async function resolveImageRef(ref: string): Promise<string> {
  if (!ref.startsWith("idb:")) return ref;
  const hit = cache.get(ref);
  if (hit) return hit;
  const blob = await get<Blob>(ref.slice(4), db());
  if (!blob) return "";
  const url = URL.createObjectURL(blob);
  cache.set(ref, url);
  return url;
}

export function useImageRef(ref: string | null | undefined) {
  const sync = ref && !ref.startsWith("idb:") ? ref : ref ? (cache.get(ref) ?? "") : "";
  const [url, setUrl] = useState(sync);
  useEffect(() => {
    if (!ref) return setUrl("");
    if (!ref.startsWith("idb:")) return setUrl(ref);
    let alive = true;
    void resolveImageRef(ref).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [ref]);
  return url;
}

/** Stores a blob on the device and returns its "idb:" ref (used when a seller lists a product). */
export async function storeImageBlob(blob: Blob): Promise<string> {
  const key = `pimg:${crypto.randomUUID()}`;
  await set(key, blob, db());
  return `idb:${key}`;
}

export async function refToBlob(ref: string): Promise<Blob | null> {
  if (ref.startsWith("idb:")) return (await get<Blob>(ref.slice(4), db())) ?? null;
  const r = await fetch(ref);
  return r.ok ? r.blob() : null;
}
