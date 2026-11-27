import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * A `?next=` target is only followed when it stays on this site. Parsed with the URL
 * parser (as a browser would) so `//evil.com`, `/\\evil.com` and tab tricks are caught.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/")) return null;
  try {
    const base = "https://same-site.invalid";
    const u = new URL(next, base);
    return u.origin === base ? u.pathname + u.search + u.hash : null;
  } catch {
    return null;
  }
}

export const rupees = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
