import { Suspense } from "react";

import { createClient } from "@/utils/supabase/server";
import SellerDashboard from "@/components/seller/SellerDashboard";

export default async function SellerDashboardPage() {
  const supabase = await createClient();

  const [
    { data: seller },
    { data: products },
    { data: summary },
    { data: orders },
  ] = await Promise.all([
    supabase.rpc("get_my_seller"),
    supabase.rpc("get_my_seller_products"),
    supabase.rpc("get_my_seller_sales_summary"),
    supabase.rpc("get_my_seller_orders", { p_limit: 5, p_offset: 0 }),
  ]);

  const sellerRecord = seller && Array.isArray(seller) ? seller[0] : seller;

  return (
    <Suspense fallback={<div className="text-white/60">Загружаем данные продавца…</div>}>
      <SellerDashboard
        seller={sellerRecord ?? null}
        products={Array.isArray(products) ? products : []}
        summary={Array.isArray(summary) ? summary : []}
        orders={Array.isArray(orders) ? orders : []}
      />
    </Suspense>
  );
}
