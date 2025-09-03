import Seo from "@/components/Seo";
import Section from "@/components/common/section";
import { useT } from "@/lib/useT";

export default function Terms() {
  const t = useT();
  return (
    <>
     <Seo title={t("legal.terms.title") || "Terms & Conditions"} description={t("legal.terms.desc") || "Website terms of use."} noindex />
      <Section className="prose prose-invert max-w-none">
        <h1>{t("legal.terms.title") || "Terms & Conditions"}</h1>
        <p>By using this site you accept these Terms. All offers are subject to partners&apos; T&amp;Cs.</p>
        <h2>Eligibility</h2>
        <p>18+ only. Please gamble responsibly.</p>
      </Section>
    </>
  );
}


