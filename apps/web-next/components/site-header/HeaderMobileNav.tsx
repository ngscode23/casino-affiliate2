"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { FormEvent, ReactNode } from "react";

const MobileDrawer = dynamic(() => import("./MobileDrawer"), { ssr: false, loading: () => null });

type QuickAction = { key: string; label: string; href: string; icon: ReactNode; badge?: number };
type MobileNavItem = { href: string; label: string; active: boolean };

type Props = {
  open: boolean;
  ready: boolean;
  navItems: MobileNavItem[];
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
  onSearchSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onReturnFocus: () => void;
};

export function HeaderMobileNav({
  open,
  ready,
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
}: Props) {
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <MobileDrawer
        open={open}
        navItems={navItems}
        brandName={brandName}
        brandMark={brandMark}
        tagline={tagline}
        menuId={menuId}
        copy={copy}
        quickActions={quickActions}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit}
        onClose={onClose}
        onReturnFocus={onReturnFocus}
      />
    </Suspense>
  );
}
