import { describe, expect, it } from "vitest";

import {
  normalizeOrderStatuses,
  resolveStatusFilters,
  toOrderStatus,
  toPaymentStatus,
} from "../packages/shared/src/lib/status-map";

describe("status-map", () => {
  it("normalizes mixed order and payment statuses", () => {
    const result = normalizeOrderStatuses(["Paid", "succeeded", "cancelled", "canceled", "processing"]);
    expect(result.sort()).toEqual(["cancelled", "paid", "pending"]);
  });

  it("maps payment statuses to order filters via resolveStatusFilters", () => {
    const { order, payment } = resolveStatusFilters("succeeded");
    expect(order).toEqual(["paid"]);
    expect(payment).toEqual(["succeeded"]);
  });

  it("returns distinct order/payment values with aliases", () => {
    const { order, payment } = resolveStatusFilters(["canceled", "refunded"]);
    expect(order.sort()).toEqual(["cancelled", "refunded"]);
    expect(payment.sort()).toEqual(["canceled", "cancelled", "refunded"]);
  });

  it("coerces to canonical values", () => {
    expect(toOrderStatus("CANCELED")).toBe("cancelled");
    expect(toOrderStatus("settled")).toBe("paid");
    expect(toOrderStatus("unknown")).toBeNull();
    expect(toPaymentStatus("CANCELLED")).toBe("cancelled");
    expect(toPaymentStatus("invalid")).toBeNull();
  });
});
