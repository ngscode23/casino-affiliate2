"use client";
import { useState } from "react";
import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import { ButtonPrimary, ButtonGhost } from "@ui/components/ui/Buttons";
import PageShell from "@ui/components/ui/PageShell";
import { fnUrl } from "@shared/lib/api";

const PLANS: Array<{ key: "BASIC" | "FEATURED" | "TOP"; title: string; features: string[] }> = [
  { key: "BASIC", title: "Basic", features: ["Standard listing", "Analytics access"] },
  { key: "FEATURED", title: "Featured", features: ["Highlighted placement", "Priority support"] },
  { key: "TOP", title: "Top", features: ["Top of list", "Max visibility"] },
];

type Interval = "MONTHLY" | "YEARLY";

export default function PricingPageClient() {
  const [interval, setInterval] = useState<Interval>("MONTHLY");
  const [email, setEmail] = useState("");
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function subscribe(plan: "BASIC" | "FEATURED" | "TOP") {
    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) throw new Error("Email is required");
      setLoading(plan);
      const res = await fetch(fnUrl("create-subscription"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          plan,
          interval,
          coupon: coupon.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json?.url) {
        window.location.href = json.url as string;
      } else {
        throw new Error(json?.error || "Failed to create session");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`Error: ${message}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <PageShell>
      
      <Section className="space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Pricing</h1>
          <p className="text-[var(--text-dim)]">Choose a plan and start promoting your offers.</p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <ButtonGhost
            className={interval === "MONTHLY" ? "bg-white/10 border-white/15" : ""}
            onClick={() => setInterval("MONTHLY")}
          >
            Monthly
          </ButtonGhost>
          <ButtonGhost
            className={interval === "YEARLY" ? "bg-white/10 border-white/15" : ""}
            onClick={() => setInterval("YEARLY")}
          >
            Yearly
          </ButtonGhost>
        </div>

        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div key={plan.key} className="rounded border border-white/10 p-4 space-y-3">
                <div className="text-xl font-semibold">{plan.title}</div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--text-dim)]">
                  {plan.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
                <ButtonPrimary
                  disabled={loading === plan.key}
                  className="w-full"
                  onClick={() => subscribe(plan.key)}
                >
                  {loading === plan.key ? "Opening Checkout..." : "Subscribe"}
                </ButtonPrimary>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm">Email</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Coupon / Promo (optional)</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                value={coupon}
                onChange={(event) => setCoupon(event.target.value)}
                placeholder="PROMO10"
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 font-semibold">FAQ</h2>
          <div className="space-y-3 text-sm text-[var(--text-dim)]">
            <div>
              <div className="font-semibold text-[var(--text)]">Can I cancel anytime?</div>
              <div>Yes. Manage your subscription in the billing portal after checkout.</div>
            </div>
            <div>
              <div className="font-semibold text-[var(--text)]">Do you support coupons?</div>
              <div>Yes. Enter a coupon before opening checkout.</div>
            </div>
          </div>
        </Card>
      </Section>
    </PageShell>
  );
}

