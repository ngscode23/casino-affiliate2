"use client";

import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState } from "react";

interface CheckoutPaymentFormProps {
  orderId: string;
  amountLabel: string;
  onSuccess: () => void;
  onProcessing?: () => void;
  onError: (message: string) => void;
}

export function CheckoutPaymentForm({
  orderId,
  amountLabel,
  onSuccess,
  onProcessing,
  onError,
}: CheckoutPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) {
      onError("Stripe is still loading. Please try again in a moment.");
      return;
    }

    setSubmitting(true);
    onError("");
    onProcessing?.();

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/account/orders/${orderId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      setSubmitting(false);
      onError(error.message || "Payment failed. Please try again.");
      return;
    }

    const status = paymentIntent?.status;
    if (status === "succeeded" || status === "processing" || status === "requires_capture") {
      onSuccess();
    } else {
      setSubmitting(false);
      onError(`Payment status: ${status ?? "unknown"}. Please verify and try again.`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
      <button
        type="submit"
        disabled={isSubmitting || !stripe || !elements}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Processing..." : `Pay ${amountLabel}`}
      </button>
    </form>
  );
}
