"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";

import { cn } from "@shared/lib/cn";
import styles from "./SiteHeader.module.css";
import type { HoverPanel } from "./CatalogPanel";

const CatalogPanel = dynamic(() => import("./CatalogPanel"), { ssr: false, loading: () => null });

export type DesktopNavItem = {
  href: string;
  label: string;
  active: boolean;
};

type Props = {
  items: DesktopNavItem[];
  primaryLabel: string;
  hoveredNav: string | null;
  onHoverChange: (href: string | null) => void;
  buildPanel: (href: string, label: string) => HoverPanel;
};

export function HeaderDesktopNav({ items, primaryLabel, hoveredNav, onHoverChange, buildPanel }: Props) {
  return (
    <nav className={styles.vhNav} aria-label={primaryLabel}>
      <ul className={styles.vhNavList}>
        {items.map((item) => {
          const panel = buildPanel(item.href, item.label);
          const panelOpen = hoveredNav === item.href;
          return (
            <li
              key={item.href}
              className={cn(styles.vhNavItem, panelOpen && styles.vhNavItemActive)}
              onMouseEnter={() => onHoverChange(item.href)}
              onMouseLeave={() => onHoverChange(null)}
              onFocusCapture={() => onHoverChange(item.href)}
              onBlurCapture={(event) => {
                const related = event.relatedTarget as Node | null;
                if (!related || !event.currentTarget.contains(related)) {
                  onHoverChange(null);
                }
              }}
            >
              <Link
                href={item.href}
                className={cn(styles.vhNavLink, item.active && styles.vhNavLinkActive)}
                aria-haspopup="true"
                aria-current={item.active ? "page" : undefined}
              >
                {item.label}
              </Link>
              {panelOpen ? (
                <Suspense fallback={null}>
                  <CatalogPanel panel={panel} open={panelOpen} />
                </Suspense>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
