// src/pages/Contact/Contact.tsx
import Section from "@/components/common/section";
import Card from "@/components/common/card";

export default function ContactPage() {
  return (
    <Section className="space-y-6">
      <h1 className="text-2xl font-bold">Contact us</h1>
      <Card className="p-6 space-y-3">
        <p className="text-[var(--text-dim)]">Напишите нам: support@example.com</p>
        <p className="text-[var(--text-dim)]">Это временная страница контактов.</p>
      </Card>
    </Section>
  );
}



