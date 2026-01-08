"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "@shared/lib/i18n";
import { CompareProvider } from "@shared/ctx/CompareContext";
import { CartProvider } from "@shared/ecom/lib/cart";
import { WishlistProvider } from "@shared/ecom/lib/wishlist";
import { ToastContainer } from "@ui/components/common/toast";

export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <CompareProvider>
        <CartProvider>
          <WishlistProvider>
            {children}
            <ToastContainer />
          </WishlistProvider>
        </CartProvider>
      </CompareProvider>
    </I18nProvider>
  );
}
