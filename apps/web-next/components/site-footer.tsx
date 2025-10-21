"use client";

import Link from "next/link";
import { siteConfig } from "../lib/site-config";
import { useT } from "@shared/lib/useT";
import LanguageSwitcher from "@ui/components/layout/LanguageSwitcher";

function isExternalLink(href: string): boolean {
  return /^https?:\/\//.test(href);
}

export function SiteFooter() {
  const t = useT();
  const year = new Date().getFullYear();
  const tagline = t("layout.tagline") || siteConfig.tagline;
  const rights = t("footer.allRightsReserved");

  const legalLinks = [
    { href: "/legal/privacy", label: t("legal.privacy.title") },
    { href: "/legal/terms", label: t("legal.terms.title") },
    { href: "/legal/affiliate-disclosure", label: t("nav.affiliateDisclosure") },
    { href: "/legal/cookies", label: t("legal.cookies.title") },
  ];

  const renderLink = (href: string, label: string) => {
    if (isExternalLink(href)) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted transition hover:text-primary">
          {label}
        </a>
      );
    }

    return (
      <Link href={href} prefetch={false} className="text-sm text-muted transition hover:text-primary">
        {label}
      </Link>
    );
  };

  const primaryNav = siteConfig.nav.slice(0, 5);
  const resolveNavLabel = (item: (typeof siteConfig.nav)[number]) => {
    if (!item.labelKey) return item.label;
    const translation = t(item.labelKey);
    if (translation && translation !== item.labelKey) {
      return translation;
    }
    return item.label;
  };

  return (
    <footer className="mt-16">
      <div className="rounded-[32px] border border-border/35 bg-card/92 px-6 py-10 shadow-soft sm:px-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-fg">{siteConfig.name}</h2>
              <p className="mt-2 max-w-sm text-sm text-muted">{tagline}</p>
            </div>
            <LanguageSwitcher />
          </div>

          <div className="space-y-2 text-sm text-muted">
            <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">Contact</h3>
            {siteConfig.footer.address ? <div className="text-sm text-muted">{siteConfig.footer.address}</div> : null}
            {siteConfig.footer.phone ? <div className="text-sm text-muted">{siteConfig.footer.phone}</div> : null}
            {siteConfig.footer.email ? (
              <a href={`mailto:${siteConfig.footer.email}`} className="block text-sm text-muted transition hover:text-primary">
                {siteConfig.footer.email}
              </a>
            ) : null}
          </div>

          <div className="grid gap-6 text-sm text-muted sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">Explore</h3>
              {primaryNav.map((item) => (
                <div key={item.href}>{renderLink(item.href, resolveNavLabel(item))}</div>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">Connect</h3>
              {siteConfig.socials.map((social: { href: string; label: string }) => (
                <div key={social.href}>{renderLink(social.href, social.label)}</div>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">Legal</h3>
              {legalLinks.map((item) => (
                <div key={item.href}>{renderLink(item.href, item.label)}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border/30 pt-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>{siteConfig.footer.company ? `${year} ${siteConfig.footer.company}` : year}</span>
          {rights ? <span>{rights}</span> : null}
        </div>
      </div>
    </footer>
  );
}
