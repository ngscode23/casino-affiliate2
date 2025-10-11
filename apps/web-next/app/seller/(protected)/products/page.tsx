import { Suspense } from "react";

import { createClient } from "@/utils/supabase/server";
import SellerProductsClient from "@/components/seller/SellerProductsClient";

export default async function SellerProductsPage() {
  const supabase = await createClient();

  const [{ data: seller }, { data: products }] = await Promise.all([
    supabase.rpc("get_my_seller"),
    supabase.rpc("get_my_seller_products"),
  ]);

  const sellerRecord = seller && Array.isArray(seller) ? seller[0] : seller;

  return (
    <Suspense fallback={<div className="text-white/60">Загружаем список товаров…</div>}>
      <SellerProductsClient
        initialProducts={Array.isArray(products) ? products : []}
        sellerStatus={(sellerRecord as { status?: string } | null)?.status ?? "pending"}
      />
    </Suspense>
  );
}

