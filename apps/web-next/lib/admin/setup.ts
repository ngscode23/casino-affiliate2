import { adminFetch } from "@shared/lib/api";

import {
  DEFAULT_SETUP_SETTINGS,
  generateTrackingToken,
  normalizeSetupSettings,
  type SetupSettings,
} from "./setup-shared";

type ApiPayload = {
  ok?: boolean;
  message?: string;
  settings?: unknown;
  updatedAt?: string | null;
};

export type SetupResponse = {
  settings: SetupSettings;
  updatedAt: string | null;
};

const ENDPOINT = "/api/admin/setup";

function resolveResponse(payload: ApiPayload | null | undefined): SetupResponse {
  if (payload?.ok === false) {
    throw new Error(payload.message || "Failed to load setup");
  }
  const normalized = normalizeSetupSettings(payload?.settings ?? DEFAULT_SETUP_SETTINGS);
  return {
    settings: normalized,
    updatedAt: payload?.updatedAt ?? null,
  };
}

export async function loadSetup(): Promise<SetupResponse> {
  const response = await adminFetch(ENDPOINT, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  const payload = (await response.json()) as ApiPayload;
  return resolveResponse(payload);
}

export async function saveSetup(settings: SetupSettings): Promise<SetupResponse> {
  const response = await adminFetch(ENDPOINT, {
    method: "PUT",
    cache: "no-store",
    body: JSON.stringify({ settings }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  const payload = (await response.json()) as ApiPayload;
  return resolveResponse(payload);
}

export {
  DEFAULT_SETUP_SETTINGS,
  generateTrackingToken,
  normalizeSetupSettings,
  type SetupSettings,
  type CustomSetupStep,
  type SetupStepStatus,
} from "./setup-shared";
