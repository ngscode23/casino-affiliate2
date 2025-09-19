//src/components/auth/VerifyEmailBanner.tsx
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";

export default function VerifyEmailBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    (async () => {
      const user = await getUser();
      // supabase хранит признак в identities/email_confirmed_at или user.user_metadata
      const emailConfirmed = (user as any)?.email_confirmed_at || (user as any)?.identities?.[0]?.identity_data?.email_verified;
      setShow(!!user && !emailConfirmed);
    })();
  }, []);

  if (!show) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-sm shadow-sm dark:bg-yellow-600/20 dark:border-yellow-600/40 dark:text-yellow-100">
      Подтвердите e-mail через письмо, отправленное на вашу почту. Если письма нет — проверьте «Спам».
    </div>
  );
}
