import Link from "next/link";
import { siteConfig } from "../lib/site-config";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <span className="text-sm text-[var(--muted)]">{siteConfig.tagline}</span>
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
              <Link href="/legal/privacy">Privacy Policy</Link>
            </span>
            <span className="text-sm">
              <Link href="/legal/terms">Terms of Service</Link>
            </span>
            <span className="text-sm">
              <Link href="/legal/affiliate-disclosure">Affiliate Disclosure</Link>
            </span>
            <span className="text-sm">
              <Link href="/legal/cookies">Cookie Notice</Link>
            </span>
          </div>
        </div>
        <div className="footer-meta">
          <span>Copyright {year} {siteConfig.footer.company}. All rights reserved.</span>
          <span>Built with Next.js and Supabase</span>
        </div>
      </div>
    </footer>
  );
}
