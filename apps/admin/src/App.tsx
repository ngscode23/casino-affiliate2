import { Suspense, lazy } from "react";

import "@fontsource-variable/inter";
import "./index.css";

import { I18nProvider } from "@shared/lib/i18n";
import { VerticalProvider } from "@shared/ctx/VerticalContext";
import { CompareProvider } from "@shared/ctx/CompareContext";
import { CartProvider } from "@shared/ecom/lib/cart";
import { WishlistProvider } from "@shared/ecom/lib/wishlist";
import { ToastContainer } from "@ui/components/common/toast";
import Skeleton from "@ui/components/common/skeleton";

const AdminApp = lazy(() => import("@admin/pages/Admin"));

export default function App() {
  return (
    <I18nProvider>
      <VerticalProvider>
        <CompareProvider>
          <CartProvider>
            <WishlistProvider>
              <Suspense fallback={<div className="p-6"><Skeleton className="h-5 w-32" /></div>}>
                <AdminApp />
              </Suspense>
              <ToastContainer />
            </WishlistProvider>
          </CartProvider>
        </CompareProvider>
      </VerticalProvider>
    </I18nProvider>
  );
}
