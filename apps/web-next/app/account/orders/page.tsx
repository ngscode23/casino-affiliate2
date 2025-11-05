import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OrdersClient } from "./orders-client";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Order History",
  description: "Review and manage your previous purchases.",
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
