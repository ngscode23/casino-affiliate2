import type { Metadata } from "next";
import Link from "next/link";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";

import ResetForm from "./reset-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Request a password reset link for your affiliate account.",
};

export default function ResetPasswordPage() {
  return (
    <Section className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md space-y-5 p-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-white">Forgot your password?</h1>
          <p className="text-sm text-neutral-400">
            Enter the email connected to your account and we will send a reset link.
          </p>
        </div>
        <ResetForm />
        <p className="text-center text-sm text-neutral-500">
          Remembered it?{" "}
          <Link href="/login" className="text-[rgb(var(--primary))] underline">
            Back to login
          </Link>
        </p>
      </Card>
    </Section>
  );
}
