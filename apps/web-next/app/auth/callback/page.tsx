import type { Metadata } from "next";
import Link from "next/link";
import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";

export const metadata: Metadata = {
  title: "Authentication",
  description: "Complete the sign-in flow for your affiliate account.",
};

export default function AuthCallbackPage() {
  return (
    <Section className="flex min-h-[60vh] items-center justify-center py-10">
      <Card className="max-w-md space-y-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Finishing up</h1>
        <p className="text-sm text-neutral-500">
          You can close this tab once the authentication popup completes. If nothing happens,
          return to the <Link href="/login" className="text-[rgb(var(--primary))] underline">login page</Link>
          and try again.
        </p>
      </Card>
    </Section>
  );
}
