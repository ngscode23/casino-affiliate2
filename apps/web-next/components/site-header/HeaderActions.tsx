"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";
import type { JSX } from "react";
import { cn } from "@shared/lib/cn";
import styles from "./SiteHeader.module.css";

const AccountMenu = dynamic(() => import("./AccountMenu"), { ssr: false, loading: () => null });
const SearchPanel = dynamic(() => import("./SearchPanel"), { ssr: false, loading: () => null });

export type ActionButton = {
  key: string;
  label: string;
  icon: JSX.Element;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
  togglesSearch?: boolean;
};

type Props = {
  actionButtons: ActionButton[];
  accountMenuReady: boolean;
  enableAccountMenu: () => void;
  searchPanelReady: boolean;
  searchOpen: boolean;
  searchValue: string;
  searchLabel: string;
  searchPlaceholder: string;
  lang: string;
  applyLang: (href: string, lang: string) => string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onSearchClose: () => void;
  cartHref: string;
  cartLabel: string;
  cartActive: boolean;
  cartQty: number | null;
  cartIcon: JSX.Element;
};

export function HeaderActions({
  actionButtons,
  accountMenuReady,
  enableAccountMenu,
  searchPanelReady,
  searchOpen,
  searchValue,
  searchLabel,
  searchPlaceholder,
  lang,
  applyLang,
  onSearchChange,
  onSearchSubmit,
  onSearchClose,
  cartHref,
  cartLabel,
  cartActive,
  cartQty,
  cartIcon,
}: Props) {
  return (
    <ul className={styles.vhActions}>
      {actionButtons.map((action) => (
        <li key={action.key}>
          {action.key === "account" ? (
            accountMenuReady ? (
              <Suspense fallback={null}>
                <AccountMenu href={action.href ?? applyLang("/account", lang)} label={action.label} isActive={action.isActive} />
              </Suspense>
            ) : (
              <Link
                href={action.href ?? applyLang("/account", lang)}
                className={styles.vhActionButton}
                aria-label={action.label}
                aria-current={action.isActive ? "page" : undefined}
                onMouseEnter={enableAccountMenu}
                onFocus={enableAccountMenu}
                onClick={enableAccountMenu}
              >
                {action.icon}
              </Link>
            )
          ) : action.href ? (
            <Link
              href={action.href}
              className={styles.vhActionButton}
              aria-label={action.label}
              aria-current={action.isActive ? "page" : undefined}
            >
              {action.icon}
            </Link>
          ) : (
            <button
              type="button"
              className={cn(styles.vhActionButton, action.key === "search" && searchOpen && styles.vhNavLinkActive)}
              aria-pressed={action.togglesSearch ? searchOpen : undefined}
              aria-label={action.label}
              onClick={action.onClick}
            >
              {action.icon}
            </button>
          )}
          {action.key === "search" && searchPanelReady ? (
            <Suspense fallback={null}>
              <SearchPanel
                open={searchOpen}
                value={searchValue}
                label={searchLabel}
                placeholder={searchPlaceholder}
                lang={lang}
                applyLang={applyLang}
                onChange={onSearchChange}
                onSubmit={onSearchSubmit}
                onClose={onSearchClose}
              />
            </Suspense>
          ) : null}
        </li>
      ))}
      <li>
        <Link
          href={cartHref}
          className={cn(styles.vhActionButton, styles.vhCartButton)}
          aria-label={cartLabel}
          aria-current={cartActive ? "page" : undefined}
        >
          {cartIcon}
          {cartQty ? <span className={styles.vhCartBadge}>{cartQty}</span> : null}
        </Link>
      </li>
    </ul>
  );
}
