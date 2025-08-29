import Seo from "@/components/Seo";
import Section from "@/components/common/section";

export default function AffiliateDisclosure() {
  return (
    <>
     <Seo title="Affiliate Disclosure" description="How we make money." noindex />
      <Section className="prose prose-invert max-w-none">
        <h1>Affiliate Disclosure</h1>
        <p>Some links are affiliate. We may earn a commission at no extra cost to you. Opinions are our own.</p>
      </Section>
    </>
  );
}


