"use client";
import { useEffect, useSyncExternalStore } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Registers /sw.js (production only) and captures the Android install prompt. */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      } else {
        // A worker left behind by a production run on this port would keep serving
        // dev's un-hashed /_next/static chunks cache-first, so edits never show up
        // (and every page throws a hydration mismatch). Dev never wants one.
        void navigator.serviceWorker.getRegistrations().then((regs) => {
          if (!regs.length) return;
          void Promise.all(regs.map((r) => r.unregister())).then(() => caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))));
        });
      }
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as BIPEvent;
      emit();
    };
    const onInstalled = () => {
      deferred = null;
      emit();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

export function useInstallPrompt() {
  const available = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => !!deferred,
    () => false,
  );
  return {
    available,
    install: async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      deferred = null;
      emit();
    },
  };
}
