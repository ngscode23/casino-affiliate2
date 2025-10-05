import type { Metadata } from "next";
import Link from "next/link";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";

import RegisterForm from "./register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Register for the affiliate portal to access partner offers.",
};

export default function RegisterPage() {
  return (
    <Section className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md space-y-5 p-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-white">Create an account</h1>
          <p className="text-sm text-neutral-400">
            Join the portal to pin offers, manage deals, and access billing.
          </p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-neutral-500">
          Already have access?{" "}
          <Link href="/login" className="text-[rgb(var(--primary))] underline">
            Log in
          </Link>
        </p>
      </Card>
    </Section>
  );
}
