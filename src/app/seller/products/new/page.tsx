"use client";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-chrome";
import { ProductForm } from "@/components/seller/product-form";

function NewProductInner() {
  const t = useTranslations("products");
  const gen = useSearchParams().get("gen") ?? undefined;
  return (
    <>
      <AppHeader title={t("newTitle")} side="seller" back={true} />
      <ProductForm generationId={gen} />
    </>
  );
}

export default function NewProductPage() {
  return (
    <Suspense>
      <NewProductInner />
    </Suspense>
  );
}
