// src/pages/HowWeRank/index.tsx
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Seo from "@/components/Seo";
import { SITE_URL } from "@/config";
import { useT } from "@/lib/useT";
import { Pill } from "@/components/ui/Pill";

export default function HowWeRankPage() {
  const t = useT();
  const origin = SITE_URL.replace(/\/$/, "");

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: t("how.title") || "How we rank",
      url: `${origin}/how-we-rank`,
      description: t("how.lead") || "Our ranking methodology",
    },
  ];

  return (
    <PageShell>
      <Seo
        title={t("how.title") || "How we rank"}
        description={t("how.lead") || "Ranking methodology: licenses, payout speed and transparency."}
        canonical={`${origin}/how-we-rank`}
        jsonLd={jsonLd}
      />

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">{t("how.title") || "How we rank"}</h1>

      <SectionCard>
        <p className="text-[var(--text-dim)]">{t("how.lead") || "We verify licenses, test payout speed and check terms for transparency. No fluff or paid placements in core rankings."}</p>
      </SectionCard>

      <SectionCard title={t("how.criteriaTitle") || "What we consider"}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {["licenses","payout","methods","jurisdiction","transparency","ux"].map((k) => (
            <div key={k} className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Pill>{
                  t(`how.criteria.${k}` as any) ||
                  ({ licenses: "Licenses & audit", payout: "Payout speed", methods: "Payment methods", jurisdiction: "Jurisdiction & KYC", transparency: "Transparency", ux: "Player support" } as any)[k]
                }</Pill>
              </div>
              <p className="text-sm text-[var(--text-dim)]">
                {k === "licenses" && (t("how.desc.licenses") || "Official license checks (MGA/UKGC/etc.), brand background and compliance signals.")}
                {k === "payout" && (t("how.desc.payout") || "Test withdrawals and measure time to account for popular methods.")}
                {k === "methods" && (t("how.desc.methods") || "Range of deposit/withdrawal methods with clear fees and limits.")}
                {k === "jurisdiction" && (t("how.desc.jurisdiction") || "Country restrictions, KYC flow, and fairness of additional checks.")}
                {k === "transparency" && (t("how.desc.transparency") || "Readable terms, bonus conditions and absence of hidden traps.")}
                {k === "ux" && (t("how.desc.ux") || "Support responsiveness and resolution quality for common cases.")}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("how.methodTitle") || "Method in 3 steps"}>
        <ol className="list-decimal pl-5 space-y-2">
          <li>{t("how.step1") || "Collect data: licenses, payments, limits, KYC, community signals."}</li>
          <li>{t("how.step2") || "Test withdrawals and record actual payout timing by method."}</li>
          <li>{t("how.step3") || "Weight metrics to get a final score without manual tweaking."}</li>
        </ol>
      </SectionCard>

      <SectionCard title={t("how.disclosureTitle") || "Disclosure"}>
        <p className="text-sm text-[var(--text-dim)]">
          {t("how.disclosureText") ||
            "We use affiliate links. Sponsored placements are labeled and do not affect the methodology or core rankings."}
        </p>
      </SectionCard>
    </PageShell>
  );
}

