"use client";

import Section from "@ui/components/common/section";

import { AsyncSection } from "@/components/ui/AsyncSection";
import ErrorBanner from "@/components/ui/ErrorBanner";

import { OrdersAnalytics } from "./components/OrdersAnalytics";
import { OrdersFilters } from "./components/OrdersFilters";
import { OrdersFooter } from "./components/OrdersFooter";
import { OrdersList, STATUS_OPTIONS } from "./components/OrdersList";
import { useOrders } from "./useOrders";

export function OrdersClient() {
  const {
    statusFilter,
    searchValue,
    setSearchValue,
    limit,
    orders,
    total,
    hasMore,
    nextCursor,
    loading,
    error,
    sectionStatus,
    expanded,
    details,
    pendingMap,
    slugMap,
    onSearchSubmit,
    onStatusSelect,
    onPageSizeSelect,
    onLoadMore,
    onResetCursor,
    toggleOrder,
    performCancel,
    performPayment,
    onRefresh,
  } = useOrders();

  const ordersSkeleton = (
    <div className="space-y-3" aria-live="polite">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-16 rounded-2xl border border-border/20 bg-card/60" />
      ))}
    </div>
  );

  return (
    <Section className="py-12">
      <OrdersAnalytics status={statusFilter} searchValue={searchValue} limit={limit} total={total} count={orders.length} />
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">Account</span>
          <h1 className="text-3xl font-semibold text-fg sm:text-4xl">Order history</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Track your purchases, manage payments, and revisit receipts in one place.
          </p>
        </header>

        <div className="space-y-6 rounded-3xl border border-border/35 bg-card/80 p-6 shadow-soft backdrop-blur">
          <OrdersFilters
            status={statusFilter}
            statusOptions={STATUS_OPTIONS}
            onStatusChange={onStatusSelect}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onSubmit={onSearchSubmit}
            limit={limit}
            onPageSizeChange={onPageSizeSelect}
          />

          <AsyncSection
            status={sectionStatus}
            skeleton={ordersSkeleton}
            errorFallback={<ErrorBanner description={error ?? "We couldn't load your orders."} onRetry={onRefresh} />}
          >
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-border/35 bg-card/70 p-6 text-sm text-muted-foreground">
                No orders found. Try adjusting the filters or search query.
              </div>
            ) : (
              <OrdersList
                orders={orders}
                expanded={expanded}
                details={details}
                pendingMap={pendingMap}
                slugMap={slugMap}
                onToggle={toggleOrder}
                onPay={performPayment}
                onCancel={performCancel}
              />
            )}
          </AsyncSection>
        </div>

        {orders.length > 0 && !loading ? (
          <OrdersFooter
            count={orders.length}
            total={total}
            hasMore={hasMore}
            cursor={nextCursor}
            onResetCursor={onResetCursor}
            onLoadMore={onLoadMore}
          />
        ) : null}
      </div>
    </Section>
  );
}
