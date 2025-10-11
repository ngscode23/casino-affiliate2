import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import SellerOnboarding from "@/components/seller/SellerOnboarding";

function buildNextUrl(next: string) {
  return next.startsWith("/") ? next : `/seller`;
}

export default async function SellerOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextUrl = buildNextUrl("/seller/onboarding");

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextUrl)}`);
  }

  const { data: seller, error } = await supabase.rpc("get_my_seller");
  if (error) {
    console.error("get_my_seller error", error);
    throw new Error(error.message);
  }

  if (seller) {
    redirect("/seller");
  }

  return <SellerOnboarding defaultEmail={user?.email ?? ""} />;
}

