import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

type Slide = {
  id: string;
  title: string;
  subtitle?: string;
  cta?: { label: string; href: string };
  image: string; // URL
};

const slides: Slide[] = [
  {
    id: "s1",
    title: "Fresh picks for fall",
    subtitle: "Headphones, monitors, and more — up to 30% off",
    cta: { label: "Shop deals", href: "/catalog?sort=rating&dir=desc" },
    image: "/slides/slide-1.svg",
  },
  {
    id: "s2",
    title: "Gaming essentials",
    subtitle: "Mice, keyboards, headsets — ready to play",
    cta: { label: "Explore gaming", href: "/catalog?category=gaming" },
    image: "/slides/slide-2.svg",
  },
  {
    id: "s3",
    title: "Home comfort upgrades",
    subtitle: "Smart lights, vacuums and more",
    cta: { label: "Browse home", href: "/catalog?category=home" },
    image: "/slides/slide-3.svg",
  },
];

function wrapIndex(min: number, max: number, v: number) {
  const r = max - min;
  return ((v - min) % r + r) % r + min;
}

export function HeroSlider() {
  const [[index, direction], setIndex] = React.useState<[number, number]>([0, 0]);
  const [hovered, setHovered] = React.useState(false);
  const go = (dir: number) => setIndex(([i]) => [wrapIndex(0, slides.length, i + dir), dir]);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      if (!hovered) go(1);
    }, 5000);
    return () => window.clearInterval(id);
  }, [hovered]);

  const current = slides[index];

  const fallback = "/og.svg";
  return (
    <section
      className="relative overflow-hidden rounded-none md:rounded-2xl border border-border bg-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-roledescription="carousel"
    >
      {/* Viewport */}
      <div className="relative h-[34vw] min-h-[220px] max-h-[520px] bg-card">
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={current.id}
            src={current.image}
            alt={current.title}
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover select-none"
            custom={direction}
            initial={{ x: direction >= 0 ? 80 : -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction >= 0 ? -80 : 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 20, opacity: { duration: 0.2 } }}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (img.src.endsWith(fallback)) return;
              img.src = fallback;
            }}
          />
        </AnimatePresence>

        {/* Overlays */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,.18),rgba(0,0,0,.04)_40%,rgba(0,0,0,.25))]" aria-hidden />

        {/* Content */}
        <div className="relative z-[1] px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="max-w-[720px]">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text drop-shadow">
              {current.title}
            </h1>
            {current.subtitle ? (
              <p className="mt-3 text-muted text-lg">{current.subtitle}</p>
            ) : null}
            {current.cta ? (
              <Link
                to={current.cta.href}
                className="mt-5 inline-flex items-center justify-center rounded-full font-semibold px-5 py-2 border border-border bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-fg)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)]"
              >
                {current.cta.label}
              </Link>
            ) : null}
          </div>
        </div>

        {/* Controls and dots removed per request; autoplay active */}
      </div>
    </section>
  );
}

export default HeroSlider;

