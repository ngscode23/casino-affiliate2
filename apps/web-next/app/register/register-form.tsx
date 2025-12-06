"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { signupAction, type AuthActionState } from "../login/actions";
import Button from "@ui/components/common/button";
import FormField from "@/components/ui/form-field";

const INITIAL_STATE: AuthActionState = { success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="w-full"
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Creating account...
        </span>
      ) : (
        "Create account"
      )}
    </Button>
  );
}

export default function RegisterForm() {
  const [state, formAction] = useActionState(signupAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <FormField id="email" label="Email" required>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
          placeholder="you@email.com"
        />
      </FormField>
      <FormField id="password" label="Password" required>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
          placeholder="********"
        />
      </FormField>
      <SubmitButton />
      {state.error && (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <div className="space-y-2 rounded-xl border border-emerald-500/40 bg-emerald-900/20 p-3 text-sm text-emerald-200">
          <p className="font-medium">Check your inbox</p>
          <p>
            We sent a confirmation email. Follow the link inside to activate your account, then you can
            <Link href="/login" className="ml-1 underline">
              log in
            </Link>
            .
          </p>
        </div>
      )}
    </form>
  );
}
