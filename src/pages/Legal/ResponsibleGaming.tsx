import Section from "@/components/common/section";
import Seo from "@/components/Seo";
import { useT } from "@/lib/useT";

export default function ResponsibleGaming() {
  const t = useT();
  return (
    <>
      <Seo title={t("legal.resp.title") || "Responsible Gaming"} description={t("legal.resp.desc") || "Help and resources for safer play."} noindex />
      <Section className="prose prose-invert max-w-none">
        <h1>{t("legal.resp.title") || "Responsible Gaming"}</h1>
        <p>
          We promote safer play. If gambling stops being fun, take a break and seek help.
        </p>
        <ul>
          <li>Set deposit and loss limits.</li>
          <li>Use self-exclusion tools when needed.</li>
          <li>Seek support (local hotlines, therapy services).</li>
        </ul>
      </Section>
    </>
  );
}


