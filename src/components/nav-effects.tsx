"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * - data-side="seller|buyer" on <html>: switches the accent colour (marigold / rose)
 * - data-nav="back|forward": back navigation slides pages in from the left
 */
export function NavEffects() {
  const path = usePathname();
  useEffect(() => {
    const seller = path.startsWith("/seller");
    document.documentElement.dataset.side = seller ? "seller" : "buyer";
  }, [path]);
  useEffect(() => {
    const root = document.documentElement;
    const onPop = () => {
      root.dataset.nav = "back";
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("a,button")) root.dataset.nav = "forward";
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
  return null;
}
