import type { Metadata } from "next";
import Link from "next/link";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";

import RegisterForm from "./register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an account to track orders and save favorites.",
};

export default function RegisterPage() {
  return (
    <Section className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md space-y-5 p-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-white">Create an account</h1>
          <p className="text-sm text-neutral-400">
            Create an account to save favorites, track orders, and manage your profile.
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
