import Seo from "@/components/Seo";
import Section from "@/components/common/section";
import { useT } from "@/lib/useT";

export default function Cookies() {
  const t = useT();
  return (
    <>
      <Seo title={t("legal.cookies.title") || "Cookies"} description={t("legal.cookies.desc") || "Cookie usage and preferences."} />
      <Section className="prose prose-invert max-w-none">
        <h1>{t("legal.cookies.title") || "Cookies"}</h1>
        <p>We use strictly necessary cookies. Analytics/marketing cookies load only after explicit consent.</p>
        <h2>Manage consent</h2>
        <p>Use the cookie bar to change your preferences at any time.</p>
      </Section>
    </>
  );
}


