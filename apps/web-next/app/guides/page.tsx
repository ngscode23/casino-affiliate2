import type { Metadata } from "next";

import PageShell from "@ui/components/ui/PageShell";

export const metadata: Metadata = {
  title: "Гайды и советы для игроков - Casino Watch",
  description: "Полезные гайды и советы по онлайн-казино: безопасность, бонусы, ответственность. 18+.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Гайды и советы",
    description: "Полезные материалы по онлайн-казино.",
    url: "/guides",
  },
};

export default function GuidesPage() {
  return (
    <PageShell>
      <h1 className="text-3xl font-bold">Гайды и советы</h1>
      <p className="mt-3 text-[var(--text-dim)]">
        Собрали тут всю полезную информацию и чек-листы для безопасной и ответственной игры в онлайн казино.
      </p>
    </PageShell>
  );
}
