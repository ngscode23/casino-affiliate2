import { Suspense } from "react";

import { createClient } from "@/utils/supabase/server";
import SellerOrdersClient from "@/components/seller/SellerOrdersClient";

export default async function SellerOrdersPage() {
  const supabase = await createClient();

  const { data: orders, error } = await supabase.rpc("get_my_seller_orders", { p_limit: 100, p_offset: 0 });
  if (error) {
    throw new Error(error.message);
  }

  return (
    <Suspense fallback={<div className="text-white/60">Загружаем заказы…</div>}>
      <SellerOrdersClient orders={Array.isArray(orders) ? orders : []} />
    </Suspense>
  );
}

