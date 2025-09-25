"use client";

import PageShell from "@ui/components/ui/PageShell";
import Seo from "@ui/components/Seo";

export default function GuidesPage() {
  return (
    <PageShell>
      <Seo
        title="Гайды и советы для игроков — Casino Watch"
        description="Полезные статьи и гайды по онлайн-казино: стратегии, бонусы, безопасность. 18+."
        canonical="/guides"
      />
      <h1 className="text-3xl font-bold">Гайды и советы</h1>
      <p className="mt-3 text-[var(--text-dim)]">
        Собрали для вас полезные материалы и инструкции для новичков и опытных игроков.
      </p>
    </PageShell>
  );
}
