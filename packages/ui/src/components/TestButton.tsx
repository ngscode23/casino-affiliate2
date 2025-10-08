// src/components/TestButton.tsx
import React from "react";
import posthog from "posthog-js";

export default function TestButton() {
  const throwError = () => {
    throw new Error("? ???????? ?????? ??? Sentry");
  };

  const sendEvent = () => {
    posthog.capture("test_button_clicked", { foo: "bar", time: Date.now() });
    alert("?? ??????? ?????????? ? PostHog!");
  };

  return (
    <div className="m-5 flex gap-2.5">
      <button
        onClick={throwError}
        className="rounded-lg border border-transparent bg-red-600 px-5 py-2.5 text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
      >
        ???? Sentry (??????)
      </button>

      <button
        onClick={sendEvent}
        className="rounded-lg border border-transparent bg-blue-600 px-5 py-2.5 text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      >
        ???? PostHog (???????)
      </button>
    </div>
  );
}
