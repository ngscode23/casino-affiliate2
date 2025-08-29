import Section from "@/components/common/section";
import Seo from "@/components/Seo";

export default function ResponsibleGaming() {
  return (
    <>
      <Seo
        title="Responsible Gaming"
        description="Help and resources for safer play."
        noIndex
      />
      <Section className="prose prose-invert max-w-none">
        <h1>Responsible Gaming</h1>
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


