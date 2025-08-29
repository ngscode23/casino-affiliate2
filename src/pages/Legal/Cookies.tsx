import Seo from "@/components/Seo";
import Section from "@/components/common/section";

export default function Cookies() {
  return (
    <>
      <Seo title="Cookies" description="Cookie usage and preferences." />
      <Section className="prose prose-invert max-w-none">
        <h1>Cookies</h1>
        <p>We use strictly necessary cookies. Analytics/marketing cookies load only after explicit consent.</p>
        <h2>Manage consent</h2>
        <p>Use the cookie bar to change your preferences at any time.</p>
      </Section>
    </>
  );
}


