import type { Metadata } from "next";

import { Suspense } from "react";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";

import { AdminLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin Sign in",
  description: "Sign in to manage products, orders, and customers.",
};

export default function AdminLoginPage() {
  return (
    <Section className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md space-y-4 p-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Admin Login</h1>
          <p className="text-sm text-neutral-500">Enter your credentials to access the admin portal.</p>
        </div>
        <Suspense fallback={null}>
          <AdminLoginForm />
        </Suspense>
      </Card>
    </Section>
  );
}
