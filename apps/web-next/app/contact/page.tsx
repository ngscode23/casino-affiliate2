import type { Metadata } from "next";
import PageShell from "@ui/components/ui/PageShell";
import SectionCard from "@ui/components/ui/SectionCard";
import { ButtonPrimary } from "@ui/components/ui/Buttons";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach the Neon Shop crew for partnerships, support questions, or press enquiries.",
};

type SearchState = {
  success?: string;
  error?: string;
};

function renderAlert(state: "success" | "error") {
  if (state === "success") {
    return {
      tone: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30",
      text: "Message received. We will respond within one business day.",
    } as const;
  }
  return {
    tone: "bg-rose-500/15 text-rose-200 border border-rose-500/30",
    text: "We could not store your message. Please try again later or email hello@neonshop.dev directly.",
  } as const;
}

export default async function ContactPage({ searchParams }: { searchParams?: Promise<SearchState> }) {
  const sp = (await searchParams) ?? {};
  const { footer } = siteConfig;
  const status = sp.success === "1" ? "success" : sp.error ? "error" : null;
  const alert = status ? renderAlert(status) : null;

  return (
    <PageShell className="text-[color:var(--ui-text)]">
      <div className="space-y-8">
        <div className="space-y-3">
          <span className="tagline">Let&apos;s build together</span>
          <h1 className="text-3xl font-semibold sm:text-4xl">Contact the Neon Shop team</h1>
          <p className="max-w-2xl text-sm text-[color:var(--ui-muted)]">
            Drop us a line and we will reply within one business day. Partnerships, product questions,
            and support requests all land on the same inbox so nothing gets lost.
          </p>
          {alert ? (
            <div className={`rounded-xl px-4 py-3 text-sm ${alert.tone}`} role="status" aria-live="polite">
              {alert.text}
            </div>
          ) : null}
        </div>

        <SectionCard title="Send a message" contentClassName="gap-5">
          <form className="grid max-w-xl gap-4" action="/api/contact" method="post" noValidate>
            <label className="grid gap-2 text-sm">
              <span className="text-[color:var(--ui-muted)]">Full name</span>
              <input
                className="h-11 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-slate-400 focus:border-[rgba(59,130,246,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.35)]"
                name="name"
                placeholder="Ada Lovelace"
                autoComplete="name"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-[color:var(--ui-muted)]">Work email</span>
              <input
                className="h-11 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-slate-400 focus:border-[rgba(59,130,246,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.35)]"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-[color:var(--ui-muted)]">Message</span>
              <textarea
                className="min-h-[140px] rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-[rgba(59,130,246,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.35)]"
                name="message"
                placeholder="Tell us how we can help"
                required
              />
            </label>
            <div>
              <ButtonPrimary
                type="submit"
                className="h-11 rounded-xl bg-[var(--accent)] px-6 text-[var(--accent-foreground)] focus-visible:ring-[var(--ui-accent-20)]"
              >
                Send message
              </ButtonPrimary>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Direct contacts" contentClassName="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-[color:var(--ui-muted)]">Email</div>
              <a className="mt-1 block text-base" href={`mailto:${footer.email}`}>
                {footer.email}
              </a>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-[color:var(--ui-muted)]">Phone</div>
              <a className="mt-1 block text-base" href={`tel:${footer.phone.replace(/[^0-9+]/g, "")}`}>
                {footer.phone}
              </a>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
              <div className="text-sm text-[color:var(--ui-muted)]">Office</div>
              <p className="mt-1 text-base">{footer.address}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}


