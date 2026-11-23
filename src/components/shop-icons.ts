import { Baby, Gem, Shirt, ShoppingBag, Sparkles, Store } from "lucide-react";
import type { ShopType } from "@/lib/types";

export const SHOP_ICONS: Record<ShopType, typeof Store> = {
  sarees: Sparkles,
  boutique: ShoppingBag,
  menswear: Shirt,
  kids: Baby,
  jewellery: Gem,
  other: Store,
};
