"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import { toast } from "@ui/components/common/toast";
import { AdminSectionHeading, AdminStack, AdminSurface } from "@/components/admin/layout";

type SupplierRecord = {
  id: string;
  name: string | null;
  code: string | null;
  status?: string | null;
  default_currency?: string | null;
  api_base_url?: string | null;
};

type UnmappedRecord = {
  id: string;
  supplier_id: string;
  vendor_sku: string;
  last_seen_at?: string | null;
  sample_payload?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SkuSearchItem = {
  id: string;
  sku?: string | null;
  slug: string;
  title: string;
  currency?: string | null;
  status?: string | null;
};

type CatalogSummary = {
  id: string;
  slug: string;
  title: string;
  status?: string | null;
  brand_id?: string | null;
  brand_name?: string | null;
  brand_slug?: string | null;
};

type CatalogSuggestion = {
  catalog_id: string;
  title: string;
  slug: string;
  status?: string | null;
  brand_id?: string | null;
  brand_name?: string | null;
  brand_slug?: string | null;
  match_types: string[];
  match_values: Record<string, string>;
};

type CatalogInfo = {
  catalog: CatalogSummary | null;
  identifiers: {
    gtin?: string | null;
    mpn?: string | null;
    brand?: string | null;
  };
  suggestions: CatalogSuggestion[];
};

type SuggestionSku = {
  id: string;
  sku?: string | null;
  slug: string;
  title: string;
  currency?: string | null;
  price_cents?: number | null;
  status?: string | null;
};

type SuggestionItem = {
  sku: SuggestionSku;
  match_types: string[];
  match_values: Record<string, string>;
};

type ReadinessMapping = {
  id: string;
  supplier_id: string;
  supplier_name?: string | null;
  supplier_code?: string | null;
  supplier_sku?: string | null;
  cost_cents?: number | null;
  currency?: string | null;
  lead_time_days?: number | null;
  last_synced_at?: string | null;
  last_seen_at?: string | null;
  miss_count?: number | null;
  status?: string | null;
};

type ReadinessItem = {
  sku_id: string;
  sellable: boolean;
  reason: string | null;
  mappings: ReadinessMapping[];
  best_offer: {
    supplierId: string;
    supplier_name?: string | null;
    supplier_code?: string | null;
    offerId?: string | null;
    supplierSkuId?: string | null;
    priceCents: number | null;
    currency: string | null;
    costCents?: number | null;
    leadTimeDays?: number | null;
    stockQuantity?: number | null;
    isAvailable?: boolean | null;
    inventoryStatus?: string | null;
    lastSyncedAt?: string | null;
  } | null;
  inventory: {
    status: string;
    stock_quantity: number | null;
    is_available: boolean | null;
    inventory_status: string | null;
    last_synced_at: string | null;
    stale: boolean;
  } | null;
};

type ApiListResponse<T> = {
  ok?: boolean;
  items?: T[];
  error?: string;
  message?: string;
};

type ApiMutationResponse<T> = {
  ok?: boolean;
  item?: T;
  error?: string;
  message?: string;
};

type SuggestionsResponse = {
  ok?: boolean;
  identifiers?: {
    gtin?: string | null;
    mpn?: string | null;
  };
  suggestions?: SuggestionItem[];
  error?: string;
  message?: string;
};

type CreateSkuResponse = {
  ok?: boolean;
  sku?: SkuSearchItem;
  item?: ReadinessMapping;
  error?: string;
  message?: string;
  sku_id?: string;
  mapping_id?: string;
  existing_id?: string;
  suggested_slug?: string;
  suggested_sku?: string;
};

type ApiError = Error & {
  code?: string;
  sku_id?: string;
  mapping_id?: string;
  existing_id?: string;
  suggested_slug?: string;
  suggested_sku?: string;
};

type MappingFormState = {
  vendorSku: string;
  costCents: string;
  currency: string;
  leadTimeDays: string;
};

const EMPTY_FORM: MappingFormState = {
  vendorSku: "",
  costCents: "",
  currency: "USD",
  leadTimeDays: "",
};

const REASON_LABELS: Record<string, string> = {
  no_mapping: "No mapping",
  inventory_missing: "Inventory missing",
  inventory_stale: "Inventory stale",
  out_of_stock: "Out of stock",
  offer_unavailable: "Offer unavailable",
};

const GTIN_KEYS = ["gtin", "gtin14", "gtin13", "ean", "ean13", "upc", "upca", "upc_a", "barcode"];
const MPN_KEYS = ["mpn", "manufacturer_part_number", "mfr_part_number", "part_number", "manufacturerPartNumber", "mfrPartNumber"];
const BRAND_KEYS = ["brand", "manufacturer", "maker"];
const PRICE_CENTS_KEYS = ["price_cents", "priceCents"];
const PRICE_KEYS = ["price"];
const QUANTITY_KEYS = ["stock_quantity", "qty", "quantity", "stock"];
const CURRENCY_KEYS = ["currency", "ccy"];

function formatCurrency(value?: number | null, currency?: string | null) {
  if (value == null) return "-";
  const ccy = currency || "USD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(value / 100);
  } catch {
    return `${value} ${ccy}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function pickSampleTitle(payload?: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const candidates = [
    payload.title,
    payload.name,
    payload.product_title,
    payload.product_name,
    payload.model,
    payload.item,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

function readPayloadString(payload: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!payload) return null;
  const sources: Array<Record<string, unknown> | null | undefined> = [
    payload,
    payload.identifiers as Record<string, unknown> | null | undefined,
    payload.attributes as Record<string, unknown> | null | undefined,
  ];
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const value =
        source[key] ?? source[key.toLowerCase()] ?? source[key.toUpperCase()] ?? source[key.replace(/_/g, "")];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

function readPayloadNumber(payload: Record<string, unknown> | null | undefined, keys: string[]): number | null {
  if (!payload) return null;
  const sources: Array<Record<string, unknown> | null | undefined> = [
    payload,
    payload.identifiers as Record<string, unknown> | null | undefined,
    payload.attributes as Record<string, unknown> | null | undefined,
  ];
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const value =
        source[key] ?? source[key.toLowerCase()] ?? source[key.toUpperCase()] ?? source[key.replace(/_/g, "")];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
  }
  return null;
}
async function fetchSuppliers(): Promise<SupplierRecord[]> {
  const response = await fetch("/api/admin/suppliers", { credentials: "include" });
  const payload = (await response.json().catch(() => ({}))) as ApiListResponse<SupplierRecord>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Failed to load suppliers.");
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

async function fetchUnmapped(supplierId: string, query: string): Promise<UnmappedRecord[]> {
  const url = new URL("/api/admin/workbench/unmapped", window.location.origin);
  url.searchParams.set("supplier_id", supplierId);
  if (query) url.searchParams.set("q", query);
  const response = await fetch(url.toString(), { credentials: "include" });
  const payload = (await response.json().catch(() => ({}))) as ApiListResponse<UnmappedRecord>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Failed to load unmapped vendor SKUs.");
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

async function fetchSuggestions(supplierId: string, vendorSku: string) {
  const url = new URL("/api/admin/workbench/suggestions", window.location.origin);
  url.searchParams.set("supplier_id", supplierId);
  url.searchParams.set("vendor_sku", vendorSku);
  const response = await fetch(url.toString(), { credentials: "include" });
  const payload = (await response.json().catch(() => ({}))) as SuggestionsResponse;
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.message || payload.error || "Failed to load suggestions.") as ApiError;
    error.code = payload.error;
    throw error;
  }
  return {
    identifiers: payload.identifiers ?? {},
    suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
  };
}

async function fetchCatalogInfo(skuId: string): Promise<CatalogInfo> {
  const url = new URL("/api/admin/workbench/catalog", window.location.origin);
  url.searchParams.set("sku_id", skuId);
  const response = await fetch(url.toString(), { credentials: "include" });
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    catalog?: CatalogSummary | null;
    identifiers?: { gtin?: string | null; mpn?: string | null; brand?: string | null };
    suggestions?: CatalogSuggestion[];
    error?: string;
    message?: string;
  };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Failed to load catalog info.");
  }
  return {
    catalog: payload.catalog ?? null,
    identifiers: payload.identifiers ?? {},
    suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
  };
}

async function searchCatalog(query: string): Promise<CatalogSummary[]> {
  const url = new URL("/api/admin/workbench/catalog/search", window.location.origin);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "20");
  const response = await fetch(url.toString(), { credentials: "include" });
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    items?: CatalogSummary[];
    error?: string;
    message?: string;
  };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Failed to search catalog.");
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

async function linkCatalog(params: { skuId: string; catalogId: string }) {
  const response = await fetch("/api/admin/workbench/catalog/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ sku_id: params.skuId, catalog_product_id: params.catalogId }),
  });
  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Failed to link catalog model.");
  }
}

async function unlinkCatalog(skuId: string) {
  const response = await fetch("/api/admin/workbench/catalog/unlink", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ sku_id: skuId }),
  });
  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Failed to unlink catalog model.");
  }
}

async function createCatalogFromSku(skuId: string) {
  const response = await fetch("/api/admin/workbench/catalog/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ sku_id: skuId }),
  });
  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Failed to create catalog model.");
  }
}

async function searchSkus(query: string): Promise<SkuSearchItem[]> {
  const url = new URL("/api/admin/shop/products", window.location.origin);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "20");
  const response = await fetch(url.toString(), { credentials: "include" });
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    items?: Array<Record<string, unknown>>;
    error?: string;
    message?: string;
  };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Failed to search SKUs.");
  }
  const items = Array.isArray(payload.items) ? payload.items : [];
  return items
    .map((item) => ({
      id: String(item.id ?? ""),
      sku: typeof item.sku === "string" ? item.sku : null,
      slug: typeof item.slug === "string" ? item.slug : "",
      title: typeof item.title === "string" ? item.title : "",
      currency: typeof item.currency === "string" ? item.currency : null,
      status: typeof item.status === "string" ? item.status : null,
    }))
    .filter((item) => Boolean(item.id) && Boolean(item.slug) && Boolean(item.title));
}

async function fetchReadiness(skuId: string): Promise<ReadinessItem | null> {
  const url = new URL("/api/admin/workbench/sku", window.location.origin);
  url.searchParams.set("sku_id", skuId);
  const response = await fetch(url.toString(), { credentials: "include" });
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    readiness?: ReadinessItem | null;
    error?: string;
    message?: string;
  };
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || payload.error || "Failed to load readiness.");
  }
  return payload.readiness ?? null;
}

async function createSkuFromUnmapped(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/workbench/create-from-unmapped", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as CreateSkuResponse;
  if (!response.ok || !result.ok || !result.sku || !result.item) {
    const error = new Error(result.message || result.error || "Failed to create SKU.") as ApiError;
    error.code = result.error;
    error.sku_id = result.sku_id;
    error.mapping_id = result.mapping_id;
    error.existing_id = result.existing_id;
    error.suggested_slug = result.suggested_slug;
    error.suggested_sku = result.suggested_sku;
    throw error;
  }
  return result;
}

async function mapUnmappedVendorSku(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/workbench/map", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as ApiMutationResponse<ReadinessMapping> & {
    sku_id?: string;
    mapping_id?: string;
  };
  if (!response.ok || !result.ok || !result.item) {
    const error = new Error(result.message || result.error || "Failed to map vendor SKU.") as ApiError;
    error.code = result.error;
    error.sku_id = result.sku_id;
    error.mapping_id = result.mapping_id;
    throw error;
  }
  return result.item;
}

async function saveMapping(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/workbench/map", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as ApiMutationResponse<ReadinessMapping> & {
    sku_id?: string;
    mapping_id?: string;
  };
  if (!response.ok || !result.ok || !result.item) {
    const error = new Error(result.message || result.error || "Failed to save mapping.") as ApiError;
    error.code = result.error;
    error.sku_id = result.sku_id;
    error.mapping_id = result.mapping_id;
    throw error;
  }
  return result.item;
}

async function deleteMapping(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/workbench/unmap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as ApiMutationResponse<ReadinessMapping>;
  if (!response.ok || !result.ok) {
    throw new Error(result.message || result.error || "Failed to unmap.");
  }
  return result.item ?? null;
}

async function runFeedNow(supplierId: string) {
  const response = await fetch("/api/admin/workbench/run-feed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ supplier_id: supplierId, mode: "remote" }),
  });
  const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
  if (!response.ok || result.ok === false) {
    throw new Error(result.message || result.error || "Failed to run feed.");
  }
}

export function DropshipWorkbenchClient() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  const [unmappedItems, setUnmappedItems] = useState<UnmappedRecord[]>([]);
  const [unmappedQuery, setUnmappedQuery] = useState("");
  const [loadingUnmapped, setLoadingUnmapped] = useState(false);
  const [suggestionsByVendorSku, setSuggestionsByVendorSku] = useState<Record<string, SuggestionItem[]>>({});
  const [suggestionsMetaByVendorSku, setSuggestionsMetaByVendorSku] = useState<
    Record<string, { gtin?: string | null; mpn?: string | null }>
  >({});
  const [suggestionsLoadingByVendorSku, setSuggestionsLoadingByVendorSku] = useState<Record<string, boolean>>({});
  const [suggestionsErrorByVendorSku, setSuggestionsErrorByVendorSku] = useState<Record<string, string>>({});
  const [suggestionsNoteByVendorSku, setSuggestionsNoteByVendorSku] = useState<Record<string, string>>({});
  const [rowSkuQueryByVendorSku, setRowSkuQueryByVendorSku] = useState<Record<string, string>>({});
  const [rowSkuResultsByVendorSku, setRowSkuResultsByVendorSku] = useState<Record<string, SkuSearchItem[]>>({});
  const [rowSkuSearchingByVendorSku, setRowSkuSearchingByVendorSku] = useState<Record<string, boolean>>({});

  const [skuQuery, setSkuQuery] = useState("");
  const [skuResults, setSkuResults] = useState<SkuSearchItem[]>([]);
  const [skuSearching, setSkuSearching] = useState(false);
  const [selectedSku, setSelectedSku] = useState<SkuSearchItem | null>(null);

  const [readiness, setReadiness] = useState<ReadinessItem | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);

  const [catalogInfo, setCatalogInfo] = useState<CatalogInfo | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const [catalogSearchResults, setCatalogSearchResults] = useState<CatalogSummary[]>([]);
  const [catalogSearching, setCatalogSearching] = useState(false);
  const [catalogAction, setCatalogAction] = useState<string | null>(null);
  const [catalogSearchOpen, setCatalogSearchOpen] = useState(false);

  const [mappingForm, setMappingForm] = useState<MappingFormState>(EMPTY_FORM);
  const [savingMapping, setSavingMapping] = useState(false);
  const [unmappingId, setUnmappingId] = useState<string | null>(null);

  const [creatingVendorSku, setCreatingVendorSku] = useState<string | null>(null);
  const [mappingVendorSku, setMappingVendorSku] = useState<string | null>(null);
  const [createdByVendorSku, setCreatedByVendorSku] = useState<Record<string, SkuSearchItem>>({});
  const [allowSuffix, setAllowSuffix] = useState(false);

  const [feedRunning, setFeedRunning] = useState(false);
  const [health, setHealth] = useState<{ status: "idle" | "checking" | "ok" | "error"; message?: string; checkedAt?: string }>({
    status: "idle",
  });
  const [mode, setMode] = useState<"unmapped" | "sku">("unmapped");

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null,
    [suppliers, selectedSupplierId],
  );

  const clearSuggestionState = useCallback((vendorSku: string) => {
    setSuggestionsByVendorSku((prev) => {
      if (!prev[vendorSku]) return prev;
      const next = { ...prev };
      delete next[vendorSku];
      return next;
    });
    setSuggestionsMetaByVendorSku((prev) => {
      if (!prev[vendorSku]) return prev;
      const next = { ...prev };
      delete next[vendorSku];
      return next;
    });
    setSuggestionsErrorByVendorSku((prev) => {
      if (!prev[vendorSku]) return prev;
      const next = { ...prev };
      delete next[vendorSku];
      return next;
    });
    setSuggestionsNoteByVendorSku((prev) => {
      if (!prev[vendorSku]) return prev;
      const next = { ...prev };
      delete next[vendorSku];
      return next;
    });
    setSuggestionsLoadingByVendorSku((prev) => {
      if (!prev[vendorSku]) return prev;
      const next = { ...prev };
      delete next[vendorSku];
      return next;
    });
  }, []);

  const clearRowSkuState = useCallback((vendorSku: string) => {
    setRowSkuQueryByVendorSku((prev) => {
      if (!prev[vendorSku]) return prev;
      const next = { ...prev };
      delete next[vendorSku];
      return next;
    });
    setRowSkuResultsByVendorSku((prev) => {
      if (!prev[vendorSku]) return prev;
      const next = { ...prev };
      delete next[vendorSku];
      return next;
    });
    setRowSkuSearchingByVendorSku((prev) => {
      if (!prev[vendorSku]) return prev;
      const next = { ...prev };
      delete next[vendorSku];
      return next;
    });
  }, []);

  const handleApiError = (error: ApiError, fallback: string) => {
    if (error?.code === "vendor_sku_already_mapped" && error.sku_id) {
      const shouldOpen = window.confirm("Vendor SKU already mapped. Open existing SKU?");
      if (shouldOpen) {
        window.location.href = `/admin/shop/products/${error.sku_id}`;
      }
      return;
    }
    toast(error?.message || fallback, { variant: "error" });
  };

  const loadSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const items = await fetchSuppliers();
      setSuppliers(items);
      if (items.length) {
        setSelectedSupplierId((prev) => prev || items[0].id);
      }
    } catch (error: any) {
      toast(error?.message || "Failed to load suppliers.", { variant: "error" });
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  const checkWorkbenchHealth = useCallback(async (supplierId: string) => {
    setHealth({ status: "checking" });
    try {
      const url = new URL("/api/admin/workbench/unmapped", window.location.origin);
      url.searchParams.set("supplier_id", supplierId);
      url.searchParams.set("limit", "1");
      const response = await fetch(url.toString(), { credentials: "include" });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (response.ok && payload.ok) {
        setHealth({ status: "ok", checkedAt: new Date().toLocaleTimeString() });
      } else {
        setHealth({
          status: "error",
          message: payload.message || payload.error || `HTTP ${response.status}`,
          checkedAt: new Date().toLocaleTimeString(),
        });
      }
    } catch (error: any) {
      setHealth({
        status: "error",
        message: error?.message || "Network error",
        checkedAt: new Date().toLocaleTimeString(),
      });
    }
  }, []);

  const loadUnmapped = useCallback(async () => {
    if (!selectedSupplierId) return;
    setLoadingUnmapped(true);
    try {
      const items = await fetchUnmapped(selectedSupplierId, unmappedQuery.trim());
      setUnmappedItems(items);
    } catch (error: any) {
      toast(error?.message || "Failed to load unmapped vendor SKUs.", { variant: "error" });
    } finally {
      setLoadingUnmapped(false);
    }
  }, [selectedSupplierId, unmappedQuery]);

  const handleLoadSuggestions = useCallback(
    async (record: UnmappedRecord) => {
      if (!selectedSupplierId) {
        toast("Select a supplier first.", { variant: "warning" });
        return;
      }
      const vendorSku = record.vendor_sku;
      setSuggestionsLoadingByVendorSku((prev) => ({ ...prev, [vendorSku]: true }));
      setSuggestionsErrorByVendorSku((prev) => ({ ...prev, [vendorSku]: "" }));
      setSuggestionsNoteByVendorSku((prev) => ({ ...prev, [vendorSku]: "" }));
      try {
        const result = await fetchSuggestions(selectedSupplierId, vendorSku);
        setSuggestionsByVendorSku((prev) => ({ ...prev, [vendorSku]: result.suggestions }));
        setSuggestionsMetaByVendorSku((prev) => ({ ...prev, [vendorSku]: result.identifiers }));
      } catch (error: any) {
        if (error?.code === "unmapped_not_found") {
          setSuggestionsByVendorSku((prev) => ({ ...prev, [vendorSku]: [] }));
          setSuggestionsMetaByVendorSku((prev) => ({ ...prev, [vendorSku]: {} }));
          setSuggestionsNoteByVendorSku((prev) => ({
            ...prev,
            [vendorSku]: "Already mapped — suggestions are only available for unmapped vendor SKUs.",
          }));
        } else {
          setSuggestionsErrorByVendorSku((prev) => ({
            ...prev,
            [vendorSku]: error?.message || "Failed to load suggestions.",
          }));
        }
      } finally {
        setSuggestionsLoadingByVendorSku((prev) => ({ ...prev, [vendorSku]: false }));
      }
    },
    [selectedSupplierId],
  );

  const handleRowSkuSearch = useCallback(
    async (record: UnmappedRecord) => {
      const vendorSku = record.vendor_sku;
      const query = (rowSkuQueryByVendorSku[vendorSku] || "").trim();
      if (!query) {
        setRowSkuResultsByVendorSku((prev) => ({ ...prev, [vendorSku]: [] }));
        return;
      }
      setRowSkuSearchingByVendorSku((prev) => ({ ...prev, [vendorSku]: true }));
      try {
        const items = await searchSkus(query);
        setRowSkuResultsByVendorSku((prev) => ({ ...prev, [vendorSku]: items }));
      } catch (error: any) {
        toast(error?.message || "Failed to search SKUs.", { variant: "error" });
      } finally {
        setRowSkuSearchingByVendorSku((prev) => ({ ...prev, [vendorSku]: false }));
      }
    },
    [rowSkuQueryByVendorSku],
  );

  const loadReadiness = useCallback(
    async (skuId?: string | null) => {
      if (!skuId) {
        setReadiness(null);
        return;
      }
      setLoadingReadiness(true);
      try {
        const item = await fetchReadiness(skuId);
        setReadiness(item);
      } catch (error: any) {
        toast(error?.message || "Failed to load readiness.", { variant: "error" });
        setReadiness(null);
      } finally {
        setLoadingReadiness(false);
      }
    },
    [],
  );

  const loadCatalogInfo = useCallback(async (skuId?: string | null) => {
    if (!skuId) {
      setCatalogInfo(null);
      setCatalogError("");
      return;
    }
    setCatalogLoading(true);
    setCatalogError("");
    setCatalogInfo(null);
    try {
      const info = await fetchCatalogInfo(skuId);
      setCatalogInfo(info);
    } catch (error: any) {
      setCatalogError(error?.message || "Failed to load catalog info.");
      setCatalogInfo(null);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const handleSearchSkus = useCallback(async () => {
    const query = skuQuery.trim();
    if (!query) {
      setSkuResults([]);
      return;
    }
    setSkuSearching(true);
    try {
      const items = await searchSkus(query);
      setSkuResults(items);
    } catch (error: any) {
      toast(error?.message || "Failed to search SKUs.", { variant: "error" });
    } finally {
      setSkuSearching(false);
    }
  }, [skuQuery]);

  const handleSelectSku = (item: SkuSearchItem) => {
    setSelectedSku(item);
    setSkuResults([]);
    setSkuQuery("");
    setCatalogSearchQuery("");
    setCatalogSearchResults([]);
    setCatalogSearchOpen(false);
    setMappingForm((prev) => ({
      ...prev,
      currency: (item.currency || selectedSupplier?.default_currency || "USD").toUpperCase(),
    }));
    loadReadiness(item.id).catch(() => undefined);
    loadCatalogInfo(item.id).catch(() => undefined);
  };

  const handleCatalogSearch = useCallback(async () => {
    const query = catalogSearchQuery.trim();
    if (!query) {
      setCatalogSearchResults([]);
      return;
    }
    setCatalogSearching(true);
    try {
      const items = await searchCatalog(query);
      setCatalogSearchResults(items);
    } catch (error: any) {
      toast(error?.message || "Failed to search catalog.", { variant: "error" });
    } finally {
      setCatalogSearching(false);
    }
  }, [catalogSearchQuery]);

  const handleLinkCatalog = useCallback(
    async (catalogId: string) => {
      if (!selectedSku) {
        toast("Select a SKU first.", { variant: "error" });
        return;
      }
      setCatalogAction(`link:${catalogId}`);
      try {
        await linkCatalog({ skuId: selectedSku.id, catalogId });
        toast("Catalog model linked.", { variant: "success" });
        await loadCatalogInfo(selectedSku.id);
        setCatalogSearchOpen(false);
        setCatalogSearchResults([]);
      } catch (error: any) {
        toast(error?.message || "Failed to link catalog model.", { variant: "error" });
      } finally {
        setCatalogAction(null);
      }
    },
    [selectedSku, loadCatalogInfo],
  );

  const handleUnlinkCatalog = useCallback(async () => {
    if (!selectedSku) {
      toast("Select a SKU first.", { variant: "error" });
      return;
    }
    const confirmed = window.confirm("Unlink catalog model from this SKU?");
    if (!confirmed) return;
    setCatalogAction("unlink");
    try {
      await unlinkCatalog(selectedSku.id);
      toast("Catalog link removed.", { variant: "success" });
      await loadCatalogInfo(selectedSku.id);
    } catch (error: any) {
      toast(error?.message || "Failed to unlink catalog model.", { variant: "error" });
    } finally {
      setCatalogAction(null);
    }
  }, [selectedSku, loadCatalogInfo]);

  const handleCreateCatalogFromSku = useCallback(async () => {
    if (!selectedSku) {
      toast("Select a SKU first.", { variant: "error" });
      return;
    }
    setCatalogAction("create");
    try {
      await createCatalogFromSku(selectedSku.id);
      toast("Catalog model created.", { variant: "success" });
      await loadCatalogInfo(selectedSku.id);
    } catch (error: any) {
      toast(error?.message || "Failed to create catalog model.", { variant: "error" });
    } finally {
      setCatalogAction(null);
    }
  }, [selectedSku, loadCatalogInfo]);

  const handleCreateFromUnmapped = async (record: UnmappedRecord, forceAllowSuffix = false) => {
    if (!selectedSupplierId) {
      toast("Select a supplier first.", { variant: "error" });
      return;
    }
    const allowSuffixForRun = forceAllowSuffix || allowSuffix;
    setCreatingVendorSku(record.vendor_sku);
    try {
      const result = await createSkuFromUnmapped({
        supplier_id: selectedSupplierId,
        vendor_sku: record.vendor_sku,
        allow_suffix: allowSuffixForRun,
      });
      const createdSku = result.sku ?? null;
      if (createdSku) {
        setCreatedByVendorSku((prev) => ({ ...prev, [record.vendor_sku]: createdSku }));
        setSelectedSku(createdSku);
        loadReadiness(createdSku.id).catch(() => undefined);
        loadCatalogInfo(createdSku.id).catch(() => undefined);
      }
      setUnmappedItems((prev) => prev.filter((item) => item.vendor_sku !== record.vendor_sku));
      clearSuggestionState(record.vendor_sku);
      clearRowSkuState(record.vendor_sku);
      toast("SKU created from unmapped.", { variant: "success" });
    } catch (error: any) {
      if (error?.code === "sku_slug_conflict") {
        const openExisting = window.confirm("SKU or slug already exists. Open existing SKU?");
        if (openExisting && error.existing_id) {
          window.location.href = `/admin/shop/products/${error.existing_id}`;
          return;
        }
        if (!allowSuffixForRun) {
          const retry = window.confirm("Create SKU with a suffix?");
          if (retry) {
            await handleCreateFromUnmapped(record, true);
            return;
          }
        }
      }
      handleApiError(error, "Failed to create SKU.");
    } finally {
      setCreatingVendorSku(null);
    }
  };

  const handleMapToSku = async (record: UnmappedRecord, skuId: string, skuRecord?: SkuSearchItem | null) => {
    if (!selectedSupplierId) {
      toast("Select a supplier first.", { variant: "error" });
      return;
    }
    setMappingVendorSku(record.vendor_sku);
    try {
      await mapUnmappedVendorSku({
        supplier_id: selectedSupplierId,
        vendor_sku: record.vendor_sku,
        sku_id: skuId,
      });
      setUnmappedItems((prev) => prev.filter((item) => item.vendor_sku !== record.vendor_sku));
      clearSuggestionState(record.vendor_sku);
      clearRowSkuState(record.vendor_sku);
      toast("Mapping created.", { variant: "success" });
      if (skuRecord && selectedSku?.id !== skuRecord.id) {
        setSelectedSku(skuRecord);
        setSkuResults([]);
        setSkuQuery("");
        setMappingForm((prev) => ({
          ...prev,
          currency: (skuRecord.currency || selectedSupplier?.default_currency || "USD").toUpperCase(),
        }));
      }
      loadReadiness(skuId).catch(() => undefined);
      loadCatalogInfo(skuId).catch(() => undefined);
    } catch (error: any) {
      handleApiError(error, "Failed to map vendor SKU.");
    } finally {
      setMappingVendorSku(null);
    }
  };

  const handleMapUnmapped = async (record: UnmappedRecord) => {
    if (!selectedSku) {
      toast("Select a SKU to map first.", { variant: "error" });
      return;
    }
    await handleMapToSku(record, selectedSku.id, selectedSku);
  };

  const handleSaveMapping = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSupplierId) {
      toast("Select a supplier first.", { variant: "error" });
      return;
    }
    if (!selectedSku) {
      toast("Select a SKU to map first.", { variant: "error" });
      return;
    }
    if (!mappingForm.vendorSku.trim()) {
      toast("Vendor SKU is required.", { variant: "error" });
      return;
    }
    setSavingMapping(true);
    try {
      await saveMapping({
        supplier_id: selectedSupplierId,
        sku_id: selectedSku.id,
        supplier_sku: mappingForm.vendorSku.trim(),
        cost_cents: mappingForm.costCents ? Number(mappingForm.costCents) : null,
        currency: mappingForm.currency.trim() || selectedSupplier?.default_currency || "USD",
        lead_time_days: mappingForm.leadTimeDays ? Number(mappingForm.leadTimeDays) : null,
      });
      toast("Mapping saved.", { variant: "success" });
      setMappingForm((prev) => ({ ...prev, vendorSku: "" }));
      loadReadiness(selectedSku.id).catch(() => undefined);
    } catch (error: any) {
      handleApiError(error, "Failed to save mapping.");
    } finally {
      setSavingMapping(false);
    }
  };

  const handleUnmap = async (mapping: ReadinessMapping) => {
    const confirmed = window.confirm("Unmap this supplier SKU? The SKU itself will stay.");
    if (!confirmed) return;
    setUnmappingId(mapping.id);
    try {
      await deleteMapping({ id: mapping.id });
      toast("Mapping removed.", { variant: "success" });
      loadReadiness(selectedSku?.id).catch(() => undefined);
    } catch (error: any) {
      toast(error?.message || "Failed to unmap.", { variant: "error" });
    } finally {
      setUnmappingId(null);
    }
  };

  const handleRunFeed = async () => {
    if (!selectedSupplierId) {
      toast("Select a supplier first.", { variant: "error" });
      return;
    }
    setFeedRunning(true);
    try {
      await runFeedNow(selectedSupplierId);
      toast("Feed started.", { variant: "success" });
      loadUnmapped().catch(() => undefined);
      if (selectedSku?.id) {
        loadReadiness(selectedSku.id).catch(() => undefined);
      }
    } catch (error: any) {
      toast(error?.message || "Failed to run feed.", { variant: "error" });
    } finally {
      setFeedRunning(false);
    }
  };

  useEffect(() => {
    loadSuppliers().catch(() => undefined);
  }, [loadSuppliers]);

  useEffect(() => {
    if (!selectedSupplier) return;
    setMappingForm((prev) => ({
      ...prev,
      currency: (selectedSupplier.default_currency || "USD").toUpperCase(),
    }));
    setCreatedByVendorSku({});
    setSuggestionsByVendorSku({});
    setSuggestionsMetaByVendorSku({});
    setSuggestionsLoadingByVendorSku({});
    setSuggestionsErrorByVendorSku({});
    setRowSkuQueryByVendorSku({});
    setRowSkuResultsByVendorSku({});
    setRowSkuSearchingByVendorSku({});
    loadUnmapped().catch(() => undefined);
    checkWorkbenchHealth(selectedSupplier.id);
  }, [selectedSupplier, loadUnmapped, checkWorkbenchHealth]);

  return (
    <AdminStack gap="lg">
      <AdminSurface>
        <AdminSectionHeading
          title="Supplier context"
          description="Pick a supplier, then manage unmapped vendor SKUs and SKU readiness in one place."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="neutral" onClick={loadUnmapped} disabled={!selectedSupplierId || loadingUnmapped}>
                Refresh unmapped
              </Button>
              <Button
                variant="neutral"
                onClick={() => loadReadiness(selectedSku?.id)}
                disabled={!selectedSku || loadingReadiness}
              >
                Refresh readiness
              </Button>
              <Button variant="soft" onClick={handleRunFeed} disabled={!selectedSupplierId || feedRunning}>
                {feedRunning ? "Running feed..." : "Run feed now"}
              </Button>
            </div>
          }
        />
        <div
          className={clsx(
            "mt-4 rounded-xl border px-4 py-3 text-sm",
            health.status === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-700",
            health.status === "checking" && "border-amber-200 bg-amber-50 text-amber-700",
            health.status === "error" && "border-red-200 bg-red-50 text-red-700",
            (health.status === "idle" || !health.status) && "border-slate-200 bg-slate-50 text-slate-600",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">
              {health.status === "ok"
                ? "Workbench API: OK"
                : health.status === "checking"
                  ? "Workbench API: checking..."
                  : health.status === "error"
                    ? "Workbench API: error"
                    : "Workbench API: waiting for supplier"}
            </div>
            <div className="text-xs text-current/80">
              {health.checkedAt ? `Last checked: ${health.checkedAt}` : " " }
            </div>
          </div>
          {health.status === "error" && health.message ? (
            <div className="mt-1 text-xs">{health.message}</div>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,280px)_1fr] md:items-end">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-admin-text">Supplier</label>
            <select
              className="w-full rounded-xl border border-admin-border bg-white px-3 py-2 text-sm text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              value={selectedSupplierId}
              onChange={(event) => setSelectedSupplierId(event.target.value)}
              disabled={loadingSuppliers}
            >
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name || supplier.code || supplier.id}
                </option>
              ))}
            </select>
            {selectedSupplier ? (
              <p className="text-xs text-admin-textSoft">
                Default currency: {(selectedSupplier.default_currency || "USD").toUpperCase()}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-admin-textSoft">
            <span>Use this page to avoid manual IDs and keep one SKU for many suppliers.</span>
          </div>
        </div>
      </AdminSurface>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-admin-border bg-white p-1 text-xs">
            <button
              type="button"
              className={clsx(
                "rounded-full px-4 py-1.5 font-semibold transition",
                mode === "unmapped" ? "bg-admin-primary text-white" : "text-admin-textSoft",
              )}
              onClick={() => setMode("unmapped")}
            >
              Unmapped
            </button>
            <button
              type="button"
              className={clsx(
                "rounded-full px-4 py-1.5 font-semibold transition",
                mode === "sku" ? "bg-admin-primary text-white" : "text-admin-textSoft",
              )}
              onClick={() => setMode("sku")}
            >
              SKU
            </button>
          </div>
          <span className="text-xs text-admin-textSoft">
            {mode === "unmapped"
              ? "Start from supplier feeds, then map or create SKU."
              : "Start from SKU, then map vendor SKUs and check readiness."}
          </span>
        </div>

        {mode === "unmapped" ? (
          <AdminSurface>
            <AdminSectionHeading
              title="Unmapped vendor SKUs"
              description="Start from supplier feeds. Create a new SKU or map to a selected SKU."
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-semibold text-admin-text">Search vendor SKU</label>
                <Input
                  value={unmappedQuery}
                  onChange={(event) => setUnmappedQuery(event.target.value)}
                  placeholder="Filter vendor SKU"
                />
              </div>
              <Button variant="neutral" onClick={loadUnmapped} disabled={!selectedSupplierId || loadingUnmapped}>
                {loadingUnmapped ? "Loading..." : "Search"}
              </Button>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-admin-textSoft">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-admin-border"
                  checked={allowSuffix}
                  onChange={(event) => setAllowSuffix(event.target.checked)}
                />
                Allow suffix if slug or SKU conflicts
              </label>
            </div>

            {Object.keys(createdByVendorSku).length ? (
              <div className="mt-4 rounded-xl border border-admin-border bg-admin-surfaceMuted p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-admin-text">Created from unmapped</p>
                    <p className="text-xs text-admin-textSoft">Open the SKU or run feed to update offers/inventory.</p>
                  </div>
                  <Button variant="neutral" onClick={handleRunFeed} disabled={feedRunning}>
                    {feedRunning ? "Running..." : "Run feed now"}
                  </Button>
                </div>
                <div className="mt-3 space-y-2 text-sm text-admin-text">
                  {Object.entries(createdByVendorSku).map(([vendorSku, sku]) => (
                    <div key={vendorSku} className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">{vendorSku}</div>
                        <div className="text-xs text-admin-textSoft">{sku.title}</div>
                      </div>
                      <Button
                        variant="ghost"
                        className="min-h-[32px] px-3 py-1 text-xs"
                        onClick={() => {
                          window.location.href = `/admin/shop/products/${sku.id}`;
                        }}
                      >
                        Open created SKU
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {loadingUnmapped ? (
              <p className="py-6 text-sm text-admin-textSoft">Loading unmapped vendor SKUs...</p>
            ) : unmappedItems.length === 0 ? (
              <p className="py-6 text-sm text-admin-textSoft">No unmapped vendor SKUs for this supplier.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-admin-border bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-admin-surfaceMuted text-xs uppercase tracking-[0.18em] text-admin-textSubtle">
                    <tr>
                      <th className="px-4 py-3 text-left">Vendor SKU</th>
                      <th className="px-4 py-3 text-left">Supplier</th>
                      <th className="px-4 py-3 text-left">GTIN / MPN / Brand</th>
                      <th className="px-4 py-3 text-left">Sample price / qty</th>
                      <th className="px-4 py-3 text-left">Last seen</th>
                      <th className="px-4 py-3 text-left">Suggested match</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmappedItems.map((record) => {
                      const sampleTitle = pickSampleTitle(record.sample_payload);
                      const supplierLabel = selectedSupplier?.name || selectedSupplier?.code || record.supplier_id;
                      const gtin = readPayloadString(record.sample_payload, GTIN_KEYS);
                      const mpn = readPayloadString(record.sample_payload, MPN_KEYS);
                      const brand = readPayloadString(record.sample_payload, BRAND_KEYS);
                      const currency = readPayloadString(record.sample_payload, CURRENCY_KEYS) || "USD";
                      const priceCents = readPayloadNumber(record.sample_payload, PRICE_CENTS_KEYS);
                      const price = readPayloadNumber(record.sample_payload, PRICE_KEYS);
                      const qty = readPayloadNumber(record.sample_payload, QUANTITY_KEYS);
                      const displayPrice =
                        priceCents != null
                          ? formatCurrency(Math.round(priceCents), currency)
                          : price != null
                            ? formatCurrency(Math.round(price * 100), currency)
                            : "-";
      const suggestionItems = suggestionsByVendorSku[record.vendor_sku] ?? [];
      const suggestionMeta = suggestionsMetaByVendorSku[record.vendor_sku];
      const suggestionLoading = Boolean(suggestionsLoadingByVendorSku[record.vendor_sku]);
      const suggestionError = suggestionsErrorByVendorSku[record.vendor_sku];
      const suggestionNote = suggestionsNoteByVendorSku[record.vendor_sku];
                      const rowSkuQuery = rowSkuQueryByVendorSku[record.vendor_sku] ?? "";
                      const rowSkuResults = rowSkuResultsByVendorSku[record.vendor_sku] ?? [];
                      const rowSkuSearching = Boolean(rowSkuSearchingByVendorSku[record.vendor_sku]);
                      return (
                        <tr key={record.id} className="border-t border-admin-border/60 align-top">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-admin-text">{record.vendor_sku}</div>
                            <div className="text-xs text-admin-textSoft">{sampleTitle || "No sample title"}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-admin-textSoft">{supplierLabel}</td>
                          <td className="px-4 py-3 text-xs text-admin-textSoft">
                            <div>{gtin ? `GTIN: ${gtin}` : "GTIN: -"}</div>
                            <div>{mpn ? `MPN: ${mpn}` : "MPN: -"}</div>
                            <div>{brand ? `Brand: ${brand}` : "Brand: -"}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-admin-textSoft">
                            <div>Price: {displayPrice}</div>
                            <div>Qty: {qty ?? "-"}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-admin-textSoft">{formatDate(record.last_seen_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="ghost"
                                className="min-h-[28px] px-2 py-1 text-[11px]"
                                onClick={() => handleLoadSuggestions(record)}
                                disabled={suggestionLoading}
                              >
                                {suggestionLoading ? "Loading..." : "Load"}
                              </Button>
                              {suggestionMeta?.gtin || suggestionMeta?.mpn ? (
                                <span className="text-[11px] text-admin-textSoft">
                                  {suggestionMeta?.gtin ? `GTIN: ${suggestionMeta.gtin}` : null}
                                  {suggestionMeta?.gtin && suggestionMeta?.mpn ? " / " : null}
                                  {suggestionMeta?.mpn ? `MPN: ${suggestionMeta.mpn}` : null}
                                </span>
                              ) : null}
                            </div>
                            {suggestionError ? (
                              <div className="mt-2 text-xs text-red-600">{suggestionError}</div>
                            ) : suggestionNote ? (
                              <div className="mt-2 text-xs text-admin-textSoft">{suggestionNote}</div>
                            ) : suggestionItems.length ? (
                              <div className="mt-2 space-y-2">
                                {suggestionItems.map((suggestion) => (
                                  <div key={suggestion.sku.id} className="rounded-lg border border-admin-border/60 p-2">
                                    <div className="text-xs font-semibold text-admin-text">{suggestion.sku.title}</div>
                                    <div className="text-[11px] text-admin-textSoft">
                                      {suggestion.sku.sku || suggestion.sku.slug}
                                    </div>
                                    <div className="text-[11px] text-admin-textSoft">
                                      Match: {suggestion.match_types.join(", ")}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <Button
                                        variant="ghost"
                                        className="min-h-[26px] px-2 py-1 text-[11px]"
                                        onClick={() => {
                                          window.location.href = `/admin/shop/products/${suggestion.sku.id}`;
                                        }}
                                      >
                                        Open SKU
                                      </Button>
                                      <Button
                                        variant="neutral"
                                        className="min-h-[26px] px-2 py-1 text-[11px]"
                                        onClick={() =>
                                          handleMapToSku(record, suggestion.sku.id, {
                                            id: suggestion.sku.id,
                                            sku: suggestion.sku.sku ?? null,
                                            slug: suggestion.sku.slug,
                                            title: suggestion.sku.title,
                                            currency: suggestion.sku.currency ?? null,
                                            status: suggestion.sku.status ?? null,
                                          })
                                        }
                                        disabled={mappingVendorSku === record.vendor_sku}
                                      >
                                        Map
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-admin-textSoft">No suggestions yet.</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-2">
                              <Button
                                variant="soft"
                                onClick={() => handleCreateFromUnmapped(record)}
                                disabled={creatingVendorSku === record.vendor_sku}
                              >
                                {creatingVendorSku === record.vendor_sku ? "Creating..." : "Create SKU"}
                              </Button>
                              {selectedSku ? (
                                <Button
                                  variant="neutral"
                                  onClick={() => handleMapUnmapped(record)}
                                  disabled={mappingVendorSku === record.vendor_sku}
                                >
                                  {mappingVendorSku === record.vendor_sku ? "Mapping..." : "Map to selected SKU"}
                                </Button>
                              ) : null}
                              <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap gap-2">
                                  <Input
                                    value={rowSkuQuery}
                                    onChange={(event) =>
                                      setRowSkuQueryByVendorSku((prev) => ({
                                        ...prev,
                                        [record.vendor_sku]: event.target.value,
                                      }))
                                    }
                                    placeholder="Search SKU"
                                    className="min-w-[160px]"
                                  />
                                  <Button
                                    variant="neutral"
                                    onClick={() => handleRowSkuSearch(record)}
                                    disabled={rowSkuSearching}
                                  >
                                    {rowSkuSearching ? "Searching..." : "Find"}
                                  </Button>
                                </div>
                                {rowSkuResults.length ? (
                                  <div className="rounded-lg border border-admin-border/60 bg-white">
                                    {rowSkuResults.map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex flex-wrap items-center justify-between gap-2 border-b border-admin-border/60 px-3 py-2 text-xs"
                                      >
                                        <div>
                                          <div className="font-semibold text-admin-text">{item.title}</div>
                                          <div className="text-[11px] text-admin-textSoft">{item.sku || item.slug}</div>
                                        </div>
                                        <Button
                                          variant="neutral"
                                          className="min-h-[26px] px-2 py-1 text-[11px]"
                                          onClick={() => handleMapToSku(record, item.id, item)}
                                          disabled={mappingVendorSku === record.vendor_sku}
                                        >
                                          Map
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSurface>

        ) : (
          <AdminSurface>
            <AdminSectionHeading
              title="SKU workbench"
              description="Pick a SKU, see readiness, add mappings, and open offers/inventory."
            />
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-admin-text">Find SKU</label>
                <div className="flex gap-2">
                  <Input
                    value={skuQuery}
                    onChange={(event) => setSkuQuery(event.target.value)}
                    placeholder="Search by SKU, slug, or title"
                  />
                  <Button variant="neutral" onClick={handleSearchSkus} disabled={skuSearching}>
                    {skuSearching ? "Searching..." : "Search"}
                  </Button>
                </div>
                {skuResults.length ? (
                  <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-admin-border bg-white">
                    {skuResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex w-full flex-col gap-1 border-b border-admin-border/60 px-4 py-3 text-left text-sm text-admin-text hover:bg-admin-surfaceMuted"
                        onClick={() => handleSelectSku(item)}
                      >
                        <span className="font-semibold">{item.title}</span>
                        <span className="text-xs text-admin-textSoft">{item.sku || item.slug}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {selectedSku ? (
              <div className="rounded-xl border border-admin-border bg-admin-surfaceMuted p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-admin-text">{selectedSku.title}</div>
                    <div className="text-xs text-admin-textSoft">
                      {selectedSku.sku || selectedSku.slug} - {selectedSku.id}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="neutral"
                      className="min-h-[36px] px-3 text-xs"
                      onClick={() => {
                        window.location.href = `/admin/shop/products/${selectedSku.id}`;
                      }}
                    >
                      Open SKU
                    </Button>
                    <Button
                      variant="neutral"
                      className="min-h-[36px] px-3 text-xs"
                      onClick={() => {
                        window.location.href = `/admin/supplier-offers?sku_id=${selectedSku.id}`;
                      }}
                    >
                      Open offers
                    </Button>
                    <Button
                      variant="neutral"
                      className="min-h-[36px] px-3 text-xs"
                      onClick={() => {
                        window.location.href = `/admin/supplier-inventory?sku_id=${selectedSku.id}`;
                      }}
                    >
                      Open inventory
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-admin-textSoft">Select a SKU to see readiness and mappings.</p>
            )}

            <div className="rounded-xl border border-admin-border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-admin-text">Canonical Catalog</div>
                  <div className="text-xs text-admin-textSoft">Link SKU to the product master model.</div>
                </div>
                <Button
                  variant="neutral"
                  onClick={() => loadCatalogInfo(selectedSku?.id)}
                  disabled={!selectedSku || catalogLoading}
                >
                  {catalogLoading ? "Loading..." : "Refresh"}
                </Button>
              </div>

              {!selectedSku ? (
                <p className="mt-3 text-sm text-admin-textSoft">Select a SKU to view catalog linkage.</p>
              ) : catalogError ? (
                <p className="mt-3 text-sm text-red-600">{catalogError}</p>
              ) : (
                <div className="mt-4 space-y-3 text-sm text-admin-text">
                  <div className="text-xs text-admin-textSoft">
                    GTIN: {catalogInfo?.identifiers?.gtin || "-"} / MPN: {catalogInfo?.identifiers?.mpn || "-"} / Brand:{" "}
                    {catalogInfo?.identifiers?.brand || "-"}
                  </div>

                  {catalogInfo?.catalog ? (
                    <div className="rounded-lg border border-admin-border/60 bg-admin-surfaceMuted p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-admin-text">{catalogInfo.catalog.title}</div>
                          <div className="text-xs text-admin-textSoft">
                            {catalogInfo.catalog.slug} - {catalogInfo.catalog.id}
                          </div>
                          <div className="text-xs text-admin-textSoft">
                            Brand: {catalogInfo.catalog.brand_name || catalogInfo.catalog.brand_id || "-"} / Status:{" "}
                            {catalogInfo.catalog.status || "-"}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="neutral"
                            className="min-h-[32px] px-3 py-1 text-xs"
                            onClick={() => {
                              window.location.href = "/admin/catalog/products";
                            }}
                          >
                            Open catalog
                          </Button>
                          <Button
                            variant="ghost"
                            className="min-h-[32px] px-3 py-1 text-xs"
                            onClick={() => setCatalogSearchOpen((prev) => !prev)}
                          >
                            Change link
                          </Button>
                          <Button
                            variant="ghost"
                            className="min-h-[32px] px-3 py-1 text-xs"
                            disabled={catalogAction === "unlink"}
                            onClick={handleUnlinkCatalog}
                          >
                            {catalogAction === "unlink" ? "Unlinking..." : "Unlink"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-admin-border/60 bg-admin-surfaceMuted p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-admin-text">No catalog model linked</div>
                          <div className="text-xs text-admin-textSoft">
                            Create a model from SKU or link an existing one.
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="soft"
                            className="min-h-[32px] px-3 py-1 text-xs"
                            disabled={catalogAction === "create"}
                            onClick={handleCreateCatalogFromSku}
                          >
                            {catalogAction === "create" ? "Creating..." : "Create from SKU"}
                          </Button>
                          <Button
                            variant="ghost"
                            className="min-h-[32px] px-3 py-1 text-xs"
                            onClick={() => setCatalogSearchOpen((prev) => !prev)}
                          >
                            Link existing
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {catalogInfo?.suggestions?.length ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-textSubtle">
                        Suggested matches
                      </div>
                      {catalogInfo.suggestions.map((suggestion) => (
                        <div key={suggestion.catalog_id} className="rounded-lg border border-admin-border/60 p-3">
                          <div className="text-sm font-semibold text-admin-text">{suggestion.title}</div>
                          <div className="text-xs text-admin-textSoft">
                            {suggestion.slug} / {suggestion.brand_name || suggestion.brand_id || "-"}
                          </div>
                          <div className="text-xs text-admin-textSoft">
                            Match: {suggestion.match_types.join(", ")}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              variant="neutral"
                              className="min-h-[28px] px-2 py-1 text-xs"
                              disabled={catalogAction === `link:${suggestion.catalog_id}`}
                              onClick={() => handleLinkCatalog(suggestion.catalog_id)}
                            >
                              {catalogAction === `link:${suggestion.catalog_id}` ? "Linking..." : "Confirm link"}
                            </Button>
                            <Button
                              variant="ghost"
                              className="min-h-[28px] px-2 py-1 text-xs"
                              onClick={() => {
                                window.location.href = "/admin/catalog/products";
                              }}
                            >
                              Open catalog
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {catalogSearchOpen ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-textSubtle">
                        Search catalog models
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          value={catalogSearchQuery}
                          onChange={(event) => setCatalogSearchQuery(event.target.value)}
                          placeholder="Search by title or slug"
                          className="min-w-[200px]"
                        />
                        <Button
                          variant="neutral"
                          onClick={handleCatalogSearch}
                          disabled={catalogSearching}
                        >
                          {catalogSearching ? "Searching..." : "Search"}
                        </Button>
                      </div>
                      {catalogSearchResults.length ? (
                        <div className="rounded-lg border border-admin-border/60 bg-white">
                          {catalogSearchResults.map((item) => (
                            <div
                              key={item.id}
                              className="flex flex-wrap items-center justify-between gap-2 border-b border-admin-border/60 px-3 py-2 text-sm"
                            >
                              <div>
                                <div className="font-semibold text-admin-text">{item.title}</div>
                                <div className="text-xs text-admin-textSoft">
                                  {item.slug} / {item.brand_name || item.brand_id || "-"}
                                </div>
                              </div>
                              <Button
                                variant="neutral"
                                className="min-h-[28px] px-2 py-1 text-xs"
                                disabled={catalogAction === `link:${item.id}`}
                                onClick={() => handleLinkCatalog(item.id)}
                              >
                                {catalogAction === `link:${item.id}` ? "Linking..." : "Link"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-admin-border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-admin-text">Dropship readiness</div>
                  <div className="text-xs text-admin-textSoft">Sellable status from offers and inventory.</div>
                </div>
                <Button
                  variant="neutral"
                  onClick={() => loadReadiness(selectedSku?.id)}
                  disabled={!selectedSku || loadingReadiness}
                >
                  {loadingReadiness ? "Loading..." : "Refresh"}
                </Button>
              </div>
              {selectedSku ? (
                readiness ? (
                  <div className="mt-4 space-y-3 text-sm text-admin-text">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={clsx(
                          "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
                          readiness.sellable
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700",
                        )}
                      >
                        {readiness.sellable ? "Sellable" : "Not sellable"}
                      </span>
                      <span className="text-xs text-admin-textSoft">
                        Reason: {readiness.reason ? REASON_LABELS[readiness.reason] || readiness.reason : "ok"}
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-admin-border bg-admin-surfaceMuted p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-textSubtle">
                          Best offer
                        </div>
                        {readiness.best_offer ? (
                          <div className="mt-2 space-y-1">
                            <div className="font-semibold">
                              {readiness.best_offer.supplier_name ||
                                readiness.best_offer.supplier_code ||
                                "Supplier"}
                            </div>
                            <div className="text-xs text-admin-textSoft">
                              {formatCurrency(readiness.best_offer.priceCents, readiness.best_offer.currency)} - Lead{" "}
                              {readiness.best_offer.leadTimeDays ?? "-"} days
                            </div>
                            <div className="text-xs text-admin-textSoft">
                              Stock: {readiness.best_offer.stockQuantity ?? "-"}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-admin-textSoft">No offer selected.</div>
                        )}
                      </div>
                      <div className="rounded-lg border border-admin-border bg-admin-surfaceMuted p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-textSubtle">
                          Inventory
                        </div>
                        {readiness.inventory ? (
                          <div className="mt-2 space-y-1 text-xs text-admin-textSoft">
                            <div>Status: {readiness.inventory.inventory_status || readiness.inventory.status}</div>
                            <div>Qty: {readiness.inventory.stock_quantity ?? "-"}</div>
                            <div>Available: {readiness.inventory.is_available ? "yes" : "no"}</div>
                            <div>Last synced: {formatDate(readiness.inventory.last_synced_at)}</div>
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-admin-textSoft">No inventory yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-admin-textSoft">No readiness data yet.</p>
                )
              ) : (
                <p className="mt-3 text-sm text-admin-textSoft">Select a SKU to load readiness.</p>
              )}
            </div>

            <div className="rounded-xl border border-admin-border bg-white p-4">
              <div className="text-sm font-semibold text-admin-text">Mappings for selected SKU</div>
              <p className="text-xs text-admin-textSoft">One SKU can map to multiple suppliers.</p>
              {readiness && readiness.mappings.length ? (
                <div className="mt-3 space-y-3">
                  {readiness.mappings.map((mapping) => (
                    <div key={mapping.id} className="rounded-lg border border-admin-border/60 bg-admin-surfaceMuted p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-admin-text">
                            {mapping.supplier_name || mapping.supplier_code || mapping.supplier_id}
                          </div>
                          <div className="text-xs text-admin-textSoft">
                            Vendor SKU: {mapping.supplier_sku || "-"}
                          </div>
                          <div className="text-xs text-admin-textSoft">
                            Cost: {formatCurrency(mapping.cost_cents, mapping.currency)} - Lead{" "}
                            {mapping.lead_time_days ?? "-"} days
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          className="min-h-[32px] px-3 py-1 text-xs"
                          disabled={unmappingId === mapping.id}
                          onClick={() => handleUnmap(mapping)}
                        >
                          {unmappingId === mapping.id ? "Unmapping..." : "Unmap"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-admin-textSoft">No mappings yet for this SKU.</p>
              )}
            </div>

            <div className="rounded-xl border border-admin-border bg-white p-4">
              <div className="text-sm font-semibold text-admin-text">Add or update mapping</div>
              <p className="text-xs text-admin-textSoft">Supplier: {selectedSupplier?.name || "select supplier"}</p>
              <form className="mt-3 space-y-3" onSubmit={handleSaveMapping}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-textSubtle">
                      Vendor SKU
                    </label>
                    <Input
                      value={mappingForm.vendorSku}
                      onChange={(event) =>
                        setMappingForm((prev) => ({ ...prev, vendorSku: event.target.value }))
                      }
                      placeholder="VENDOR-123"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-textSubtle">
                      Cost (cents)
                    </label>
                    <Input
                      type="number"
                      value={mappingForm.costCents}
                      onChange={(event) =>
                        setMappingForm((prev) => ({ ...prev, costCents: event.target.value }))
                      }
                      placeholder="12000"
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-textSubtle">
                      Currency
                    </label>
                    <Input
                      value={mappingForm.currency}
                      onChange={(event) =>
                        setMappingForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))
                      }
                      placeholder="USD"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-textSubtle">
                      Lead time (days)
                    </label>
                    <Input
                      type="number"
                      value={mappingForm.leadTimeDays}
                      onChange={(event) =>
                        setMappingForm((prev) => ({ ...prev, leadTimeDays: event.target.value }))
                      }
                      placeholder="3"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={savingMapping}>
                    {savingMapping ? "Saving..." : "Save mapping"}
                  </Button>
                  <Button
                    type="button"
                    variant="soft"
                    onClick={() => setMappingForm((prev) => ({ ...prev, vendorSku: "" }))}
                  >
                    Clear vendor SKU
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </AdminSurface>
        )}
      </div>
    </AdminStack>
  );
}
