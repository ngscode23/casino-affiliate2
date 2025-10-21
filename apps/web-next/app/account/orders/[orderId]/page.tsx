import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import OrderDetailClient from "./order-detail-client";

export const metadata: Metadata = {
  title: "Order Details",
  description: "View order details and payment status.",
};

export default async function OrderDetailsPage(props: { params: Promise<{ orderId: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { orderId } = await props.params;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/account/orders/${orderId}`)}`);
  }

  return (
    <Suspense fallback={null}>
      <OrderDetailClient orderId={orderId} />
    </Suspense>
  );
}

