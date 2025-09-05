// src/components/AffiliateLink.tsx
import { track } from "@/lib/analytics";
import { appendStoredParams } from "@/lib/utm";
import { cn } from "@/lib/cn"; // если нет — замени на простую конкатенацию
import LinkButton from "@/components/ui/LinkButton";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  offerSlug: string;
  position?: number;
  /** md по умолчанию; sm — для мобильных компактных CTA */
  size?: "sm" | "md";
};

export function AffiliateLink({ offerSlug, position, href = "#", onClick, className, size = "md", children, ...rest }: Props) {
  const sizes = {
    sm: "min-h-[44px] px-3 py-2 text-[13px] leading-[1.1]",
    md: "min-h-[44px] px-4 py-2.5 text-[15px] leading-tight",
  } as const;

  const resolved = appendStoredParams(href);
  const external = href.startsWith("http");

  return (
    <LinkButton
      href={resolved}
      target={external ? "_blank" : undefined}
      rel={external ? "nofollow sponsored noopener" : undefined}
      className={cn(sizes[size], className)}
      onClick={(e) => {
        onClick?.(e);
        try { track({ name: "click_affiliate_link", params: { offer_slug: offerSlug, position } }); } catch { /* noop */ }
      }}
      {...rest}
    >
      {children}
    </LinkButton>
  );
}

export default AffiliateLink;



