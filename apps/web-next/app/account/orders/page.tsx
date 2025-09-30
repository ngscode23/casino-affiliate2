import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OrdersClient } from "./orders-client";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Мои заказы",
  description: "История заказов и управление платежами.",
};

export default async function AccountOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/account/orders")}`);
  }

  return (
    <Suspense fallback={null}>
      <OrdersClient />
    </Suspense>
  );
}