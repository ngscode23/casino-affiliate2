export type SetupStepStatus = "todo" | "in-progress" | "done";

export type CustomSetupStep = {
  id: string;
  title: string;
  description: string;
  status: SetupStepStatus;
};

export type SetupSettings = {
  brandName: string;
  contactEmail: string;
  logoLightUrl: string;
  logoDarkUrl: string;
  payoutProvider: string;
  payoutCurrency: string;
  payoutThreshold: number | null;
  payoutWebhookUrl: string;
  trackingToken: string;
  postbackUrl: string;
  googleAnalytics: boolean;
  termsUrl: string;
  privacyUrl: string;
  responsibleUrl: string;
  cookieUrl: string;
  notificationsEmail: boolean;
  notificationsSlack: boolean;
  slackWebhookUrl: string;
  pendingInvites: string[];
  customSteps: CustomSetupStep[];
};

export const DEFAULT_SETUP_SETTINGS: SetupSettings = {
  brandName: "",
  contactEmail: "",
  logoLightUrl: "",
  logoDarkUrl: "",
  payoutProvider: "",
  payoutCurrency: "EUR",
  payoutThreshold: null,
  payoutWebhookUrl: "",
  trackingToken: "",
  postbackUrl: "",
  googleAnalytics: false,
  termsUrl: "",
  privacyUrl: "",
  responsibleUrl: "",
  cookieUrl: "",
  notificationsEmail: true,
  notificationsSlack: false,
  slackWebhookUrl: "",
  pendingInvites: [],
  customSteps: [],
};

export function generateTrackingToken(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    }
  } catch {
    // fall through to random fallback
  }
  const random = () => Math.random().toString(36).slice(2);
  return `${random()}${random()}`.slice(0, 24);
}

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return fallback;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
  }
  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result = value
    .map((item) => toStringValue(item))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return Array.from(new Set(result));
}

const STEP_STATUS_SET = new Set<SetupStepStatus>(["todo", "in-progress", "done"]);

function toStepStatus(value: unknown, fallback: SetupStepStatus = "todo"): SetupStepStatus {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase() as SetupStepStatus;
    if (STEP_STATUS_SET.has(normalized)) {
      return normalized;
    }
  }
  return fallback;
}

function createCustomStepId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `step_${Math.random().toString(36).slice(2, 12)}`;
}

function normalizeCustomSteps(value: unknown): CustomSetupStep[] {
  if (!Array.isArray(value)) return [];

  const unique = new Map<string, CustomSetupStep>();

  for (const item of value) {
    const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const id = toStringValue(source.id);
    const step: CustomSetupStep = {
      id: id || createCustomStepId(),
      title: toStringValue(source.title),
      description: toStringValue(source.description),
      status: toStepStatus(source.status),
    };
    if (!unique.has(step.id)) {
      unique.set(step.id, step);
    }
  }

  return Array.from(unique.values());
}

export function normalizeSetupSettings(input: unknown): SetupSettings {
  const base: SetupSettings = { ...DEFAULT_SETUP_SETTINGS };
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  base.brandName = toStringValue(source.brandName, base.brandName);
  base.contactEmail = toStringValue(source.contactEmail, base.contactEmail);
  base.logoLightUrl = toStringValue(source.logoLightUrl, base.logoLightUrl);
  base.logoDarkUrl = toStringValue(source.logoDarkUrl, base.logoDarkUrl);
  base.payoutProvider = toStringValue(source.payoutProvider, base.payoutProvider);
  const payoutCurrency = toStringValue(source.payoutCurrency, base.payoutCurrency).toUpperCase();
  base.payoutCurrency = payoutCurrency || base.payoutCurrency;
  base.payoutThreshold = toNumberOrNull(source.payoutThreshold);
  base.payoutWebhookUrl = toStringValue(source.payoutWebhookUrl, base.payoutWebhookUrl);
  base.trackingToken = toStringValue(source.trackingToken, base.trackingToken);
  base.postbackUrl = toStringValue(source.postbackUrl, base.postbackUrl);
  base.googleAnalytics = toBoolean(source.googleAnalytics, base.googleAnalytics);
  base.termsUrl = toStringValue(source.termsUrl, base.termsUrl);
  base.privacyUrl = toStringValue(source.privacyUrl, base.privacyUrl);
  base.responsibleUrl = toStringValue(source.responsibleUrl, base.responsibleUrl);
  base.cookieUrl = toStringValue(source.cookieUrl, base.cookieUrl);
  base.notificationsEmail = toBoolean(source.notificationsEmail, base.notificationsEmail);
  base.notificationsSlack = toBoolean(source.notificationsSlack, base.notificationsSlack);
  base.slackWebhookUrl = toStringValue(source.slackWebhookUrl, base.slackWebhookUrl);
  base.pendingInvites = toStringArray(source.pendingInvites);
  base.customSteps = normalizeCustomSteps(source.customSteps);

  if (!base.trackingToken) {
    base.trackingToken = generateTrackingToken();
  }

  return base;
}
