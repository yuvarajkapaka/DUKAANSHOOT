import { Shell } from "@/components/app-chrome";

/** Public marketplace — no login needed to browse. */
export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return <Shell side="buyer">{children}</Shell>;
}
