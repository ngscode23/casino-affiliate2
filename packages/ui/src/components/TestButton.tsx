// src/components/TestButton.tsx
import React from "react";
import posthog from "posthog-js";

export default function TestButton() {
  const throwError = () => {
    throw new Error("⚡ Тестовая ошибка для Sentry");
  };

  const sendEvent = () => {
    posthog.capture("test_button_clicked", { foo: "bar", time: Date.now() });
    alert("📊 Событие отправлено в PostHog!");
  };

  return (
    <div className="m-5 flex gap-3">
      <button
        onClick={throwError}
        className="rounded-lg border-none bg-red-600 px-5 py-2.5 text-white shadow-sm transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
      >
        Тест Sentry (ошибка)
      </button>

      <button
        onClick={sendEvent}
        className="rounded-lg border-none bg-blue-600 px-5 py-2.5 text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      >
        Тест PostHog (событие)
      </button>
    </div>
  );
}
