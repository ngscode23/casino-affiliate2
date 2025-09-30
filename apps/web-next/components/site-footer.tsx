"use client";

import Link from "next/link";
import { siteConfig } from "../lib/site-config";
import { useT } from "@shared/lib/useT";
import LanguageSwitcher from "@ui/components/layout/LanguageSwitcher";

export function SiteFooter() {
  const t = useT();
  const year = new Date().getFullYear();
  const tagline = t("layout.tagline") || siteConfig.tagline;

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-[var(--muted)]">{tagline}</span>
          <LanguageSwitcher />
        </div>
        <div className="footer-columns">
          <div className="space-y-1">
            <span className="text-sm">{siteConfig.footer.company}</span>
            <span className="text-sm">{siteConfig.footer.address}</span>
            <span className="text-sm">{siteConfig.footer.phone}</span>
          </div>
          <div className="space-y-1">
            <span className="text-sm">
              Email: <a href={`mailto:${siteConfig.footer.email}`}>{siteConfig.footer.email}</a>
            </span>
            {siteConfig.socials.map((social) => (
              <span key={social.href} className="text-sm">
                <Link href={social.href} target="_blank" rel="noopener noreferrer">
                  {social.label}
                </Link>
              </span>
            ))}
          </div>
          <div className="space-y-1">
            <span className="text-sm">
              <Link href="/legal/privacy">{t("legal.privacy.title")}</Link>
            </span>
            <span className="text-sm">
              <Link href="/legal/terms">{t("legal.terms.title")}</Link>
            </span>
            <span className="text-sm">
              <Link href="/legal/affiliate-disclosure">{t("nav.affiliateDisclosure")}</Link>
            </span>
            <span className="text-sm">
              <Link href="/legal/cookies">{t("legal.cookies.title")}</Link>
            </span>
          </div>
        </div>
        <div className="footer-meta">
          <span>
            � {year} {siteConfig.footer.company}. {t("footer.allRightsReserved")}
          </span>
          <span>Built with Next.js and Supabase</span>
        </div>
      </div>
    </footer>
  );
}
