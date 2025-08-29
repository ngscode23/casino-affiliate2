import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import { supabase } from "@/lib/supabase";
import { getOfferBySlug } from "@/features/offers/api/getOffers";

export default function GoRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const redirectedRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      try {
        if (!slug) throw new Error("No slug");

        // 1) найдём URL оффера (из твоего справочника; при желании — из API)
        const offer = await getOfferBySlug(slug);
        const target = offer?.link;
        if (!target) throw new Error("Offer link not found");

        // 2) лог в Supabase (мягко, без падения если нет таблицы/прав)
        try {
          await supabase.from("clicks").insert({
            slug,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent || null,
          });
        } catch {
          // игнорируем ошибки трекинга
        }

        // 3) редирект
        if (!redirectedRef.current) {
          redirectedRef.current = true;
          window.location.replace(target);
        }
      } catch {
        // мягкий фолбэк — на карточку оффера или compare
        if (slug) nav(`/offers/${encodeURIComponent(slug)}`, { replace: true });
        else nav("/compare", { replace: true });
      }
    };
    run();
  }, [slug, nav]);

  return (
    <Section className="py-10">
      <Card className="p-6">Redirecting…</Card>
    </Section>
  );
}
