"use client";
import { usePathname } from "next/navigation";
import { RequireAuth, Shell } from "@/components/app-chrome";

/** Seller side: sellers only (also enforced by middleware). */
export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  // on phones the photo flow and product form use their own sticky action bar instead of the tab bar
  const focus = /^\/seller\/(create\/(look|results)|products\/[^/]+$)/.test(path);
  return (
    <RequireAuth role="seller">
      <Shell side="seller" hideNav={focus}>
        {children}
      </Shell>
    </RequireAuth>
  );
}
