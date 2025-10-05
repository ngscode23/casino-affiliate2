import * as React from "react";
import LinkButton from "@ui/components/ui/LinkButton";
import { track } from "@shared/lib/analytics";
import { appendStoredParams } from "@shared/lib/utm";

export type Action = {
  kind: "external" | "internal";
  labelKey: string; // i18n key consumed by parent via t()
  href: string;
  rel?: string;
  target?: string;
  position?: number;
  productSlug?: string;
  size?: "sm" | "md";
  className?: string;
};

export function ActionLink({ action, children, onClick }: { action: Action; children: React.ReactNode; onClick?: React.AnchorHTMLAttributes<HTMLAnchorElement>["onClick"] }) {
  const { kind, href, rel, target, productSlug, position, size = "md", className } = action;
  const resolved = kind === "external" ? appendStoredParams(href) : href;
  const aRel = kind === "external" ? (rel || "sponsored nofollow noopener") : rel;
  const aTarget = kind === "external" ? (target || "_blank") : target;
  return (
    <LinkButton
      href={resolved}
      rel={aRel}
      target={aTarget}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        try { track({ name: "click_action_link", params: { product_slug: productSlug, position, external: kind === "external" } }); } catch { /* noop */ }
      }}
      size={size as any}
    >
      {children}
    </LinkButton>
  );
}

export default ActionLink;


