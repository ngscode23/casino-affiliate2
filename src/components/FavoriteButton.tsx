import { track } from "@/lib/analytics";



export function FavoriteButton({
  slug,
  isActive,
  toggleFavorite,
  className
}: {
  slug: string;
  isActive: boolean;
  toggleFavorite: (slug: string) => boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={() => {
        const active = toggleFavorite(slug);
        track({ name: "favorite_toggle", params: { offer_slug: slug, active } });
      }}
      className={`btn btn-ghost ${className ?? ""}`}
      title={isActive ? "Убрать из избранного" : "В избранное"}
    >
      {isActive ? "★ In favorites" : "☆ Add to favorites"}
    </button>
  );
}

