// src/components/AffiliateLink.tsx
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn"; // если нет — замени на простую конкатенацию

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  offerSlug: string;
  position?: number;
  /** md по умолчанию; sm — для мобильных компактных CTA */
  size?: "sm" | "md";
};

export function AffiliateLink({ offerSlug, position, href = "#", onClick, className, size = "md", children, ...rest }: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold focus:outline-none focus-visible:ring-2 ring-offset-2";
  const sizes = {
    sm: "min-h-[44px] px-3 py-2 text-[13px] leading-[1.1]",   // компакт для мобил
    md: "min-h-[44px] px-4 py-2.5 text-[15px] leading-tight"   // дефолт
  } as const;

  return (
    <a
      href={href}
      rel={href.startsWith("http") ? "nofollow sponsored noopener" : undefined}
      target={href.startsWith("http") ? "_blank" : undefined}
      className={cn(base, sizes[size], className)}
      onClick={(e) => {
        onClick?.(e);
        // маркетинг-событие
        track({ name: "click_affiliate_link", params: { offer_slug: offerSlug, position } });
      }}
      {...rest}
    >
      {children}
    </a>
    
  );
}

export default AffiliateLink;



