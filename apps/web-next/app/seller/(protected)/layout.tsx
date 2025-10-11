import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { SellerShell } from "@/components/seller/SellerShell";

type SellerRecord = {
  id: string;
  user_id: string;
  slug: string | null;
  display_name: string;
  status: string;
  contact_email: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

async function currentSellerPath(): Promise<string> {
  const headerList = await headers();
  const invoke = headerList.get("x-invoke-path");
  if (invoke && invoke.startsWith("/")) return invoke;
  const matched = headerList.get("x-matched-path");
  if (matched && matched.startsWith("/")) return matched;
  return "/seller";
}

export default async function SellerProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = await currentSellerPath();
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const { data: seller, error } = await supabase.rpc("get_my_seller");

  if (error) {
    console.error("get_my_seller error", error);
    throw new Error(error.message);
  }

  const normalizedSeller: SellerRecord | null = (() => {
    if (!seller) return null;
    if (Array.isArray(seller)) {
      return seller.length ? (seller[0] as SellerRecord) : null;
    }
    return seller as SellerRecord;
  })();

  if (!normalizedSeller) {
    redirect("/seller/onboarding");
  }

  return (
    <SellerShell
      seller={{
        id: normalizedSeller.id,
        display_name: normalizedSeller.display_name,
        slug: normalizedSeller.slug,
        status: normalizedSeller.status,
        contact_email: normalizedSeller.contact_email,
      }}
    >
      {children}
    </SellerShell>
  );
}
