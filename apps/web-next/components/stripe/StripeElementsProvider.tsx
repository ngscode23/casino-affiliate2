"use client";

import { Elements } from "@stripe/react-stripe-js";
import { Appearance, loadStripe, StripeElementsOptions, type Stripe } from "@stripe/stripe-js";
import { useMemo } from "react";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

if (!publishableKey && process.env.NODE_ENV !== "production") {
  console.warn("[stripe] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set; Stripe Elements will not render.");
}

const stripePromise: Promise<Stripe | null> = publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);

export function StripeElementsProvider({
  clientSecret,
  appearance,
  children,
}: {
  clientSecret: string;
  appearance?: Appearance;
  children: React.ReactNode;
}) {
  const options = useMemo<StripeElementsOptions | undefined>(() => {
    if (!clientSecret) return undefined;
    return {
      clientSecret,
      appearance: appearance ?? { theme: "stripe" },
    } satisfies StripeElementsOptions;
  }, [clientSecret, appearance]);

  if (!clientSecret || !options) return null;

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}
