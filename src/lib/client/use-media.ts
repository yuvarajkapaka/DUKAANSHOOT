"use client";
import { useSyncExternalStore } from "react";

/** Reactive media query. Server render assumes a phone (mobile-first). */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useIsDesktop = () => useMedia("(min-width: 1024px)");

/* seller sidebar collapsed (desktop), remembered on the device */
const KEY = "ds_sidebar_collapsed";
const EVT = "ds-sidebar";
export function useSidebarCollapsed(): [boolean, (v: boolean) => void] {
  const v = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVT, cb);
      return () => window.removeEventListener(EVT, cb);
    },
    () => localStorage.getItem(KEY) === "1",
    () => false,
  );
  return [
    v,
    (next) => {
      localStorage.setItem(KEY, next ? "1" : "0");
      window.dispatchEvent(new Event(EVT));
    },
  ];
}
