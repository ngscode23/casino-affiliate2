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
    <div style={{ margin: "20px", display: "flex", gap: "10px" }}>
      <button
        onClick={throwError}
        style={{
          padding: "10px 20px",
          background: "red",
          color: "white",
          borderRadius: "8px",
          border: "none",
        }}
      >
        Тест Sentry (ошибка)
      </button>

      <button
        onClick={sendEvent}
        style={{
          padding: "10px 20px",
          background: "blue",
          color: "white",
          borderRadius: "8px",
          border: "none",
        }}
      >
        Тест PostHog (событие)
      </button>
    </div>
  );
}