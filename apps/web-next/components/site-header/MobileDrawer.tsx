"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronRight, Search, X } from "lucide-react";

import { cn } from "@shared/lib/cn";
import styles from "./SiteHeader.module.css";
import type { NavItem } from "./site-header.client";

type QuickAction = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
};

type MobileDrawerProps = {
  open: boolean;
  navItems: Array<NavItem & { label: string; active: boolean }>;
  brandName: string;
  brandMark: string;
  tagline?: string;
  menuId: string;
  copy: {
    primaryLabel: string;
    quickLabel: string;
    searchLabel: string;
    closeLabel: string;
    placeholder: string;
  };
  quickActions: QuickAction[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onReturnFocus?: () => void;
};

/**
 * Мобильный дровер вынесен в динамический компонент, чтобы не тянуть портал и обработчики в LCP.
 */
export default function MobileDrawer({
  open,
  navItems,
  brandName,
  brandMark,
  tagline,
  menuId,
  copy,
  quickActions,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onClose,
  onReturnFocus,
}: MobileDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Scroll lock + focus trap
  useEffect(() => {
    if (!open) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        onReturnFocus?.();
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [open, onClose, onReturnFocus]);

  useEffect(() => {
    if (open) {
      // фокус на первую кнопку/поле
      const firstFocusable = sheetRef.current?.querySelector<HTMLElement>(
        'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }
  }, [open]);

  const quickItems = useMemo(
    () =>
      quickActions.map((item) => ({
        ...item,
        badge: typeof item.badge === "number" && item.badge > 0 ? item.badge : undefined,
      })),
    [quickActions],
  );

  if (!mounted) return null;

  return createPortal(
    <div className={cn(styles.mobileSheetOverlay, open && styles.mobileSheetOverlayOpen)}>
      <div className={styles.mobileSheetBackdrop} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.primaryLabel}
        id={menuId}
        className={cn(styles.mobileSheet, open ? styles.mobileSheetOpen : styles.mobileSheetClosed)}
        ref={sheetRef}
      >
        <div className={styles.mobileSheetHeader}>
          <div className={styles.mobileSheetBrand}>
            <span className={styles.mobileSheetMark}>{brandMark}</span>
            <div className={styles.mobileSheetText}>
              <span className={styles.mobileSheetName}>{brandName}</span>
              {tagline ? <span className={styles.mobileSheetTagline}>{tagline}</span> : null}
            </div>
          </div>
          <button type="button" className={styles.mobileSheetClose} onClick={onClose} aria-label={copy.closeLabel}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <form
          className={styles.mobileSearch}
          onSubmit={(event) => {
            onSearchSubmit(event);
            onClose();
          }}
        >
          <Search size={18} aria-hidden />
          <input
            type="search"
            name="q"
            placeholder={copy.placeholder}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          <button type="submit">{copy.searchLabel}</button>
        </form>

        <nav aria-label={copy.primaryLabel} className={styles.mobileNav}>
          <ul>
            {navItems.map((item) => (
              <li key={`mobile-${item.href}`}>
                <Link
                  href={item.href}
                  className={cn(styles.mobileNavLink, item.active && styles.mobileNavLinkActive)}
                  aria-current={item.active ? "page" : undefined}
                  onClick={onClose}
                >
                  <span>{item.label}</span>
                  <ChevronRight size={18} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.mobileQuick}>
          <div className={styles.mobileQuickHeader}>{copy.quickLabel}</div>
          <div className={styles.mobileQuickGrid}>
            {quickItems.map((item) => (
              <Link key={item.key} href={item.href} className={styles.mobileQuickItem} onClick={onClose}>
                <span className={styles.mobileQuickIcon}>
                  {item.icon}
                  {item.badge ? <span className={styles.mobileQuickBadge}>{item.badge}</span> : null}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
