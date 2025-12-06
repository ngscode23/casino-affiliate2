"use client";;
import { mutedTextSmLegacy } from "@/styles/classnames";

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
  const translate = (key: string, fallback: string) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  const contactLabel = translate("footer.contact", "Contact");
  const exploreLabel = translate("footer.explore", "Explore");
  const connectLabel = translate("footer.connect", "Connect");
  const legalLabel = translate("footer.legal", "Legal");

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
    <footer className="mt-10 sm:mt-12">
      <div className="rounded-[24px] border border-border/35 bg-card/92 px-5 py-6 shadow-soft sm:px-8 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-fg">{siteConfig.name}</h2>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{tagline || siteConfig.tagline}</p>
            </div>
            <LanguageSwitcher />
          </div>

          <div className="space-y-1 text-sm text-muted">
            <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">{contactLabel}</h3>
            {siteConfig.footer.address ? <div className={mutedTextSmLegacy}>{siteConfig.footer.address}</div> : null}
            {siteConfig.footer.phone ? <div className={mutedTextSmLegacy}>{siteConfig.footer.phone}</div> : null}
            {siteConfig.footer.email ? (
              <a href={`mailto:${siteConfig.footer.email}`} className="block text-sm text-muted transition hover:text-primary">
                {siteConfig.footer.email}
              </a>
            ) : null}
          </div>

          <div className="grid gap-4 text-sm text-muted sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">{exploreLabel}</h3>
              {primaryNav.map((item) => (
                <div key={item.href}>{renderLink(item.href, resolveNavLabel(item))}</div>
              ))}
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">{connectLabel}</h3>
              {siteConfig.socials.map((social: { href: string; label: string }, idx: number) => {
                const key = social.href?.trim() || social.label || String(idx);
                return <div key={key}>{renderLink(social.href, social.label)}</div>;
              })}
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">{legalLabel}</h3>
              {legalLinks.map((item) => (
                <div key={item.href}>{renderLink(item.href, item.label)}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-border/30 pt-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>{siteConfig.footer.company ? `${year} ${siteConfig.footer.company}` : year}</span>
          {rights ? <span>{rights}</span> : null}
        </div>
      </div>
    </footer>
  );
}

