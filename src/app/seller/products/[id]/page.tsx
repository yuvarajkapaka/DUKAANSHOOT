"use client";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/app-chrome";
import { useMarketQuery } from "@/components/market-state";
import { useAuthed } from "@/components/providers";
import { ProductForm } from "@/components/seller/product-form";
import { EmptyState } from "@/components/ui/feedback";

export default function EditProductPage() {
  const t = useTranslations("products");
  const tp = useTranslations("product");
  const { id } = useParams<{ id: string }>();
  const { market } = useAuthed();
  const product = useMarketQuery(() => market.getProduct(id), [market, id], []);
  return (
    <>
      <AppHeader title={t("editTitle")} side="seller" back="/seller/products" />
      {product.data === undefined ? (
        <div className="mx-auto max-w-3xl space-y-3 px-4">
          <div className="skeleton h-40 rounded-[var(--radius-card)]" />
          <div className="skeleton h-72 rounded-[var(--radius-card)]" />
        </div>
      ) : product.data === null ? (
        <EmptyState title={tp("notFound")} />
      ) : (
        <ProductForm product={product.data} />
      )}
    </>
  );
}
