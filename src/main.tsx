// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { Sentry } from "@/lib/sentry";
import { initSentry, bindSentryToConsent } from "@/lib/sentry";
import { applyStoredConsentToDom } from "@/lib/consent";
import "./index.css";

// Apply stored consent to DOM and conditionally init Sentry
applyStoredConsentToDom();
initSentry();
bindSentryToConsent();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Sentry.ErrorBoundary fallback={<div>Something went wrong</div>}>
        <App />
      </Sentry.ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);

