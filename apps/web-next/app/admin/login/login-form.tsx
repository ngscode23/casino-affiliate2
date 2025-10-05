"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Button from "@ui/components/common/button";

import { loginAction, type AuthActionState } from "../../login/actions";

const INITIAL_STATE: AuthActionState = { success: false };

export function AdminLoginForm() {
  const [state, formAction] = useActionState(loginAction, INITIAL_STATE);
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      const next =
        searchParams?.get("next") ||
        searchParams?.get("redirect") ||
        searchParams?.get("redirectTo") ||
        "/admin";
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
      router.replace(safeNext);
      router.refresh();
    }
  }, [state.success, router, searchParams]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-neutral-500">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-neutral-500">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
          placeholder="********"
        />
      </div>
      <Button type="submit" className="w-full" disabled={state.success === true}>
        Sign in
      </Button>
      {state.error && (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
