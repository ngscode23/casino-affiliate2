"use client";

import Link from "next/link";
import nextDynamic from "next/dynamic";
import { FormEvent, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, Heart, Home, Menu, Search, ShoppingBag, User } from "lucide-react";
import { createPortal } from "react-dom";

import { useCart } from "@shared/ecom/lib/cart";
import { useI18n } from "@shared/lib/i18n";
import { useT } from "@shared/lib/useT";
import { cn } from "@shared/lib/cn";
import { sanitizeSearchParam } from "@shared/lib/sanitize";
import styles from "./SiteHeader.module.css";
import type { HoverPanel } from "./CatalogPanel";
import { useSiteHeaderState } from "./useSiteHeaderState";
import { HeaderDesktopNav } from "./HeaderDesktopNav";
import { HeaderActions, type ActionButton } from "./HeaderActions";
import { HeaderMobileNav } from "./HeaderMobileNav";
import { useHeaderTracking } from "./useHeaderTracking";

export type NavItem = {
  href: string;
  label?: string;
  labelKey?: string;
};

type CatalogPanelCategory = {
  slug: string;
  title: string;
  description: string | null;
};

type PanelBuilderArgs = {
  label: string;
  href: string;
  translate: (key: string, fallback: string) => string;
  categories?: CatalogPanelCategory[];
};

type PanelBuilder = (args: PanelBuilderArgs) => HoverPanel;

export type SiteHeaderClientProps = {
  navItems: NavItem[];
  brandName: string;
  tagline?: string;
  catalogCategories?: CatalogPanelCategory[];
};

function toInitials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase());
  const initials = letters.slice(0, 2).join("");
  return initials || "NO";
}

function withLang(href: string, lang: string) {
  if (!lang || lang === "en") return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("lang", lang);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : `${path}?lang=${lang}`;
}

const appendQuery = (href: string, query: string) => {
  if (!query) return href;
  return href.includes("?") ? `${href}&${query}` : `${href}?${query}`;
};

const MAX_PANEL_CATEGORIES = 6;

const SearchPanel = nextDynamic(() => import("./SearchPanel"), { ssr: false, loading: () => null });
const AccountMenu = nextDynamic(() => import("./AccountMenu"), { ssr: false, loading: () => null });
const MobileDrawer = nextDynamic(() => import("./MobileDrawer"), { ssr: false, loading: () => null });
const CatalogPanel = nextDynamic(() => import("./CatalogPanel"), { ssr: false, loading: () => null });

const buildCatalogPanelFallback = (translate: PanelBuilderArgs["translate"]): HoverPanel => ({
  title: translate("nav.catalogPanelTitle", "Catalog spotlight"),
  subtitle: translate("nav.catalogPanelSubtitle", "Curated grids, specs and bundles"),
  items: [
    {
      label: translate("nav.catalogPhones", "iPhone cases"),
      href: appendQuery("/products", "category=iphone"),
      description: translate("nav.catalogPhonesDesc", "Slim, rugged and leather fits"),
    },
    {
      label: translate("nav.catalogMagSafe", "MagSafe gear"),
      href: appendQuery("/products", "category=magsafe"),
      description: translate("nav.catalogMagSafeDesc", "Chargers, stands, wallets"),
    },
    {
      label: translate("nav.catalogBundles", "Bundles & kits"),
      href: appendQuery("/products", "view=bundles"),
      description: translate("nav.catalogBundlesDesc", "Save on curated sets"),
    },
  ],
});

const NAV_PANEL_PRESETS: Record<string, PanelBuilder> = {
  "/": ({ translate }) => ({
    title: translate("nav.homeTitle", "Fresh arrivals"),
    subtitle: translate("nav.homeSubtitle", "Daily drops and highlighted products"),
    items: [
      {
        label: translate("nav.newArrivals", "New arrivals"),
        href: appendQuery("/products", "sort=new"),
        description: translate("nav.newArrivalsDesc", "Updated every morning"),
      },
      {
        label: translate("nav.bestSellers", "Best sellers"),
        href: appendQuery("/products", "sort=popular"),
        description: translate("nav.bestSellersDesc", "Top picks by members"),
      },
      {
        label: translate("nav.giftIdeas", "Gift ideas"),
        href: appendQuery("/products", "view=gifts"),
        description: translate("nav.giftIdeasDesc", "Bundles and limited kits"),
      },
    ],
  }),
  "/products": ({ translate, categories }) => {
    if (categories && categories.length) {
      const items = categories.slice(0, MAX_PANEL_CATEGORIES).map((category) => ({
        label: category.title,
        href: `/products/${encodeURIComponent(category.slug)}`,
        description:
          (category.description?.trim() ? category.description.trim() : null) ??
          translate("nav.catalogCategoryDefaultDesc", "Open the collection"),
      }));
      return {
        title: translate("nav.catalogPanelTitle", "Catalog spotlight"),
        subtitle: translate("nav.catalogPanelSubtitle", "Curated grids, specs and bundles"),
        items,
      };
    }
    return buildCatalogPanelFallback(translate);
  },
  "/wishlist": ({ translate }) => ({
    title: translate("nav.wishlistTitle", "Wishlist tools"),
    subtitle: translate("nav.wishlistSubtitle", "Track drops, sync devices"),
    items: [
      {
        label: translate("nav.wishlistAll", "View saved items"),
        href: "/wishlist",
        description: translate("nav.wishlistAllDesc", "Quick access to your picks"),
      },
      {
        label: translate("nav.wishlistAlerts", "Price alerts"),
        href: appendQuery("/wishlist", "tab=alerts"),
        description: translate("nav.wishlistAlertsDesc", "Notify me when price drops"),
      },
      {
        label: translate("nav.wishlistShare", "Share board"),
        href: appendQuery("/wishlist", "tab=share"),
        description: translate("nav.wishlistShareDesc", "Export or send list"),
      },
    ],
  }),
  "/cart": ({ translate }) => ({
    title: translate("nav.cartTitle", "Cart summary"),
    subtitle: translate("nav.cartSubtitle", "Review items before checkout"),
    items: [
      {
        label: translate("nav.cartView", "Open cart"),
        href: "/cart",
        description: translate("nav.cartViewDesc", "Edit quantities & promo codes"),
      },
      {
        label: translate("nav.cartRecommendations", "Recommended add-ons"),
        href: appendQuery("/products", "view=recommendations"),
        description: translate("nav.cartRecommendationsDesc", "Complete the setup"),
      },
      {
        label: translate("nav.cartShipping", "Shipping options"),
        href: appendQuery("/checkout", "step=shipping"),
        description: translate("nav.cartShippingDesc", "Express, pickup, lockers"),
      },
    ],
  }),
  "/checkout": ({ translate }) => ({
    title: translate("nav.checkoutTitle", "Checkout flow"),
    subtitle: translate("nav.checkoutSubtitle", "Secure payments, instant invoices"),
    items: [
      {
        label: translate("nav.checkoutContinue", "Continue checkout"),
        href: "/checkout",
        description: translate("nav.checkoutContinueDesc", "Pick up where you left off"),
      },
      {
        label: translate("nav.checkoutExpress", "Express pay"),
        href: appendQuery("/checkout", "mode=express"),
        description: translate("nav.checkoutExpressDesc", "Apple Pay, Google Pay"),
      },
      {
        label: translate("nav.checkoutSupport", "Need help?"),
        href: appendQuery("/contact", "topic=order"),
        description: translate("nav.checkoutSupportDesc", "Talk to concierge"),
      },
    ],
  }),
  "/contact": ({ translate }) => ({
    title: translate("nav.contactTitle", "Contact routes"),
    subtitle: translate("nav.contactSubtitle", "Support, press and business enquiries"),
    items: [
      {
        label: translate("nav.contactSupport", "Customer care"),
        href: "/contact",
        description: translate("nav.contactSupportDesc", "Live chat & email within 24h"),
      },
      {
        label: translate("nav.contactBusiness", "Business enquiries"),
        href: appendQuery("/contact", "topic=business"),
        description: translate("nav.contactBusinessDesc", "Wholesale, gifting, or bulk orders"),
      },
      {
        label: translate("nav.contactPress", "Press kit"),
        href: appendQuery("/contact", "topic=press"),
        description: translate("nav.contactPressDesc", "Logos, photo assets, quotes"),
      },
    ],
  }),
  "/account": ({ translate }) => ({
    title: translate("nav.accountTitle", "Account hub"),
    subtitle: translate("nav.accountSubtitle", "Profile, security, loyalty"),
    items: [
      {
        label: translate("nav.accountProfile", "Profile & security"),
        href: "/account",
        description: translate("nav.accountProfileDesc", "Password, MFA, addresses"),
      },
      {
        label: translate("nav.accountOrders", "Orders & invoices"),
        href: "/account/orders",
        description: translate("nav.accountOrdersDesc", "Track packages, download PDF"),
      },
      {
        label: translate("nav.accountFavorites", "Favorites"),
        href: "/account/favorites",
        description: translate("nav.accountFavoritesDesc", "Saved items in one place"),
      },
      {
        label: translate("nav.accountReviews", "My reviews"),
        href: "/account/reviews",
        description: translate("nav.accountReviewsDesc", "Rate purchases & earn perks"),
      },
    ],
  }),
  "/account/orders": ({ translate }) => ({
    title: translate("nav.ordersTitle", "Order center"),
    subtitle: translate("nav.ordersSubtitle", "Tracking, returns, invoices"),
    items: [
      {
        label: translate("nav.ordersTrack", "Track shipment"),
        href: appendQuery("/account/orders", "view=tracking"),
        description: translate("nav.ordersTrackDesc", "Live updates & ETA"),
      },
      {
        label: translate("nav.ordersReturns", "Start a return"),
        href: appendQuery("/account/orders", "view=returns"),
        description: translate("nav.ordersReturnsDesc", "Instant label generator"),
      },
      {
        label: translate("nav.ordersInvoices", "Download invoice"),
        href: appendQuery("/account/orders", "view=invoices"),
        description: translate("nav.ordersInvoicesDesc", "PDF & CSV exports"),
      },
    ],
  }),
  "/account/reviews": ({ translate }) => ({
    title: translate("nav.reviewsTitle", "Feedback studio"),
    subtitle: translate("nav.reviewsSubtitle", "Share impressions, unlock perks"),
    items: [
      {
        label: translate("nav.reviewsPending", "Pending reviews"),
        href: appendQuery("/account/reviews", "view=pending"),
        description: translate("nav.reviewsPendingDesc", "Finish drafts & publish"),
      },
      {
        label: translate("nav.reviewsPublished", "Published feedback"),
        href: appendQuery("/account/reviews", "view=published"),
        description: translate("nav.reviewsPublishedDesc", "Edit or delete posts"),
      },
      {
        label: translate("nav.reviewsRewards", "Rewards & levels"),
        href: appendQuery("/account/reviews", "view=rewards"),
        description: translate("nav.reviewsRewardsDesc", "Points, tiers, bonuses"),
      },
    ],
  }),
};

export function SiteHeaderClient({
  navItems,
  brandName,
  tagline,
  catalogCategories,
}: SiteHeaderClientProps) {
  const { lang } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();
  const { totalQty } = useCart();
  const { trackSearch } = useHeaderTracking();

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    if (href === "/products") {
      return pathname === "/products" || pathname.startsWith("/products/");
    }
    return pathname === href;
  };

  const translate = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value && value !== key ? value : fallback;
    },
    [t],
  );

  const initialSearchValue = useMemo(() => sanitizeSearchParam(searchParams?.get("q")) ?? "", [searchParams]);
  const {
    searchOpen,
    setSearchOpen,
    searchValue,
    setSearchValue,
    searchPanelReady,
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
    setSearchPanelReady,
  } = useSiteHeaderState({
    initialSearchValue,
    pathname,
    searchParams,
    sanitize: sanitizeSearchParam,
  });

  const nav = useMemo(
    () => navItems.filter((item) => item.href !== "/wishlist" && item.href !== "/"),
    [navItems],
  );
  const navDesktopItems = useMemo(
    () =>
      nav.map((item) => ({
        href: withLang(item.href, lang),
        label: item.labelKey ? translate(item.labelKey, item.label ?? item.href) : item.label ?? item.href,
        active: isActive(item.href),
      })),
    [lang, nav, translate],
  );
  const panelCategories = useMemo(() => catalogCategories ?? [], [catalogCategories]);
  const brandMark = useMemo(() => {
    const trimmed = brandName?.trim() ?? "";
    if (trimmed.length <= 6 && trimmed.length > 0) return trimmed;
    const firstWord = trimmed.split(/\s+/).find(Boolean);
    return firstWord && firstWord.length <= 10 ? firstWord : toInitials(brandName);
  }, [brandName]);

  const primaryLabel = translate("nav.primary", "Primary navigation");
  const searchLabel = translate("header.search", "Search");
  const wishlistLabel = translate("nav.wishlist", "Wishlist");
  const accountLabel = translate("nav.account", "Account");
  const cartLabel = translate("nav.cart", "Cart");
  const homeLabel = translate("nav.home", "Home");
  const menuLabel = translate("nav.menu", "Menu");
  const mobileMenuId = "site-header-mobile-menu";
  const notificationLabel = translate("nav.notifications", "Updates");
  const panelSubtitleDefault = translate(
    "nav.panel.defaultSubtitle",
    "Quick shortcuts and featured actions",
  );

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const base = withLang("/products", lang);
    const [pathPart, queryPart = ""] = base.split("?");
    const params = new URLSearchParams(queryPart);
    const trimmed = searchValue.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    setSearchOpen(false);
    router.push(qs ? `${pathPart}?${qs}` : pathPart);
    if (trimmed) {
      trackSearch(trimmed);
    }
  };

  const buildPanel = (href: string, label: string): HoverPanel => {
    const builder = NAV_PANEL_PRESETS[href];
    const panel =
      builder?.({ label, href, translate, categories: panelCategories }) ?? {
        title: label,
        subtitle: panelSubtitleDefault,
        items: [
          {
            label: translate("nav.panel.openSection", `Open ${label}`),
            href,
            description: translate("nav.panel.openSectionDesc", "Jump directly to the section"),
          },
          {
            label: translate("nav.panel.latest", "Latest updates"),
            href: appendQuery(href, "view=latest"),
            description: translate("nav.panel.latestDesc", "What changed this week"),
          },
        ],
      };

    return {
      ...panel,
      items: panel.items.map((panelItem) => ({
        ...panelItem,
        href: withLang(panelItem.href, lang),
      })),
    };
  };

  const actionButtons: ActionButton[] = [
    {
      key: "notif",
      label: notificationLabel,
      icon: <Bell size={18} aria-hidden />,
      href: withLang("/contact", lang),
      isActive: pathname === "/contact",
    },
    {
      key: "wishlist",
      label: wishlistLabel,
      icon: <Heart size={18} aria-hidden />,
      href: withLang("/wishlist", lang),
      isActive: pathname?.startsWith("/wishlist") ?? false,
    },
    {
      key: "account",
      label: accountLabel,
      icon: <User size={18} aria-hidden />,
      href: withLang("/account", lang),
      isActive: pathname?.startsWith("/account") ?? false,
    },
    {
      key: "search",
      label: searchLabel,
      icon: <Search size={18} aria-hidden />,
      onClick: () => {
        setSearchOpen((v) => !v);
      },
      togglesSearch: true,
    },
  ];

  const notificationsCount = 0;

  const bottomNavItems = [
    {
      key: "search",
      label: searchLabel,
      icon: <Search size={18} aria-hidden />,
      onClick: () => {
        setSearchPanelReady(true);
        setSearchOpen((v) => !v);
      },
      togglesSearch: true,
      isActive: searchOpen,
    },
    {
      key: "wishlist",
      label: wishlistLabel,
      icon: <Heart size={18} aria-hidden />,
      href: withLang("/wishlist", lang),
      isActive: pathname?.startsWith("/wishlist") ?? false,
    },
    {
      key: "home",
      label: homeLabel,
      icon: <Home size={18} aria-hidden />,
      href: withLang("/", lang),
      isActive: pathname === "/",
    },
    {
      key: "notif",
      label: notificationLabel,
      icon: <Bell size={18} aria-hidden />,
      href: withLang("/contact", lang),
      badge: notificationsCount,
      isActive: pathname === "/contact",
    },
    {
      key: "account",
      label: accountLabel,
      icon: <User size={18} aria-hidden />,
      href: withLang("/account", lang),
      isActive: pathname?.startsWith("/account") ?? false,
    },
  ];

  const mobileNavItems = nav.map((item) => ({
    ...item,
    label: item.labelKey ? translate(item.labelKey, item.label ?? item.href) : item.label ?? item.href,
    href: withLang(item.href, lang),
    active: isActive(item.href),
  }));

  const quickActions = [
    { key: "wishlist", label: wishlistLabel, href: withLang("/wishlist", lang), icon: <Heart size={18} aria-hidden /> },
    { key: "cart", label: cartLabel, href: withLang("/cart", lang), icon: <ShoppingBag size={18} aria-hidden />, badge: totalQty },
    { key: "account", label: accountLabel, href: withLang("/account", lang), icon: <User size={18} aria-hidden /> },
    { key: "contact", label: notificationLabel, href: withLang("/contact", lang), icon: <Bell size={18} aria-hidden /> },
  ];
  const cartHref = withLang("/cart", lang);
  const cartIcon = <ShoppingBag size={18} aria-hidden />;
  const cartActive = pathname === "/cart";

  const mobileOverlayMenu = isPortalReady && mobileDrawerReady ? (
    <HeaderMobileNav
      open={mobileMenuOpen}
      ready={mobileDrawerReady}
      navItems={mobileNavItems}
      brandName={brandName}
      brandMark={brandMark}
      tagline={tagline}
      menuId={mobileMenuId}
      copy={{
        primaryLabel,
        quickLabel: translate("nav.quick", "Quick actions"),
        searchLabel,
        closeLabel: translate("nav.close", "Close menu"),
        placeholder: translate("header.searchPlaceholder", "Search products"),
      }}
      quickActions={quickActions}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      onSearchSubmit={onSearchSubmit}
      onClose={() => {
        closeMobileMenu();
        mobileMenuButtonRef.current?.focus();
      }}
      onReturnFocus={() => mobileMenuButtonRef.current?.focus()}
    />
  ) : null;

  const bottomNav = (
    <nav className={cn(styles.vhBottomNav, mobileMenuOpen && styles.vhBottomNavHidden)} aria-label={primaryLabel}>
      <ul className={styles.vhBottomNavList}>
        {bottomNavItems.map((item) => {
          const isActive = Boolean(item.isActive);
          const badgeValue = item.badge ?? 0;
          const baseClass = cn(styles.vhBottomNavButton, isActive && styles.vhBottomNavButtonActive);

          return (
            <li key={`bottom-${item.key}`} className={styles.vhBottomNavItem}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={baseClass}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className={styles.vhBottomNavIcon} aria-hidden>
                    {item.icon}
                    {badgeValue > 0 ? (
                      <span className={styles.vhBottomNavBadge} aria-label={`${badgeValue} unread`}>
                        {badgeValue > 99 ? "99+" : badgeValue}
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.vhBottomNavLabel}>{item.label}</span>
                </Link>
              ) : (
                <button type="button" className={baseClass} aria-label={item.label} onClick={item.onClick}>
                  <span className={styles.vhBottomNavIcon} aria-hidden>
                    {item.icon}
                  </span>
                  <span className={styles.vhBottomNavLabel}>{item.label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const bottomNavPortal = isPortalReady ? createPortal(bottomNav, document.body) : null;

  return (
    <>
      <header
        className={cn(
          styles.vhHeader,
          scrolled && styles.vhHeaderScrolled,
          mobileMenuOpen && styles.vhHeaderExpanded,
        )}
      >
        <div className={cn(styles.vhInner, mobileMenuOpen && styles.vhInnerExpanded)}>
          <div>
            <Link href={withLang("/", lang)} className={styles.vhBrandLink} aria-label={brandName}>
              <span className={styles.vhBrandMark}>{brandMark}</span>
              <span className={styles.vhBrandName}>{brandName}</span>
            </Link>
          </div>

          <div className={styles.vhNavWrapper}>
            <HeaderDesktopNav
              items={navDesktopItems}
              primaryLabel={primaryLabel}
              hoveredNav={hoveredNav}
              onHoverChange={setHoveredNav}
              buildPanel={buildPanel}
            />
          </div>

          <div className={styles.vhMobileControls}>
            <button
              type="button"
              ref={mobileMenuButtonRef}
              className={styles.vhMenuButton}
              aria-label={menuLabel}
              aria-expanded={mobileMenuOpen}
              aria-controls={mobileMenuId}
              onClick={toggleMobileMenu}
            >
              <Menu size={18} aria-hidden />
              <span>{menuLabel}</span>
            </button>
          </div>

          <HeaderActions
            actionButtons={actionButtons}
            accountMenuReady={accountMenuReady}
            enableAccountMenu={enableAccountMenu}
            searchPanelReady={searchPanelReady}
            searchOpen={searchOpen}
            searchValue={searchValue}
            searchLabel={searchLabel}
            searchPlaceholder={translate("header.searchPlaceholder", "Search products")}
            lang={lang}
            applyLang={withLang}
            onSearchChange={setSearchValue}
            onSearchSubmit={onSearchSubmit}
            onSearchClose={() => setSearchOpen(false)}
            cartHref={cartHref}
            cartLabel={cartLabel}
            cartActive={cartActive}
            cartQty={totalQty ?? null}
            cartIcon={cartIcon}
          />
        </div>
      </header>
      {bottomNavPortal}
      {mobileOverlayMenu}
    </>
  );
}

export default SiteHeaderClient;
