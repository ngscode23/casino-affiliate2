// src/pages/Contact/Contact.tsx
import PageShell from "@ui/components/ui/PageShell";
import SectionCard from "@ui/components/ui/SectionCard";
import { ButtonPrimary } from "@ui/components/ui/Buttons";

export default function ContactPage() {
  return (
    <PageShell>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">Связаться с нами</h1>
      <SectionCard title="Связаться с нами">
        <form className="grid gap-4 max-w-xl">
          <input className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/40" placeholder="Ваше имя" name="name" />
          <input className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/40" placeholder="Email" name="email" type="email" />
          <textarea className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/40" rows={5} placeholder="Сообщение" name="message" />
          <div>
            <ButtonPrimary type="submit">Отправить</ButtonPrimary>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}




