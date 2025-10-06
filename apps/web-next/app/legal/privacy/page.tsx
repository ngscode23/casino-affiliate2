import type { Metadata } from "next";
import SectionCard from "@ui/components/ui/SectionCard";
import Tagline from "@/components/tagline";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Neon Shop handles personal data, analytics, and communication preferences.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <div className="space-y-3">
        <Tagline>Privacy first</Tagline>
        <h1 className="text-3xl font-semibold text-fg sm:text-4xl">Privacy Policy</h1>
        <p className="max-w-2xl text-sm text-muted">
          We only collect the information required to operate Neon Shop, honour our affiliate obligations,
          and reply to the messages you send us. The rest stays on your device.
        </p>
      </div>

      <SectionCard contentClassName="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-fg">What we collect</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Anonymous product analytics after you accept optional cookies.</li>
            <li>Contact details you submit through forms so we can answer your request.</li>
            <li>Basic account metadata stored by Supabase when you sign in.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-fg">How we use data</h2>
          <p className="text-sm text-muted">
            Usage metrics help us understand which product guides are useful and where users get stuck.
            Contact information is only used to reply and is deleted within 90 days unless you become a customer.
            We never sell or rent personal information.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-fg">Your choices</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Decline analytics cookies - the site keeps working.</li>
            <li>Request a copy or deletion of your data by emailing <a className="underline" href="mailto:privacy@neonshop.dev">privacy@neonshop.dev</a>.</li>
            <li>Opt out of newsletters via the unsubscribe link in any email.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-fg">Data processors</h2>
          <p className="text-sm text-muted">
            Neon Shop runs on Supabase (authentication, database, storage) and Vercel (hosting). Both are GDPR-compliant
            and store data in the EU when available.
          </p>
        </div>
      </SectionCard>
    </>
  );
}
