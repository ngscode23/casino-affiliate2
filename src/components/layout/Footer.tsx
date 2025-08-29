// src/components/layout/Footer.tsx

import Section from "@/components/common/section";
import UserBadge from "@/components/auth/UserBadge";

export default function Footer() {
  return (
    <footer className="py-10 neon-footer">
      <Section className="flex flex-col items-center gap-4 text-center">
        
        {/* Блок пользователя */}
        <div>
          <UserBadge />
        </div>

        {/* Юридический текст */}
        <p className="text-sm text-[var(--text-dim)] max-w-xl">
          18+ Play responsibly. Bonuses have T&amp;C. This site contains affiliate links.
        </p>
      </Section>
    </footer>
  );
}