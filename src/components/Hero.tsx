import Section from "@/components/common/section";
import Chip from "@/components/common/chip";

export default function HomeHero() {
  return (
    <section className="neon-hero section-y">
      <Section>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5">
          <Chip glow>500+ Offers</Chip>
          <Chip glow>Real reviews</Chip>
          <Chip glow>Fast payouts</Chip>
        </div>

        <h1 className="font-extrabold tracking-tight text-[clamp(28px,4.5vw,46px)]">
          The Leading Casino Affiliate Platform
        </h1>
        <p className="neon-subline mt-3 max-w-2xl">
          Compare top casinos, find exclusive bonuses, and withdraw faster.
        </p>

        <div className="neon-search mt-6">
          <input className="neon-input" placeholder="Search casinos, bonuses, licenses…" />
          <button className="neon-btn">Compare now</button>
        </div>
      </Section>
    </section>
  );
}




















