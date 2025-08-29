import React from "react";
import { motion } from "framer-motion";
import { Shield, Timer, TrendingUp, Globe, ExternalLink, Star } from "lucide-react";

// Minimal, dependency-light UI primitives
function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/5 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur ${className}`}>
      {children}
    </div>
  );
}

function Button({
  children,
  href,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition-all active:scale-[0.98]";
  const styles =
    variant === "primary"
      ? "bg-emerald-500 text-white hover:bg-emerald-400 shadow"
      : "bg-transparent text-white/80 ring-1 ring-white/15 hover:bg-white/10";
  const Comp: any = href ? "a" : "button";
  return (
    <Comp href={href} className={`${base} ${styles} ${className}`}>
      {children}
    </Comp>
  );
}

// Demo data — replace via props/store later
type Offer = {
  slug: string;
  name: string;
  rating: number;
  payoutHours: number;
  license: "MGA" | "Curaçao" | "UKGC" | "Other";
  link?: string;
};

const DEMO_OFFERS: Offer[] = [
  { slug: "nova", name: "NovaBet", rating: 4.6, payoutHours: 4, license: "MGA", link: "#" },
  { slug: "aurora", name: "AuroraPlay", rating: 4.4, payoutHours: 12, license: "UKGC", link: "#" },
  { slug: "zen", name: "ZenCasino", rating: 4.2, payoutHours: 24, license: "Curaçao", link: "#" },
  { slug: "rapid", name: "RapidWin", rating: 4.1, payoutHours: 2, license: "MGA", link: "#" },
];

function RatingStars({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-1" aria-label={`Rating ${value.toFixed(1)} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            "h-4 w-4 " +
            (i < full
              ? "fill-yellow-400 text-yellow-400"
              : half && i === full
              ? "fill-yellow-400/60 text-yellow-400/60"
              : "text-white/20")
          }
        />
      ))}
      <span className="ml-1 text-xs text-white/70">{value.toFixed(1)}</span>
    </div>
  );
}

function OffersTable({ offers }: { offers: Offer[] }) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
      <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
        <thead className="bg-white/5 text-left text-white/70">
          <tr>
            <th className="px-4 py-3 font-medium">Casino</th>
            <th className="px-4 py-3 font-medium">Rating</th>
            <th className="px-4 py-3 font-medium">Payout (h)</th>
            <th className="px-4 py-3 font-medium">License</th>
            <th className="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((o, idx) => (
            <tr key={o.slug} className={idx % 2 === 0 ? "bg-white/0" : "bg-white/[0.03]"}>
              <td className="px-4 py-3 font-medium text-white">{o.name}</td>
              <td className="px-4 py-3"><RatingStars value={o.rating} /></td>
              <td className="px-4 py-3 text-white/90">{o.payoutHours}</td>
              <td className="px-4 py-3 text-white/80">{o.license}</td>
              <td className="px-4 py-3 text-right">
                <a
                  href={o.link || "#"}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white/90 ring-1 ring-white/15 hover:bg-white/10"
                >
                  Visit <ExternalLink className="h-4 w-4" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Shell-less version for use inside App layout (no Header/Footer duplication)
export function AffiliateHome() {
  return (
    <div className="text-white">
      {/* Hero */}
      <section className="relative overflow-hidden pt-14">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_50%_at_50%_0%,#000_10%,transparent_70%)]">
          <div className="absolute left-1/2 top-0 h-[48rem] w-[48rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        </div>
        <Container>
          <div className="grid items-center gap-10 py-10 md:grid-cols-2 md:py-16">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Find trusted casinos with fast payouts
              </h1>
              <p className="mt-4 max-w-prose text-white/70">
                Data-driven rankings, licensing checks, and payout speed tests. No fluff, no fake reviews. Compare options in seconds and avoid traps.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href="/compare" className="">Compare now</Button>
                <Button href="/how-we-rank" variant="ghost">How we rank</Button>
              </div>
              <div className="mt-6 grid max-w-lg grid-cols-3 gap-3 text-sm text-white/70">
                <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">Verified licenses</div>
                <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">Payout speed tested</div>
                <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">No KYC traps</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className=""
            >
              <Card className="border border-white/10">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/70">Top picks today</h3>
                <OffersTable offers={DEMO_OFFERS} />
                <div className="mt-4 text-right">
                  <Button href="/compare" variant="ghost">See all</Button>
                </div>
              </Card>
            </motion.div>
          </div>
        </Container>
      </section>
      {/* Value props */}
      <section className="py-12 md:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="font-semibold">Safety first</div>
                  <p className="text-sm text-white/70">Licenses, audits, T&Cs sanity-check. We flag predatory behavior.</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-start gap-3">
                <Timer className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="font-semibold">Fast payouts</div>
                  <p className="text-sm text-white/70">We test withdrawal times and rank accordingly.</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="font-semibold">Real metrics</div>
                  <p className="text-sm text-white/70">No vague stars. Clear rating formula and weights.</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="font-semibold">Jurisdiction-aware</div>
                  <p className="text-sm text-white/70">Filters by country, payment rails, and KYC policies.</p>
                </div>
              </div>
            </Card>
          </div>
        </Container>
      </section>
      {/* FAQ */}
      <section className="pb-16">
        <Container>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <details className="group">
                <summary className="cursor-pointer list-none font-semibold">How do you rank casinos?</summary>
                <p className="mt-2 text-sm text-white/70">Weighted formula: license (30%), payout speed (30%), player reports (20%), UX (10%), transparency (10%).</p>
              </details>
            </Card>
            <Card>
              <details className="group">
                <summary className="cursor-pointer list-none font-semibold">Is this site for 18+ only?</summary>
                <p className="mt-2 text-sm text-white/70">Yes. Gambling involves risk. If you feel pressure, seek help. Links in Responsible Gaming.</p>
              </details>
            </Card>
            <Card>
              <details className="group">
                <summary className="cursor-pointer list-none font-semibold">Do you earn commissions?</summary>
                <p className="mt-2 text-sm text-white/70">We may receive affiliate commissions. This never overrides safety or ranking logic.</p>
              </details>
            </Card>
            <Card>
              <details className="group">
                <summary className="cursor-pointer list-none font-semibold">Country restrictions?</summary>
                <p className="mt-2 text-sm text-white/70">Some brands block DE/UA and others. Use filters on the compare page.</p>
              </details>
            </Card>
          </div>
        </Container>
      </section>
    </div>
  );
}

// Full-page variant with its own simple header/footer (kept for standalone usage)
export default function AffiliateHome_v1() {
  return (
    <div className="text-white">
      {/* Header (simple inline version to match snippet intent) */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/30 backdrop-blur">
        <Container>
          <div className="flex h-14 items-center justify-between">
            <div className="font-semibold tracking-tight">SITE_NAME</div>
            <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
              <a className="hover:text-white" href="/compare">Compare</a>
              <a className="hover:text-white" href="/guides">Guides</a>
              <a className="hover:text-white" href="/about">About</a>
            </nav>
            <div className="flex items-center gap-3">
              <Button href="/compare">Start comparing</Button>
              <span className="hidden text-xs text-white/60 md:inline">18+ Responsible</span>
            </div>
          </div>
        </Container>
      </header>

      <AffiliateHome />

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 text-sm text-white/70">
        <Container>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <div className="font-semibold text-white">SITE_NAME</div>
              <p className="mt-2 max-w-prose">Independent comparisons. No deposit handling. Information only.</p>
            </div>
            <div className="flex gap-6">
              <ul className="space-y-2">
                <li><a href="/disclosure" className="hover:text-white">Affiliate disclosure</a></li>
                <li><a href="/responsible" className="hover:text-white">Responsible gaming</a></li>
                <li><a href="/privacy" className="hover:text-white">Privacy</a></li>
              </ul>
              <ul className="space-y-2">
                <li><a href="/about" className="hover:text-white">About</a></li>
                <li><a href="/contact" className="hover:text-white">Contact</a></li>
                <li><a href="/impressum" className="hover:text-white">Impressum</a></li>
              </ul>
            </div>
            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="font-semibold text-white">18+ Warning</div>
              <p className="mt-2">Gambling is risky. If you feel you are losing control, avoid playing and get support.</p>
            </div>
          </div>
          <div className="mt-8 text-center text-xs">© {new Date().getFullYear()} SITE_NAME. All rights reserved.</div>
        </Container>
      </footer>
    </div>
  );
}
