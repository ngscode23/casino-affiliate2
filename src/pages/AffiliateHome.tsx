import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, Timer, TrendingUp, Globe, ExternalLink, Star } from "lucide-react";
import { useOffers } from "@/features/offers/api/useOffers";
import type { NormalizedOffer } from "@/lib/offers";

// Minimal, dependency-light UI primitives
function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/5 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur ${className}`}>
      {children}
    </div>
  );
}

function Button({
  children,
  href,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition-all active:scale-[0.98]";
  const styles =
    variant === "primary"
      ? "bg-emerald-500 text-white hover:bg-emerald-400 shadow"
      : "bg-transparent text-white/80 ring-1 ring-white/15 hover:bg-white/10";
  const Comp: any = href ? "a" : "button";
  return (
    <Comp href={href} className={`${base} ${styles} ${className}`}>
      {children}
    </Comp>
  );
}

// Demo data - replace via props/store later
const DEMO_OFFERS: Array<Pick<NormalizedOffer, 'slug'|'name'|'rating'|'payoutHours'|'license'|'link'>> = [
  { slug: "nova", name: "NovaBet", rating: 4.6, payoutHours: 4, license: "MGA", link: "#" },
  { slug: "aurora", name: "AuroraPlay", rating: 4.4, payoutHours: 12, license: "UKGC", link: "#" },
  { slug: "zen", name: "ZenCasino", rating: 4.2, payoutHours: 24, license: "Curaçao", link: "#" },
  { slug: "rapid", name: "RapidWin", rating: 4.1, payoutHours: 2, license: "MGA", link: "#" },
];

function RatingStars({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-1" aria-label={`Оценка ${value.toFixed(1)} из 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            "h-4 w-4 " +
            (i < full
              ? "fill-yellow-400 text-yellow-400"
              : half && i === full
              ? "fill-yellow-400/60 text-yellow-400/60"
              : "text-white/20")
          }
        />
      ))}
      <span className="ml-1 text-xs text-white/70">{value.toFixed(1)}</span>
    </div>
  );
}

export function PlanBadge({ plan }: { plan?: string }) {
  if (!plan) return null;
  const color = plan === 'TOP' ? 'bg-amber-500/90' : plan === 'FEATURED' ? 'bg-emerald-500/90' : 'bg-sky-500/90';
  return <span className={`ml-2 rounded-md px-2 py-0.5 text-[10px] font-semibold text-white ${color}`}>{plan}</span>;
}

function OffersTable({ offers }: { offers: Array<Partial<NormalizedOffer>> }) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
      <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
        <thead className="bg-white/5 text-left text-white/70">
          <tr>
            <th className="px-4 py-3 font-medium">Казино</th>
            <th className="px-4 py-3 font-medium">Оценка</th>
            <th className="px-4 py-3 font-medium">Выплата (ч)</th>
            <th className="px-4 py-3 font-medium">Лицензия</th>
            <th className="px-4 py-3 font-medium text-right">Действие</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((o, idx) => (
            <tr key={o.slug} className={idx % 2 === 0 ? "bg-white/0" : "bg-white/[0.03]"}>
              <td className="px-4 py-3 font-medium text-white">
                {o.name}
                {('pinnedPlan' in (o||{}) || 'pinned' in (o||{})) ? <PlanBadge plan={(o as any).pinnedPlan} /> : null}
              </td>
              <td className="px-4 py-3"><RatingStars value={(o.rating as number) || 0} /></td>
              <td className="px-4 py-3 text-white/90">{(o as any).payoutHours ?? '-'}</td>
              <td className="px-4 py-3 text-white/80">{(o.license as any) ?? '-'}</td>
              <td className="px-4 py-3 text-right">
                <a
                  href={o.link || "#"}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white/90 ring-1 ring-white/15 hover:bg-white/10"
                >
                  Перейти <ExternalLink className="h-4 w-4" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Shell-less version for use inside App layout (no Header/Footer duplication)
export function AffiliateHome() {
  const { offers, error } = useOffers();
  const featured = useMemo(() => {
    if (offers?.length) {
      const pinned = (offers as any[]).filter(o => (o as any).pinned).slice(0, 6);
      if (pinned.length) return pinned;
      return [...offers].sort((a,b)=> (b.rating||0) - (a.rating||0)).slice(0, 4);
    }
    return DEMO_OFFERS as any;
  }, [offers]);
  return (
    <div className="text-white">
      {/* Hero */}
      <section className="relative overflow-hidden pt-14">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_50%_at_50%_0%,#000_10%,transparent_70%)]">
          <div className="absolute left-1/2 top-0 h-[48rem] w-[48rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        </div>
        <Container>
          <div className="grid items-center gap-10 py-10 md:grid-cols-2 md:py-16">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Найдите надёжные казино с быстрыми выплатами
              </h1>
              <p className="mt-4 max-w-prose text-white/70">
                Рейтинги на основе данных, проверка лицензий и скорости выплат. Никакой воды и фейковых обзоров. Сравнивайте за секунды и избегайте ловушек.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href="/compare" className="">Сравнить сейчас</Button>
                <Button href="/how-we-rank" variant="ghost">Как мы ранжируем</Button>
              </div>
              <div className="mt-6 grid max-w-lg grid-cols-3 gap-3 text-sm text-white/70">
                <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">Проверенные лицензии</div>
                <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">Проверена скорость выплат</div>
                <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">Без ловушек KYC</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className=""
            >
              <Card className="border border-white/10">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/70">Выбор дня</h3>
                {error ? (
                  <div className="text-sm text-white/70">Не удалось загрузить — показаны примеры.</div>
                ) : null}
                <OffersTable offers={featured as any} />
                <div className="mt-4 text-right">
                  <Button href="/compare" variant="ghost">Показать все</Button>
                </div>
              </Card>
            </motion.div>
          </div>
        </Container>
      </section>
      {/* Value props */}
      <section className="py-12 md:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="font-semibold">Безопасность прежде всего</div>
                  <p className="text-sm text-white/70">Лицензии, аудиты, проверка правил. Помечаем хищнические практики.</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-start gap-3">
                <Timer className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="font-semibold">Быстрые выплаты</div>
                  <p className="text-sm text-white/70">Тестируем сроки вывода и учитываем это в рейтинге.</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="font-semibold">Реальные метрики</div>
                  <p className="text-sm text-white/70">Никаких абстрактных звёзд. Прозрачная формула и веса.</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="font-semibold">Учитываем юрисдикцию</div>
                  <p className="text-sm text-white/70">Фильтры по стране, способам платежей и политике KYC.</p>
                </div>
              </div>
            </Card>
          </div>
        </Container>
      </section>
      {/* FAQ */}
      <section className="pb-16">
        <Container>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <details className="group">
                <summary className="cursor-pointer list-none font-semibold">Как вы ранжируете казино?</summary>
                <p className="mt-2 text-sm text-white/70">Взвешенная формула: лицензия (30%), скорость выплат (30%), отзывы игроков (20%), UX (10%), прозрачность (10%).</p>
              </details>
            </Card>
            <Card>
              <details className="group">
                <summary className="cursor-pointer list-none font-semibold">Сайт только для 18+?</summary>
                <p className="mt-2 text-sm text-white/70">Да. Азартные игры связаны с риском. Если чувствуете давление — обратитесь за помощью. Ссылки в разделе «Ответственная игра».</p>
              </details>
            </Card>
            <Card>
              <details className="group">
                <summary className="cursor-pointer list-none font-semibold">Вы получаете комиссию?</summary>
                <p className="mt-2 text-sm text-white/70">Мы можем получать партнёрские вознаграждения. Это никогда не влияет на безопасность и логику рейтинга.</p>
              </details>
            </Card>
            <Card>
              <details className="group">
                <summary className="cursor-pointer list-none font-semibold">Ограничения по странам?</summary>
                <p className="mt-2 text-sm text-white/70">Некоторым брендам недоступны DE/UA и другие страны. Используйте фильтры на странице сравнения.</p>
              </details>
            </Card>
          </div>
        </Container>
      </section>
    </div>
  );
}

// Full-page variant with its own simple header/footer (kept for standalone usage)
export default function AffiliateHome_v1() {
  return (
    <div className="text-white">
      {/* Header (simple inline version to match snippet intent) */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/30 backdrop-blur">
        <Container>
          <div className="flex h-14 items-center justify-between">
            <div className="font-semibold tracking-tight">SITE_NAME</div>
            <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
              <a className="hover:text-white" href="/compare">Сравнение</a>
              <a className="hover:text-white" href="/guides">Гайды</a>
              <a className="hover:text-white" href="/about">О нас</a>
            </nav>
            <div className="flex items-center gap-3">
              <Button href="/compare">Начать сравнение</Button>
              <span className="hidden text-xs text-white/60 md:inline">18+ Ответственная игра</span>
            </div>
          </div>
        </Container>
      </header>

      <AffiliateHome />

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 text-sm text-white/70">
        <Container>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <div className="font-semibold text-white">SITE_NAME</div>
              <p className="mt-2 max-w-prose">Независимые сравнения. Мы не принимаем депозиты. Информация носит ознакомительный характер.</p>
            </div>
            <div className="flex gap-6">
              <ul className="space-y-2">
                <li><a href="/disclosure" className="hover:text-white">Партнёрское раскрытие</a></li>
                <li><a href="/responsible" className="hover:text-white">Ответственная игра</a></li>
                <li><a href="/privacy" className="hover:text-white">Конфиденциальность</a></li>
              </ul>
              <ul className="space-y-2">
                <li><a href="/about" className="hover:text-white">О нас</a></li>
                <li><a href="/contact" className="hover:text-white">Контакты</a></li>
                <li><a href="/impressum" className="hover:text-white">Impressum</a></li>
              </ul>
            </div>
            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="font-semibold text-white">Предупреждение 18+</div>
              <p className="mt-2">Азартные игры несут риски. Если чувствуете, что теряете контроль — прекратите игру и обратитесь за поддержкой.</p>
            </div>
          </div>
          <div className="mt-8 text-center text-xs">© {new Date().getFullYear()} SITE_NAME. Все права защищены.</div>
        </Container>
      </footer>
    </div>
  );
}
