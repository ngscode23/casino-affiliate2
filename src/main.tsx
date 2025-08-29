// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import * as Sentry from "@sentry/react";
import posthog from "posthog-js";

// src/main.tsx или src/index.tsx

import './index.css';





// ====== SENTRY INIT (без __APP_NAME__/__APP_VERSION__) ======
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
// можешь задать в .env: VITE_SENTRY_RELEASE=0.0.1  (или оставь undefined)
const SENTRY_RELEASE = import.meta.env.VITE_SENTRY_RELEASE as string | undefined;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const options = {
  api_host: import.meta.env.VITE_POSTHOG_HOST, // не PUBLIC, можно без PUBLIC
};




if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,  // "development" | "production"
    release: SENTRY_RELEASE,            // можно undefined — это ок
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
  });
} else if (import.meta.env.DEV) {
  console.warn("[Sentry] VITE_SENTRY_DSN не задан — Sentry выключен");
}

// ====== POSTHOG (если используешь) ======
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  "https://app.posthog.com";

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    autocapture: true,
    persistence: "localStorage",
  });
} else if (import.meta.env.DEV) {
  console.warn("[PostHog] VITE_POSTHOG_KEY не задан — PostHog выключен");
}


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
   
      <Sentry.ErrorBoundary fallback={<div>Something went wrong</div>}>
      
        <App />
        
      </Sentry.ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
