"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";

type Options = {
  initialSearchValue: string;
  pathname: string | null;
  searchParams?: ReadonlyURLSearchParams | null;
  onCloseAll?: () => void;
  sanitize?: (value: string | null) => string | null;
};

export function useSiteHeaderState({ initialSearchValue, pathname, searchParams, onCloseAll, sanitize }: Options) {
  const normalize = sanitize ?? ((value: string | null) => value);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(initialSearchValue);
  const [searchPanelReady, setSearchPanelReady] = useState(() => initialSearchValue.length > 0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDrawerReady, setMobileDrawerReady] = useState(false);
  const [isPortalReady, setIsPortalReady] = useState(false);
  const [accountMenuReady, setAccountMenuReady] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const openMobileMenu = useCallback(() => {
    setMobileDrawerReady(true);
    setMobileMenuOpen(true);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileDrawerReady(true);
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const enableAccountMenu = useCallback(() => setAccountMenuReady(true), []);

  useEffect(() => {
    const nextValue = initialSearchValue;
    setSearchValue(nextValue);
    if (nextValue && !searchPanelReady) {
      setSearchPanelReady(true);
    }
  }, [initialSearchValue, searchPanelReady]);

  useEffect(() => {
    if (searchOpen && !searchPanelReady) {
      setSearchPanelReady(true);
    }
  }, [searchOpen, searchPanelReady]);

  useEffect(() => {
    setSearchOpen(false);
    setMobileMenuOpen(false);
    setHoveredNav(null);
    onCloseAll?.();
  }, [pathname, onCloseAll]);

  useEffect(() => {
    if (pathname?.startsWith("/account") && !accountMenuReady) {
      setAccountMenuReady(true);
    }
  }, [accountMenuReady, pathname]);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMobileMenu();
        mobileMenuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileMenuOpen, closeMobileMenu]);

  useEffect(() => {
    if (mobileMenuOpen && !mobileDrawerReady) {
      setMobileDrawerReady(true);
    }
  }, [mobileDrawerReady, mobileMenuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      setScrolled(y > 8);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // sync search value when searchParams changes
    if (!searchParams) return;
    const raw = searchParams.get("q");
    const nextValue = normalize(raw ?? "") ?? "";
    if (nextValue !== searchValue) {
      setSearchValue(nextValue);
      if (nextValue && !searchPanelReady) setSearchPanelReady(true);
    }
  }, [searchParams, searchPanelReady, searchValue, normalize]);

  return {
    searchOpen,
    setSearchOpen,
    searchValue,
    setSearchValue,
    searchPanelReady,
    setSearchPanelReady,
    mobileMenuOpen,
    mobileDrawerReady,
    isPortalReady,
    accountMenuReady,
    enableAccountMenu,
    hoveredNav,
    setHoveredNav,
    scrolled,
    openMobileMenu,
    closeMobileMenu,
    toggleMobileMenu,
    mobileMenuButtonRef,
  };
}
