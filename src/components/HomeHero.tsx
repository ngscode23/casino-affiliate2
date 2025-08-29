// src/components/HomeHero.tsx
import Section from "@/components/common/section";
import Button from "@/components/common/button";
import Chip from "@/components/common/chip";

export default function HomeHero() {
  return (
    <section className="neon-hero relative">
      <Section>
        <div className="chip-row mb-4 flex flex-wrap gap-2">
          <Chip>500+ Offers</Chip>
          <Chip>Real reviews</Chip>
          <Chip>Fast payouts</Chip>
        </div>

        {/* Поиск: мобильный столбик, на sm+ в строку */}
        <div className="w-full flex flex-col sm:flex-row gap-3">
          <input
            className="neon-input w-full sm:flex-1"
            placeholder="Search casinos, bonuses, licenses…"
          />
          <Button className="w-full sm:w-auto">Compare now</Button>
        </div>
      </Section>
    </section>
  );
}




















