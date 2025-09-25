import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Section from "@ui/components/common/section";
import OrderHistory from "@ui/components/account/OrderHistory";
import { useAuthState } from "@shared/lib/authStore";
import { ensureSession } from "@shared/lib/auth";

export default function AccountOrdersPage() {
  const { user } = useAuthState();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let done = false;
    ensureSession().finally(() => {
      if (!done) setChecking(false);
    });
    return () => { done = true; };
  }, []);

  if (checking) {
    return (
      <Section className="py-6">
        <div className="text-sm text-[var(--text-dim)]">Проверяем авторизацию…</div>
      </Section>
    );
  }

  if (!user) {
    return (
      <Section className="py-6 space-y-3">
        <h1 className="text-2xl font-bold">Мои заказы</h1>
        <p className="text-sm text-[var(--text-dim)]">
          Войдите в аккаунт, чтобы просматривать историю заказов.
        </p>
        <Link className="underline" to="/auth/login">Перейти к входу</Link>
      </Section>
    );
  }

  return (
    <Section className="py-6">
      <h1 className="text-2xl font-bold mb-4">Мои заказы</h1>
      <OrderHistory />
    </Section>
  );
}

