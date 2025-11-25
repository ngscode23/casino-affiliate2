"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import Button from "@ui/components/common/button";

import { loginAction, type AuthActionState } from "./actions";

const INITIAL_STATE: AuthActionState = { success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useActionState(loginAction, INITIAL_STATE);
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.success) {
      const next =
        searchParams?.get("next") ||
        searchParams?.get("redirect") ||
        searchParams?.get("redirectTo") ||
        "/account";
      formRef.current?.reset();
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
      router.replace(safeNext);
      router.refresh();
    }
  }, [state.success, router, searchParams]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4"
      suppressHydrationWarning
    >
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-neutral-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          suppressHydrationWarning
          className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-neutral-500"
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-neutral-400">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          suppressHydrationWarning
          className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-neutral-500"
          placeholder="********"
        />
      </div>
      <SubmitButton />
      {state.error && (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      )}
      <div className="flex items-center justify-between text-sm text-neutral-400">
        <Link href="/auth/reset" className="underline">
          Forgot password?
        </Link>
        <Link href="/register" className="underline">
          Create account
        </Link>
      </div>
    </form>
  );
}

