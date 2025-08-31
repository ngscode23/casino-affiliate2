import Seo from "@/components/Seo";
import Section from "@/components/common/section";
import { useT } from "@/lib/useT";

export default function Privacy() {
  const t = useT();
  return (
    <>
  <Seo title={t("legal.privacy.title") || "Privacy Policy"} description={t("legal.privacy.desc") || "How we collect and use data."} noindex />
      <Section className="prose prose-invert max-w-none">
        <h1>{t("legal.privacy.title") || "Privacy Policy"}</h1>
        <p>We process minimum personal data and follow GDPR principles. See also Cookies page.</p>
        <h2>Data we collect</h2>
        <ul>
          <li>Anonymous analytics (only after consent)</li>
          <li>Contact form submissions (voluntary)</li>
        </ul>
        <p>Contact: privacy@site.example</p>
      </Section>
    </>
  );
}


