import { useState } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/useFavorites";
import cn from "@/lib/cn";

type Props = {
  slug: string;
  className?: string;
  size?: "sm" | "md";
  userId?: string; // опционально, если знаешь id юзера
};

export default function FavButton({ slug, className, size = "md", userId }: Props) {
  const { isFavorite, toggle } = useFavorites(userId);
  const [busy, setBusy] = useState(false);

  const active = isFavorite(slug);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await toggle(slug); // оптимистичное обновление уже есть в хуке
    } finally {
      setBusy(false);
    }
  };

  const base =
    "inline-flex items-center justify-center rounded-full border transition " +
    "hover:border-white/40 hover:bg-white/10 focus:outline-none";

  const dims = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <button
      type="button"
      aria-pressed={active}
      title={active ? "Убрать из избранного" : "Добавить в избранное"}
      onClick={onClick}
      disabled={busy}
      className={cn(
        base,
        dims,
        active ? "border-white/60 bg-white/10 text-white" : "border-white/20 text-[var(--text-dim)]",
        busy && "opacity-70 cursor-wait",
        className
      )}
    >
      {/* закрашиваем сердечко белым при active */}
      <Heart className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} fill={active ? "currentColor" : "none"} />
      <span className="sr-only">{active ? "Убрать из избранного" : "Добавить в избранное"}</span>
    </button>
  );
}


