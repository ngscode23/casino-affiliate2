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
      <Link href={href} prefetch className="text-sm text-muted transition hover:text-primary">
        {label}
      </Link>
    );
  };

  return (
    <footer className="mt-10">
      <div className="surface rounded-3xl border border-border/40 px-6 py-8 shadow-soft">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <p className="text-sm text-muted">{tagline}</p>
            <LanguageSwitcher />
          </div>

          <div className="grid gap-6 text-sm text-muted md:grid-cols-2 md:gap-12">
            <div className="space-y-1">
              <div className="font-semibold text-fg">{siteConfig.footer.company}</div>
              {siteConfig.footer.address ? <div>{siteConfig.footer.address}</div> : null}
              {siteConfig.footer.phone ? <div>{siteConfig.footer.phone}</div> : null}
              {siteConfig.footer.email ? (
                <a href={`mailto:${siteConfig.footer.email}`} className="block text-sm text-muted transition hover:text-primary">
                  {siteConfig.footer.email}
                </a>
              ) : null}
            </div>

            <div className="space-y-2">
              {siteConfig.socials.map((social: { href: string; label: string }) => (
                <div key={social.href}>{renderLink(social.href, social.label)}</div>
              ))}
            </div>
          </div>

          <div className="grid gap-2 text-sm text-muted sm:grid-cols-2 sm:gap-3">
            {legalLinks.map((item) => (
              <div key={item.href}>{renderLink(item.href, item.label)}</div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-border/40 pt-4 text-xs text-muted md:flex-row md:items-center md:justify-between">
          <span>
            {siteConfig.footer.company ? `${year} ${siteConfig.footer.company}` : year}
          </span>
          {rights ? <span>{rights}</span> : null}
        </div>
      </div>
    </footer>
  );
}
