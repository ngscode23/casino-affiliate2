/* eslint-disable no-console */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCurrency(value) {
  return normalizeString(value).toUpperCase() || null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(path, options) {
  const res = await fetch(path, { credentials: "include", ...options });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    const message = json.message || json.error || `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return json;
}

function printKV(label, data) {
  console.group(label);
  if (data == null) {
    console.log("empty");
  } else if (Array.isArray(data)) {
    console.table(data);
  } else {
    console.table([data]);
  }
  console.groupEnd();
}

async function triggerRun(supplierId) {
  try {
    await fetchJson("/api/admin/supplier-feed/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplier_id: supplierId, mode: "remote" }),
    });
    return { ok: true };
  } catch (err) {
    const message = err?.message || String(err);
    if (message.includes("already_running")) return { ok: true, warning: "already_running" };
    return { ok: false, error: message };
  }
}

async function waitForLatestRun(supplierId, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 120000);
  const intervalMs = Number(options.intervalMs || 2000);
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const runs = await fetchJson(`/api/admin/supplier-feed/runs?supplier_id=${supplierId}&limit=1`);
    const latest = (runs.items || [])[0] || null;
    if (latest && latest.status && latest.status !== "running") {
      return latest;
    }
    await sleep(intervalMs);
  }
  throw new Error("run_timeout");
}

function buildExpected(options) {
  const list = Array.isArray(options.expected) ? options.expected : [];
  const vendorList = Array.isArray(options.expectedVendorSkus) ? options.expectedVendorSkus : [];
  const combined = list.length
    ? list
    : vendorList.map((vendor_sku) => ({
        vendor_sku,
      }));
  return combined
    .map((item) => ({
      vendor_sku: normalizeString(item.vendor_sku),
      min_qty: typeof item.min_qty === "number" ? item.min_qty : 1,
      price_cents: typeof item.price_cents === "number" ? item.price_cents : null,
      currency: normalizeCurrency(item.currency),
    }))
    .filter((item) => item.vendor_sku);
}

function inventoryOk(row, minQty) {
  if (!row) return false;
  if (row.is_available !== true) return false;
  if (typeof row.stock_quantity === "number" && row.stock_quantity < minQty) return false;
  const status = normalizeString(row.inventory_status).toLowerCase();
  if (status === "out_of_stock") return false;
  return true;
}

function offerOk(row, expected) {
  if (!row) return false;
  if (normalizeString(row.status).toLowerCase() !== "active") return false;
  if (typeof expected.price_cents === "number" && row.price_cents !== expected.price_cents) return false;
  if (expected.currency && normalizeCurrency(row.currency) !== expected.currency) return false;
  return true;
}

function isStale(row, staleHours) {
  if (!row || !row.last_synced_at) return true;
  const parsed = Date.parse(row.last_synced_at);
  if (!Number.isFinite(parsed)) return true;
  const staleAfterMs = staleHours * 3600 * 1000;
  return Date.now() - parsed > staleAfterMs;
}

async function fetchSnapshot(params) {
  const { supplierId, expected, limit, staleHours } = params;
  const snapshot = {};

  const runs = await fetchJson(`/api/admin/supplier-feed/runs?supplier_id=${supplierId}&limit=1`);
  const latest = (runs.items || [])[0] || null;
  snapshot.latest_run = latest;

  const unmapped = await fetchJson(`/api/admin/supplier-feed/unmapped?supplier_id=${supplierId}&limit=${limit}`);
  snapshot.unmapped_count = (unmapped.items || []).length;

  const mappings = await fetchJson(`/api/admin/supplier-skus?supplier_id=${supplierId}&limit=${limit}`);
  const mappingRows = mappings.items || [];
  const uuidLike = mappingRows.filter((row) => typeof row?.supplier_sku === "string" && UUID_RE.test(row.supplier_sku));
  snapshot.mappings_uuid_like = uuidLike.length;
  snapshot.mappings_count = mappingRows.length;

  const mappingByVendor = new Map();
  for (const row of mappingRows) {
    const vendorSku = normalizeString(row?.supplier_sku);
    const skuId = normalizeString(row?.sku_id);
    if (vendorSku && skuId) mappingByVendor.set(vendorSku, skuId);
  }

  const inventory = await fetchJson(`/api/admin/supplier-inventory?supplier_id=${supplierId}&limit=${limit}`);
  const inventoryRows = inventory.items || [];
  const inventoryBySku = new Map();
  for (const row of inventoryRows) {
    const skuId = normalizeString(row?.sku_id);
    if (!skuId) continue;
    inventoryBySku.set(skuId, row);
  }

  const offers = await fetchJson(`/api/admin/supplier-offers?supplier_id=${supplierId}&limit=${limit}`);
  const offerRows = offers.items || [];
  const offersBySku = new Map();
  for (const row of offerRows) {
    const skuId = normalizeString(row?.sku_id);
    if (!skuId) continue;
    offersBySku.set(skuId, row);
  }

  const expectedChecks = expected.map((exp) => {
    const skuId = mappingByVendor.get(exp.vendor_sku) || null;
    const inventoryRow = skuId ? inventoryBySku.get(skuId) : null;
    const offerRow = skuId ? offersBySku.get(skuId) : null;
    const inventory_ok = inventoryOk(inventoryRow, exp.min_qty);
    const offer_ok = offerOk(offerRow, exp);
    const stale = skuId ? isStale(inventoryRow, staleHours) : true;
    return {
      vendor_sku: exp.vendor_sku,
      sku_id: skuId,
      offer_ok,
      inventory_ok,
      qty: inventoryRow?.stock_quantity ?? null,
      status: inventoryRow?.inventory_status ?? null,
      price: offerRow?.price_cents ?? null,
      currency: offerRow?.currency ?? null,
      last_synced_at: inventoryRow?.last_synced_at ?? null,
      stale,
    };
  });

  snapshot.expected_checks = expectedChecks;
  snapshot.mappingByVendor = mappingByVendor;
  return snapshot;
}

function assertSnapshot(snapshot, expected, issues) {
  const latest = snapshot.latest_run;
  if (!latest) {
    issues.push("no_runs");
  } else if (latest.status !== "success") {
    issues.push(`run_not_success:${latest.status}`);
  } else {
    const invalid = toNumber(latest?.stats?.invalid);
    if (invalid > 0) issues.push(`stats_invalid:${invalid}`);
  }

  if (snapshot.mappings_uuid_like > 0) {
    issues.push(`uuid_like_supplier_sku:${snapshot.mappings_uuid_like}`);
  }

  for (const exp of expected) {
    const check = snapshot.expected_checks.find((row) => row.vendor_sku === exp.vendor_sku);
    if (!check || !check.sku_id) {
      issues.push(`missing_mapping:${exp.vendor_sku}`);
      continue;
    }
    if (!check.inventory_ok) {
      issues.push(`inventory_not_ok:${exp.vendor_sku}`);
    }
    if (!check.offer_ok) {
      issues.push(`offer_not_ok:${exp.vendor_sku}`);
    }
    if (check.stale) {
      issues.push(`inventory_stale:${exp.vendor_sku}`);
    }
  }
}

export async function runSupplierFeedCheck(options = {}) {
  let supplierId = options.supplierId || options.supplier_id || "";
  const run = Boolean(options.run);
  const limit = Number(options.limit || 1000);
  const staleHours = Number(options.staleHours || 24);
  const expected = buildExpected(options);

  if (!supplierId) {
    supplierId = window.prompt("Enter supplier_id") || "";
  }
  if (!supplierId) {
    console.warn("supplier_id is required");
    return { ok: false, error: "supplier_id_required" };
  }

  const issues = [];
  const summary = { supplier_id: supplierId };

  console.group(`Supplier feed smoke check (${supplierId})`);

  const before = await fetchSnapshot({ supplierId, expected, limit, staleHours });
  summary.before = before;
  printKV("Latest run (before)", before.latest_run);
  printKV("Expected checks (before)", before.expected_checks);

  if (run) {
    const trigger = await triggerRun(supplierId);
    summary.run_trigger = trigger;
    if (!trigger.ok) issues.push(`run_trigger_failed:${trigger.error}`);
  }

  let after = before;
  if (run) {
    try {
      const latest = await waitForLatestRun(supplierId);
      summary.run_latest = latest;
    } catch (err) {
      issues.push(`run_timeout:${err?.message || String(err)}`);
    }
    after = await fetchSnapshot({ supplierId, expected, limit, staleHours });
  }

  summary.after = after;
  printKV(run ? "Latest run (after)" : "Latest run", after.latest_run);
  printKV(run ? "Expected checks (after)" : "Expected checks", after.expected_checks);

  assertSnapshot(after, expected, issues);

  summary.issues = issues;
  const ok = issues.length === 0;
  if (ok) {
    console.info("PASS");
  } else {
    console.warn("FAIL. Issues:", issues);
  }

  console.groupEnd();
  return { ok, summary, issues };
}

if (typeof window !== "undefined") {
  window.runSupplierFeedCheck = runSupplierFeedCheck;
  console.info("runSupplierFeedCheck is ready. Example:");
  console.info("await window.runSupplierFeedCheck({ supplierId: '...' })");
}
