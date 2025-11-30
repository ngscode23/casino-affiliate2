'use client';;
import { headingLgOnDark, overlineLight } from "@/styles/classnames";

import { useEffect, useMemo, useState, type ReactNode, type ReactElement } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  Brush,
  CheckCircle2,
  Clock,
  Coins,
  Link2,
  ListChecks,
  PlusCircle,
  ShieldCheck,
  Trash,
  UploadCloud,
  Users,
} from "lucide-react";

import Skeleton from "@ui/components/common/skeleton";
import { toast } from "@ui/components/common/toast";

import {
  DEFAULT_SETUP_SETTINGS,
  generateTrackingToken,
  loadSetup,
  normalizeSetupSettings,
  saveSetup,
  type CustomSetupStep,
  type SetupSettings,
  type SetupStepStatus,
} from "@/lib/admin/setup";
import { AnalyticsTile as Tile, ANALYTICS_KPI_LABEL as KPI_LABEL_CLASS } from "../analytics/tiles";

type StepStatus = SetupStepStatus;
type StepDefinition = { id: string; title: string; description: string; status: StepStatus };

const STEP_STATUS_OPTIONS: Array<{ value: StepStatus; label: string }> = [
  { value: "todo", label: "Pending" },
  { value: "in-progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const STATUS_STYLES: Record<StepStatus, string> = {
  done: "bg-emerald-500/10 text-emerald-300 border-emerald-400/20",
  "in-progress": "bg-sky-500/10 text-sky-300 border-sky-400/20",
  todo: "bg-white/5 text-slate-400 border-white/10",
};

const STATUS_ICON: Record<StepStatus, ReactElement> = {
  done: <CheckCircle2 size={16} className="text-emerald-300" aria-hidden />,
  "in-progress": <Clock size={16} className="text-sky-300" aria-hidden />,
  todo: <ShieldCheck size={16} className="text-slate-400 opacity-70" aria-hidden />,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROVIDERS = [
  { value: "", label: "Select provider" },
  { value: "stripe", label: "Stripe" },
  { value: "skrill", label: "Skrill" },
  { value: "manual", label: "Manual payout" },
] as const;

const CURRENCIES = ["EUR", "USD", "GBP"] as const;

const COMPLIANCE_FIELDS = [
  { key: "termsUrl", label: "Terms & Conditions", placeholder: "https://www.example.com/terms" },
  { key: "privacyUrl", label: "Privacy Policy", placeholder: "https://www.example.com/privacy" },
  { key: "responsibleUrl", label: "Responsible Gaming", placeholder: "https://www.example.com/responsible" },
  { key: "cookieUrl", label: "Cookie Policy", placeholder: "https://www.example.com/cookies" },
] as const;

const RESOURCE_CARDS = [
  {
    icon: <Brush size={14} aria-hidden />,
    title: "Brand guideline template",
    description: "Download editable slides for partner onboarding.",
  },
  {
    icon: <ShieldCheck size={14} aria-hidden />,
    title: "Compliance checklist",
    description: "Jurisdiction requirements and document reminders.",
  },
  {
    icon: <Users size={14} aria-hidden />,
    title: "Partner FAQ",
    description: "Shareable article answering top affiliate questions.",
  },
] as const;

const CUSTOM_STEP_FALLBACK_TITLE = "Custom milestone";
const CUSTOM_STEP_FALLBACK_DESCRIPTION = "Add details so your team knows what to do.";

function stepStatus(done: boolean, partial: boolean): StepStatus {
  if (done) return "done";
  if (partial) return "in-progress";
  return "todo";
}

function createCustomStep(): CustomSetupStep {
  let id: string | null = null;
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      id = crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  if (!id) {
    id = `custom_${Math.random().toString(36).slice(2, 12)}`;
  }
  return {
    id,
    title: "",
    description: "",
    status: "todo",
  };
}

function resolveCustomStepTitle(step: CustomSetupStep, index: number): string {
  const trimmed = step.title.trim();
  if (trimmed.length > 0) return trimmed;
  return `${CUSTOM_STEP_FALLBACK_TITLE} ${index + 1}`;
}

function resolveCustomStepDescription(step: CustomSetupStep): string {
  const trimmed = step.description.trim();
  if (trimmed.length > 0) return trimmed;
  return CUSTOM_STEP_FALLBACK_DESCRIPTION;
}

function computeSteps(settings: SetupSettings): StepDefinition[] {
  const brandingDone = settings.brandName.length > 0 && settings.contactEmail.length > 0;
  const brandingPartial =
    !brandingDone &&
    [settings.brandName, settings.contactEmail, settings.logoLightUrl, settings.logoDarkUrl].some((value) => value.length > 0);

  const payoutDone =
    Boolean(settings.payoutProvider) && Boolean(settings.payoutCurrency) && settings.payoutThreshold !== null;
  const payoutPartial =
    !payoutDone &&
    [settings.payoutProvider, settings.payoutCurrency, settings.payoutWebhookUrl].some((value) => value.length > 0);

  const trackingDone = Boolean(settings.trackingToken) && Boolean(settings.postbackUrl);
  const trackingPartial =
    !trackingDone && [settings.trackingToken, settings.postbackUrl].some((value) => value.length > 0);

  const complianceDone =
    Boolean(settings.termsUrl) &&
    Boolean(settings.privacyUrl) &&
    Boolean(settings.responsibleUrl) &&
    Boolean(settings.cookieUrl);
  const compliancePartial =
    !complianceDone &&
    [settings.termsUrl, settings.privacyUrl, settings.responsibleUrl, settings.cookieUrl].some((value) => value.length > 0);

  const teamDone = settings.pendingInvites.length > 0;
  const teamPartial =
    !teamDone && (settings.notificationsEmail || settings.notificationsSlack || settings.slackWebhookUrl.length > 0);

  const builtIn: StepDefinition[] = [
    {
      id: "brand",
      title: "Fill organisation profile",
      description: "Add brand name, contact email and branding assets.",
      status: stepStatus(brandingDone, brandingPartial),
    },
    {
      id: "payouts",
      title: "Configure payouts",
      description: "Choose default currency, threshold and provider credentials.",
      status: stepStatus(payoutDone, payoutPartial),
    },
    {
      id: "tracking",
      title: "Embed tracking",
      description: "Install the JavaScript snippet and configure postbacks.",
      status: stepStatus(trackingDone, trackingPartial),
    },
    {
      id: "compliance",
      title: "Publish legal content",
      description: "Upload Terms & Conditions, privacy and responsible gaming docs.",
      status: stepStatus(complianceDone, compliancePartial),
    },
    {
      id: "team",
      title: "Invite team members",
      description: "Send invites and configure notification channels.",
      status: stepStatus(teamDone, teamPartial),
    },
  ];

  const customSteps = settings.customSteps.map((step, index) => ({
    id: `custom-${step.id}`,
    title: resolveCustomStepTitle(step, index),
    description: resolveCustomStepDescription(step),
    status: step.status,
  }));

  return [...builtIn, ...customSteps];
}
function formatTimestamp(value: string | null): string {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "never";
  return date.toLocaleString();
}

function useDirtyFlag(settings: SetupSettings, baseline: SetupSettings | null): boolean {
  return useMemo(() => {
    if (!baseline) return false;
    return JSON.stringify(baseline) !== JSON.stringify(settings);
  }, [baseline, settings]);
}

function SectionCard({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <Tile tone="muted" className="space-y-5">
      <div className="flex items-center gap-3">
        {icon}
        <h2 className={headingLgOnDark}>{title}</h2>
      </div>
      {description ? <p className="text-sm text-slate-200">{description}</p> : null}
      {children}
    </Tile>
  );
}
export default function AdminSetupPage() {
  const [settings, setSettings] = useState<SetupSettings>(DEFAULT_SETUP_SETTINGS);
  const [baseline, setBaseline] = useState<SetupSettings | null>(null);
  const [inviteInput, setInviteInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const steps = useMemo(() => computeSteps(settings), [settings]);
  const completedSteps = useMemo(() => steps.filter((step) => step.status === "done").length, [steps]);
  const inProgressIndex = steps.findIndex((step) => step.status === "in-progress");
  const currentStep =
    steps.length === 0
      ? 0
      : completedSteps === steps.length
        ? steps.length
        : inProgressIndex !== -1
          ? inProgressIndex + 1
          : Math.min(completedSteps + 1, steps.length);
  const progressPct = steps.length === 0 ? 0 : Math.round((completedSteps / steps.length) * 100);
  const isDirty = useDirtyFlag(settings, baseline);
  const lastUpdatedLabel = formatTimestamp(lastUpdated);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await loadSetup();
        if (!active) return;
        const normalized = normalizeSetupSettings(response.settings);
        setSettings(normalized);
        setBaseline(normalized);
        setLastUpdated(response.updatedAt);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Failed to load setup data";
        toast(message, { variant: "error" });
        setSettings(DEFAULT_SETUP_SETTINGS);
        setBaseline(DEFAULT_SETUP_SETTINGS);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const snippetToken = settings.trackingToken || "YOUR_TOKEN";
  const snippetCode = `<script src="https://cdn.casino-affiliate.io/tracker.js" data-token="${snippetToken}"></script>`;

  async function handleSave() {
    setSaving(true);
    try {
      const response = await saveSetup(settings);
      const normalized = normalizeSetupSettings(response.settings);
      setSettings(normalized);
      setBaseline(normalized);
      setLastUpdated(response.updatedAt ?? new Date().toISOString());
      toast("Setup saved", { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save setup";
      toast(message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleCopySnippet() {
    try {
      await navigator.clipboard.writeText(snippetCode);
      toast("Tracking snippet copied", { variant: "success" });
    } catch {
      toast("Unable to copy snippet", { variant: "error" });
    }
  }

  function handleInviteAdd() {
    const email = inviteInput.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_REGEX.test(email)) {
      toast("Введите корректный email", { variant: "error" });
      return;
    }
    if (settings.pendingInvites.includes(email)) {
      toast("Такой email уже добавлен", { variant: "info" });
      return;
    }
    setSettings((prev) => ({
      ...prev,
      pendingInvites: [...prev.pendingInvites, email],
    }));
    setInviteInput("");
  }

  function handleInviteRemove(email: string) {
    setSettings((prev) => ({
      ...prev,
      pendingInvites: prev.pendingInvites.filter((item) => item !== email),
    }));
  }

  function handlePayoutThresholdChange(value: string) {
    if (!value.trim()) {
      setSettings((prev) => ({ ...prev, payoutThreshold: null }));
      return;
    }
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      setSettings((prev) => ({ ...prev, payoutThreshold: parsed }));
    }
  }

  function handleCustomStepAdd() {
    setSettings((prev) => ({
      ...prev,
      customSteps: [...prev.customSteps, createCustomStep()],
    }));
  }

  function handleCustomStepUpdate(stepId: string, patch: Partial<CustomSetupStep>) {
    setSettings((prev) => ({
      ...prev,
      customSteps: prev.customSteps.map((step) => (step.id === stepId ? { ...step, ...patch, id: step.id } : step)),
    }));
  }

  function handleCustomStepRemove(stepId: string) {
    setSettings((prev) => ({
      ...prev,
      customSteps: prev.customSteps.filter((step) => step.id !== stepId),
    }));
  }

  if (loading) {
    return (
      <div className="space-y-8 pb-12">
        <Tile tone="accent" className="space-y-4">
          <Skeleton className="h-6 w-40 rounded-xl" />
          <Skeleton className="h-10 w-2/3 rounded-xl" />
          <Skeleton className="h-4 w-1/2 rounded-xl" />
        </Tile>
        <Tile tone="base" className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-3xl" />
          ))}
        </Tile>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Tile key={index} tone="muted" className="space-y-4">
              <Skeleton className="h-5 w-1/3 rounded-xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </Tile>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-8 pb-12">
      <Tile tone="accent" className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className={KPI_LABEL_CLASS}>Getting started</div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Set up your affiliate hub</h1>
            <p className="text-sm text-slate-300">
              Complete the checklist below to launch campaigns, track conversions, and pay your partners without friction.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 text-xs uppercase tracking-[0.35em] text-slate-400 sm:flex-row sm:items-center">
            <span className="rounded-full border border-white/10 bg-white/10 px-4 py-1">
              Step {Math.max(currentStep, 1)} of {steps.length}
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-emerald-300">
              {progressPct}% complete
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/20 hover:bg-white/15 disabled:opacity-60"
              onClick={handleSave}
              disabled={saving || !isDirty}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
          <span>Need help?</span>
          <Link
            href="mailto:support@casino-affiliate.help"
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-slate-200 transition hover:border-white/25 hover:bg-white/15"
          >
            Contact support
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </Tile>
      <Tile tone="base" className="space-y-6">
        <div className="space-y-2">
          <div className={KPI_LABEL_CLASS}>Checklist</div>
          <h2 className="text-xl font-semibold text-white">Launch milestones</h2>
        </div>
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className="grid gap-3 rounded-3xl border border-white/8 bg-[#0d1522]/80 p-4 shadow-[0_18px_35px_rgba(8,12,32,0.45)] sm:grid-cols-[auto,1fr]"
            >
              <span
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.25em] ${STATUS_STYLES[step.status]}`}
              >
                {STATUS_ICON[step.status]}
                {step.status === "done" ? "Done" : step.status === "in-progress" ? "In progress" : "Pending"}
              </span>
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-white">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-300">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {isDirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <span className="rounded-full border border-white/5 px-3 py-1 text-slate-300">
            Last saved {lastUpdatedLabel}
          </span>
        </div>
      </Tile>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          icon={<Brush size={18} className="text-sky-300" aria-hidden />}
          title="Branding & contacts"
          description="These details appear in partner dashboards and transactional emails."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className={overlineLight}>Brand name</span>
              <input
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                placeholder="Lucky Dice Media"
                value={settings.brandName}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    brandName: event.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-2">
              <span className={overlineLight}>Contact email</span>
              <input
                type="email"
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                placeholder="partners@lucky.example"
                value={settings.contactEmail}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactEmail: event.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-2">
              <span className={overlineLight}>Logo (light)</span>
              <input
                type="url"
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                placeholder="https://cdn.example.com/logo-light.svg"
                value={settings.logoLightUrl}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    logoLightUrl: event.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-2">
              <span className={overlineLight}>Logo (dark)</span>
              <input
                type="url"
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                placeholder="https://cdn.example.com/logo-dark.svg"
                value={settings.logoDarkUrl}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    logoDarkUrl: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard
          icon={<Coins size={18} className="text-amber-300" aria-hidden />}
          title="Payouts"
          description="Default values that apply to new partners. You can override them later."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className={overlineLight}>Provider</span>
              <select
                className="h-11 w-full rounded-2xl border border-white/10 bg-[#0b1524]/80 px-3 text-sm text-slate-100 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                value={settings.payoutProvider}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    payoutProvider: event.target.value,
                  }))
                }
              >
                {PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className={overlineLight}>Default currency</span>
              <select
                className="h-11 w-full rounded-2xl border border-white/10 bg-[#0b1524]/80 px-3 text-sm text-slate-100 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                value={settings.payoutCurrency}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    payoutCurrency: event.target.value.toUpperCase(),
                  }))
                }
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className={overlineLight}>Payout threshold</span>
              <input
                type="number"
                min={0}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                placeholder="100"
                value={settings.payoutThreshold ?? ""}
                onChange={(event) => handlePayoutThresholdChange(event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className={overlineLight}>Webhook URL</span>
              <input
                type="url"
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                placeholder="https://api.example.com/payouts/webhook"
                value={settings.payoutWebhookUrl}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    payoutWebhookUrl: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        </SectionCard>
        <SectionCard
          icon={<Link2 size={18} className="text-sky-300" aria-hidden />}
          title="Tracking & integrations"
          description="Connect your landing pages and analytics stack to record sessions and conversions."
        >
          <div className="space-y-3">
            <label className="space-y-2">
              <span className={overlineLight}>Tracking token</span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                  value={settings.trackingToken}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      trackingToken: event.target.value.trim(),
                    }))
                  }
                  placeholder="auto-generated token"
                />
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      trackingToken: generateTrackingToken(),
                    }))
                  }
                >
                  Regenerate
                </button>
              </div>
            </label>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-slate-200">
              <div className="mb-2 font-semibold uppercase tracking-[0.3em] text-slate-400">JS snippet</div>
              <pre className="overflow-x-auto text-[11px] text-slate-300">
                <code>{snippetCode}</code>
              </pre>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-100 transition hover:border-white/25 hover:bg-white/15"
                  onClick={handleCopySnippet}
                >
                  Copy snippet
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-100 transition hover:border-white/20 hover:bg-white/10"
                  onClick={() => toast("Postback configuration coming soon", { variant: "info" })}
                >
                  Configure postbacks
                </button>
              </div>
            </div>
            <label className="space-y-2">
              <span className={overlineLight}>Postback URL</span>
              <input
                type="url"
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                placeholder="https://api.example.com/postbacks"
                value={settings.postbackUrl}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    postbackUrl: event.target.value,
                  }))
                }
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                  settings.googleAnalytics
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
                }`}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    googleAnalytics: !prev.googleAnalytics,
                  }))
                }
              >
                {settings.googleAnalytics ? "Google Analytics enabled" : "Enable Google Analytics"}
              </button>
            </div>
          </div>
        </SectionCard>
        <SectionCard
          icon={<UploadCloud size={18} className="text-rose-300" aria-hidden />}
          title="Content & compliance"
          description="Store links to your latest documents to stay compliant."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {COMPLIANCE_FIELDS.map((field) => (
              <label key={field.key} className="space-y-2">
                <span className={overlineLight}>{field.label}</span>
                <input
                  type="url"
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                  placeholder={field.placeholder}
                  value={settings[field.key]}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.3em] text-slate-400">
            Compliance tip: tailor messaging to each jurisdiction and include age gating where required.
          </div>
        </SectionCard>

        <SectionCard
          icon={<Users size={18} className="text-violet-300" aria-hidden />}
          title="Team & permissions"
          description="Invite teammates to access analytics, approve reviews, and manage payouts."
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
              placeholder="teammate@example.com"
              value={inviteInput}
              onChange={(event) => setInviteInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleInviteAdd();
                }
              }}
            />
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/20 hover:bg-white/15"
              onClick={handleInviteAdd}
            >
              Invite teammate
            </button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Pending invites</div>
            {settings.pendingInvites.length === 0 ? (
              <p className="mt-2 text-sm text-slate-300">No pending invitations yet.</p>
            ) : (
              <div className="mt-2 space-y-2 text-sm text-slate-200">
                {settings.pendingInvites.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/30 px-3 py-2"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-200 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
                      onClick={() => handleInviteRemove(email)}
                    >
                      <Trash size={12} />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          icon={<BellRing size={18} className="text-amber-300" aria-hidden />}
          title="Notifications"
          description="Choose how the team is notified about new conversions, reviews, and registrations."
        >
          <div className="space-y-3">
            <button
              type="button"
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                settings.notificationsEmail
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
              }`}
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  notificationsEmail: !prev.notificationsEmail,
                }))
              }
            >
              <span>Email alerts</span>
              <span className="text-xs uppercase tracking-[0.25em]">
                {settings.notificationsEmail ? "Enabled" : "Disabled"}
              </span>
            </button>
            <button
              type="button"
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                settings.notificationsSlack
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
              }`}
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  notificationsSlack: !prev.notificationsSlack,
                }))
              }
            >
              <span>Slack webhooks</span>
              <span className="text-xs uppercase tracking-[0.25em]">
                {settings.notificationsSlack ? "Enabled" : "Disabled"}
              </span>
            </button>
            <label className="space-y-2">
              <span className={overlineLight}>Slack webhook URL</span>
              <input
                type="url"
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                placeholder="https://hooks.slack.com/services/..."
                value={settings.slackWebhookUrl}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    slackWebhookUrl: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard
          icon={<ListChecks size={18} className="text-lime-300" aria-hidden />}
          title="Custom launch tasks"
          description="Extend the checklist with team-specific milestones."
        >
          <div className="space-y-4">
            {settings.customSteps.length === 0 ? (
              <p className="text-sm text-slate-300">
                No custom milestones yet. Add one to track workstreams unique to your affiliate program.
              </p>
            ) : (
              settings.customSteps.map((step, index) => (
                <div key={step.id} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <label className="flex-1 space-y-2">
                      <span className={overlineLight}>Title</span>
                      <input
                        className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                        placeholder={`Custom milestone ${index + 1}`}
                        value={step.title}
                        onChange={(event) => handleCustomStepUpdate(step.id, { title: event.target.value })}
                      />
                    </label>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-200 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
                      onClick={() => handleCustomStepRemove(step.id)}
                    >
                      <Trash size={12} />
                      Remove
                    </button>
                  </div>
                  <label className="space-y-2">
                    <span className={overlineLight}>Description</span>
                    <textarea
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                      placeholder="Explain the outcome or deliverables for this milestone."
                      value={step.description}
                      onChange={(event) => handleCustomStepUpdate(step.id, { description: event.target.value })}
                    />
                  </label>
                  <label className="block space-y-2 sm:w-60">
                    <span className={overlineLight}>Status</span>
                    <select
                      className="h-11 w-full rounded-2xl border border-white/10 bg-[#0b1524]/80 px-3 text-sm text-slate-100 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
                      value={step.status}
                      onChange={(event) => {
                        const nextStatus = event.target.value as StepStatus;
                        if (STEP_STATUS_OPTIONS.some((option) => option.value === nextStatus)) {
                          handleCustomStepUpdate(step.id, { status: nextStatus });
                        }
                      }}
                    >
                      {STEP_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))
            )}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/20 hover:bg-white/15"
              onClick={handleCustomStepAdd}
            >
              <PlusCircle size={16} />
              Add milestone
            </button>
          </div>
        </SectionCard>
      </div>
      <Tile tone="muted" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className={KPI_LABEL_CLASS}>Resources</div>
            <h2 className={headingLgOnDark}>Need a hand with launch?</h2>
          </div>
          <Link
            href="https://partner-playbook.example/setup"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/20 hover:bg-white/15"
          >
            Read playbook
            <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {RESOURCE_CARDS.map((card, index) => (
            <div key={index} className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                {card.icon}
                {card.title}
              </div>
              <p className="mt-2 text-sm text-slate-300">{card.description}</p>
            </div>
          ))}
        </div>
      </Tile>
    </div>
  );
}
