
"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import Skeleton from "@ui/components/common/skeleton";
import { toast } from "@ui/components/common/toast";
import { getValidAccessToken } from "@shared/lib/auth";
import { adminFetch } from "@shared/lib/api";
import { normalizeSku, slugifyTitle } from "@shared/lib/normalize";
import {
  AdminContentWrapper,
  AdminInfoPanel,
  AdminPageLayout,
  AdminStack,
  AdminSurface,
} from "@/components/admin/layout";

import { ProductImagesField } from "./product-images-field";
import { ProductImageHistory } from "./product-image-history";
import type { CatalogBrandRecord, CatalogProductRecord } from "../../catalog/catalog-types";

interface Category {
  slug: string;
  name: string;
  title?: string;
  description?: string | null;
  parent_id?: string | null;
  sort_order?: number | null;
  is_active?: boolean;
}

type SupplierOption = { id: string; name: string; code: string };

type ReadinessReason =
  | "no_mapping"
  | "inventory_missing"
  | "inventory_stale"
  | "out_of_stock"
  | "offer_unavailable";

const READINESS_REASON_LABELS: Record<ReadinessReason, string> = {
  no_mapping: "No supplier mapping",
  inventory_missing: "Inventory missing",
  inventory_stale: "Inventory stale",
  out_of_stock: "Out of stock",
  offer_unavailable: "Offer unavailable",
};

type ReadinessMapping = {
  id: string;
  supplier_id: string;
  supplier_name: string | null;
  supplier_code: string | null;
  supplier_sku: string | null;
  cost_cents: number | null;
  currency: string | null;
  lead_time_days: number | null;
  last_synced_at: string | null;
  last_seen_at: string | null;
  miss_count: number | null;
  status: "mapped";
};

type ReadinessBestOffer = {
  supplierId: string;
  supplier_name: string | null;
  supplier_code: string | null;
  offerId: string;
  supplierSkuId: string | null;
  priceCents: number;
  currency: string;
  costCents: number | null;
  leadTimeDays: number | null;
  stockQuantity: number | null;
  isAvailable: boolean | null;
  inventoryStatus: string | null;
  lastSyncedAt: string | null;
};

type ReadinessInventory = {
  status: "in_stock" | "out_of_stock" | "unknown" | "stale" | "missing";
  stock_quantity: number | null;
  is_available: boolean | null;
  inventory_status: string | null;
  last_synced_at: string | null;
  stale: boolean;
};

type ReadinessSnapshot = {
  sku_id: string;
  sellable: boolean;
  reason: ReadinessReason | null;
  mappings: ReadinessMapping[];
  best_offer: ReadinessBestOffer | null;
  inventory: ReadinessInventory | null;
};

type UnmappedVendorSku = {
  id: string;
  supplier_id?: string | null;
  vendor_sku: string;
  last_seen_at?: string | null;
  created_at?: string | null;
};

interface EditorProps {
  productId?: string | null;
}

async function authorizedFetch(input: string, init?: RequestInit) {
  const accessToken = await getValidAccessToken().catch(() => null);
  const headers = new Headers(init?.headers);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return adminFetch(input, { ...init, headers, credentials: init?.credentials ?? "include" });
}

function generateSku() {
  const base = "SKU";
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase();
  return `${base}-${stamp}-${random}`;
}

function normalizePriceInput(raw: string): string {
  if (!raw) return "";
  const filtered = raw.replace(/[^0-9.,]/g, "");
  const firstSeparator = filtered.search(/[.,]/);
  if (firstSeparator === -1) {
    return filtered;
  }
  const separator = filtered[firstSeparator];
  const integerPart = filtered.slice(0, firstSeparator);
  const decimals = filtered.slice(firstSeparator + 1).replace(/[.,]/g, "");
  return `${integerPart}${separator}${decimals}`;
}

async function findExistingProductId(query: string): Promise<string | null> {
  const q = query.trim();
  if (!q || typeof window === "undefined") return null;
  try {
    const url = new URL("/api/admin/shop/products", window.location.origin);
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "1");
    const res = await authorizedFetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => ({}))) as { items?: Array<{ id?: string }> };
    const item = Array.isArray(json.items) ? json.items[0] : null;
    return item?.id ? String(item.id) : null;
  } catch {
    return null;
  }
}

function formatMoney(value: number | null | undefined, currencyCode: string | null | undefined) {
  if (value == null) return "-";
  const currency = currencyCode || "USD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value / 100);
  } catch {
    return `${value / 100} ${currency}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function resolveLoadedTitle(record: Record<string, unknown> | null): string {
  if (!record) return "";
  const titleValue = typeof record.title === "string" ? record.title.trim() : "";
  if (titleValue) return titleValue;
  return typeof record.name === "string" ? record.name.trim() : "";
}

function snapshotState(state: {
  title: string;
  slug: string;
  sku: string;
  price: string;
  currency: string;
  category: string | null;
  status: string;
  rating: string;
  shortDesc: string;
  tags: string;
  images: string[];
  specs: Record<string, unknown>;
  catalogBrandId: string;
  catalogProductId: string;
}) {
  return JSON.stringify({
    ...state,
    images: [...state.images],
  });
}

type CatalogApiListResponse<T> = {
  ok?: boolean;
  items?: T[];
  error?: string;
  message?: string;
};

function constraintHint(message: string): string | null {
  const normalized = (message || "").toLowerCase();
  if (normalized.includes("ecom_products_slug_key")) {
    return "Slug already exists. Open the existing SKU and add supplier mappings instead of creating a duplicate.";
  }
  if (normalized.includes("uq_ecom_products_sku")) {
    return "SKU code already exists. Open the existing SKU and add supplier mappings instead of creating a duplicate.";
  }
  if (normalized.includes("ecom_products_catalog_product_fk") || normalized.includes("catalog_product_id")) {
    return "Выбранная модель каталога не найдена или удалена. Обновите выбор модели и попробуйте снова.";
  }
  if (normalized.includes("ecom_products_category_slug_fk") || normalized.includes("category_slug")) {
    return "Категория больше не существует. Выберите актуальную категорию и повторите сохранение.";
  }
  return null;
}

export function ProductEditorClient({ productId }: EditorProps) {
  const router = useRouter();
  const [currentId, setCurrentId] = useState<string | null>(productId ?? null);

  const isNew = !currentId;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("0");
  const [currency, setCurrency] = useState("EUR");
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState("draft");
  const [rating, setRating] = useState("0");
  const [shortDesc, setShortDesc] = useState("");
  const [sku, setSku] = useState("");
  const [tags, setTags] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [specsJson, setSpecsJson] = useState("{}");
  const [specsError, setSpecsError] = useState<string | null>(null);

  const [catalogBrands, setCatalogBrands] = useState<CatalogBrandRecord[]>([]);
  const [catalogModels, setCatalogModels] = useState<CatalogProductRecord[]>([]);
  const [catalogBrandId, setCatalogBrandId] = useState("");
  const [catalogProductId, setCatalogProductId] = useState("");
  const [catalogBrandsLoading, setCatalogBrandsLoading] = useState(false);
  const [catalogModelsLoading, setCatalogModelsLoading] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [originalSnapshot, setOriginalSnapshot] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [readiness, setReadiness] = useState<ReadinessSnapshot | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [mappingSupplierId, setMappingSupplierId] = useState("");
  const [mappingVendorSku, setMappingVendorSku] = useState("");
  const [mappingCostCents, setMappingCostCents] = useState("");
  const [mappingCurrency, setMappingCurrency] = useState("");
  const [mappingLeadTimeDays, setMappingLeadTimeDays] = useState("");
  const [mappingSaving, setMappingSaving] = useState(false);

  const [showUnmapped, setShowUnmapped] = useState(false);
  const [unmappedSupplierId, setUnmappedSupplierId] = useState("");
  const [unmappedItems, setUnmappedItems] = useState<UnmappedVendorSku[]>([]);
  const [unmappedLoading, setUnmappedLoading] = useState(false);
  const [feedRunning, setFeedRunning] = useState(false);

  const selectedBrand = useMemo(
    () => catalogBrands.find((brand) => brand.id === catalogBrandId) ?? null,
    [catalogBrands, catalogBrandId],
  );
  const selectedModel = useMemo(
    () => catalogModels.find((model) => model.id === catalogProductId) ?? null,
    [catalogModels, catalogProductId],
  );
  const catalogPublishBlockedReason = useMemo(() => {
    const brandStatus = selectedBrand?.status?.toLowerCase();
    const modelStatus = selectedModel?.status?.toLowerCase();
    const brandInactive =
      brandStatus === "archived" ||
      brandStatus === "inactive" ||
      brandStatus === "disabled" ||
      selectedBrand?.is_active === false;
    const modelInactive = modelStatus === "archived";
    if (modelInactive) return "Модель в архиве: публикация SKU недоступна.";
    if (brandInactive) return "Бренд неактивен: публикация SKU недоступна.";
    return null;
  }, [selectedBrand, selectedModel]);

  useEffect(() => {
    setCurrentId(productId ?? null);
  }, [productId]);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await authorizedFetch("/api/admin/suppliers", { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; items?: SupplierOption[]; error?: string; message?: string };
      if (!res.ok || payload.ok === false) {
        throw new Error(payload.message || payload.error || "Failed to load suppliers");
      }
      setSuppliers(Array.isArray(payload.items) ? payload.items : []);
    } catch (err: any) {
      toast(err?.message || "Failed to load suppliers", { variant: "error" });
    }
  }, []);

  const loadReadiness = useCallback(
    async (skuId: string) => {
      if (!skuId) return;
      setReadinessLoading(true);
      setReadinessError(null);
      try {
        const url = new URL("/api/admin/shop/products/readiness", window.location.origin);
        url.searchParams.set("sku_id", skuId);
        const res = await authorizedFetch(url.toString(), { cache: "no-store" });
        const payload = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          items?: ReadinessSnapshot[];
          error?: string;
          message?: string;
        };
        if (!res.ok || payload.ok === false) {
          throw new Error(payload.message || payload.error || "Failed to load readiness");
        }
        const item = Array.isArray(payload.items) ? payload.items[0] : null;
        setReadiness(item ?? null);
      } catch (err: any) {
        setReadinessError(err?.message || "Failed to load readiness");
        setReadiness(null);
      } finally {
        setReadinessLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadSuppliers().catch(() => undefined);
  }, [loadSuppliers]);

  useEffect(() => {
    if (currentId) {
      loadReadiness(currentId).catch(() => undefined);
    } else {
      setReadiness(null);
    }
  }, [currentId, loadReadiness]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const categoriesUrl = origin
          ? new URL("/api/ecom-categories", origin).toString()
          : "/api/ecom-categories";
        try {
          const categoriesResponse = await authorizedFetch(categoriesUrl, { cache: "no-store" });
          if (categoriesResponse.ok) {
            const categoriesJson = await categoriesResponse.json();
            if (!cancelled && Array.isArray(categoriesJson?.items)) {
              setCategories(categoriesJson.items as Category[]);
            }
          }
        } catch (categoryError) {
          console.warn("Failed to load categories", categoryError);
        }

        // preload brands
        const brandsUrl =
          origin && typeof window !== "undefined"
            ? new URL("/api/admin/catalog/brands", origin).toString()
            : "/api/admin/catalog/brands";
        try {
          setCatalogBrandsLoading(true);
          const brandRes = await authorizedFetch(brandsUrl, { cache: "no-store" });
          const brandPayload = (await brandRes.json().catch(() => ({}))) as CatalogApiListResponse<CatalogBrandRecord>;
          if (brandRes.ok && brandPayload?.ok && Array.isArray(brandPayload.items)) {
            setCatalogBrands(brandPayload.items);
          }
        } finally {
          setCatalogBrandsLoading(false);
        }

        if (!currentId) {
          setCatalogBrandId("");
          setCatalogProductId("");
          setCatalogModels([]);
          setCurrency("EUR");
          setOriginalSnapshot(null);
          setIsDirty(false);
          setLoading(false);
          return;
        }

        const productsUrl = origin
          ? new URL("/api/admin/shop/products", origin)
          : new URL("/api/admin/shop/products", "http://localhost");
        productsUrl.searchParams.set("id", currentId);

        const productResponse = await authorizedFetch(productsUrl.toString(), { cache: "no-store" });
        if (!productResponse.ok) {
          throw new Error(await productResponse.text());
        }
        const productJson = await productResponse.json();
        let product =
          Array.isArray(productJson?.items) && productJson.items.length
            ? (productJson.items[0] as Record<string, any>)
            : null;

        let resolvedFromCatalog = false;
        if (!product && currentId) {
          try {
            const fallbackUrl = origin
              ? new URL("/api/admin/shop/products", origin)
              : new URL("/api/admin/shop/products", "http://localhost");
            fallbackUrl.searchParams.set("catalog_product_id", currentId);
            fallbackUrl.searchParams.set("limit", "1");
            const fallbackRes = await authorizedFetch(fallbackUrl.toString(), { cache: "no-store" });
            if (fallbackRes.ok) {
              const fallbackJson = await fallbackRes.json();
              if (Array.isArray(fallbackJson?.items) && fallbackJson.items.length) {
                product = fallbackJson.items[0] as Record<string, any>;
                resolvedFromCatalog = true;
              }
            }
          } catch {
            // ignore fallback failures; will show not found below
          }
        }

        if (product && !cancelled) {
          if (resolvedFromCatalog) {
            const resolvedId = String(product.id ?? "").trim();
            if (resolvedId && resolvedId !== currentId) {
              setCurrentId(resolvedId);
              router.replace(`/admin/shop/products/${resolvedId}`);
            }
          }
          const nextTitle = resolveLoadedTitle(product);
          const nextSlug = String(product.slug ?? "");
          const nextSku = product.sku != null ? String(product.sku) : "";
          const nextPrice = product.price != null ? String(product.price) : "0";
          const nextCurrency =
            typeof product.currency === "string" && product.currency.trim()
              ? product.currency.trim().toUpperCase()
              : "EUR";
          const nextCategory = product.category_slug != null ? String(product.category_slug) : null;
          const rawStatus = typeof product.status === "string" ? product.status : "draft";
          const normalizedStatus = rawStatus.toLowerCase();
          const nextStatus =
            normalizedStatus === "archived"
              ? "archived"
              : normalizedStatus === "draft"
                ? "draft"
                : "published";
          const nextRating = product.rating != null ? String(product.rating) : "0";
          const nextShortDesc = product.short_desc != null ? String(product.short_desc) : "";
          const nextTags = Array.isArray(product.tags)
            ? (product.tags as (string | null | undefined)[])
                .map((value) => (value ? String(value) : ""))
                .filter(Boolean)
                .join(", ")
            : "";
          const nextImages = Array.isArray(product.images)
            ? (product.images as (string | null | undefined)[])
                .map((value) => (value ? String(value) : ""))
                .filter(Boolean)
            : [];
          const nextSpecsObject =
            product.specs && typeof product.specs === "object"
              ? (product.specs as Record<string, unknown>)
              : {};

          let specsJsonString = "{}";
          try {
            specsJsonString = JSON.stringify(nextSpecsObject, null, 2);
            setSpecsError(null);
          } catch (err) {
            console.warn("Failed to stringify specs", err);
          }

          setTitle(nextTitle);
          setSlug(nextSlug);
          setSku(nextSku);
          setPrice(normalizePriceInput(nextPrice));
          setCurrency(nextCurrency);
          setCategory(nextCategory);
          setStatus(nextStatus);
          setRating(nextRating);
          setShortDesc(nextShortDesc);
          setTags(nextTags);
          setImages(nextImages);
          setSpecsJson(specsJsonString);

          // resolve catalog product / brand
          let resolvedBrandId = "";
          let resolvedCatalogId = "";
          const catalogId =
            product.catalog_product_id != null && String(product.catalog_product_id).trim()
              ? String(product.catalog_product_id).trim()
              : "";
          setCatalogProductId(catalogId);
          if (catalogId) {
            try {
              const catalogUrl =
                origin && typeof window !== "undefined"
                  ? new URL("/api/admin/catalog/products", origin).toString()
                  : "/api/admin/catalog/products";
              const catalogRes = await authorizedFetch(`${catalogUrl}?id=${catalogId}&status=all`, { cache: "no-store" });
              const catalogPayload = (await catalogRes.json().catch(() => ({}))) as CatalogApiListResponse<CatalogProductRecord>;
              const record = Array.isArray(catalogPayload?.items) ? catalogPayload.items[0] : null;
              if (record?.brand_id) {
                resolvedBrandId = String(record.brand_id);
                resolvedCatalogId = String(record.id);
                setCatalogBrandId(resolvedBrandId);
                setCatalogProductId(resolvedCatalogId || catalogId);
              }
            } catch {
              // ignore, we still allow manual re-selection
            }
          }

          const snapshot = snapshotState({
            title: nextTitle,
            slug: nextSlug,
            sku: nextSku,
            price: nextPrice,
            currency: nextCurrency,
            category: nextCategory,
            status: nextStatus,
            rating: nextRating,
            shortDesc: nextShortDesc,
            tags: nextTags,
            images: nextImages,
            specs: nextSpecsObject,
            catalogBrandId: resolvedBrandId,
            catalogProductId: resolvedCatalogId,
          });
          setOriginalSnapshot(snapshot);
          setIsDirty(false);
        } else if (!cancelled) {
          setError("Product not found");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentId]);

  useEffect(() => {
    if (!isNew) return;
    if (!title) return;
    setSlug((prev) => (prev ? prev : slugifyTitle(title, sku)));
    setSku((prev) => (prev ? prev : normalizeSku(undefined, title)));
  }, [title, sku, isNew]);

  useEffect(() => {
    let specsObject: Record<string, unknown> = {};
    try {
      specsObject = JSON.parse(specsJson || "{}");
      setSpecsError(null);
    } catch {
      specsObject = {};
    }

    const snapshot = snapshotState({
      title,
      slug,
      sku,
      price,
      currency,
      category,
      status,
      rating,
      shortDesc,
      tags,
      images,
      specs: specsObject,
      catalogBrandId,
      catalogProductId,
    });
    setIsDirty(originalSnapshot !== null && snapshot !== originalSnapshot);
  }, [
    title,
    slug,
    sku,
    price,
    currency,
    category,
    status,
    rating,
    shortDesc,
    tags,
    images,
    specsJson,
    catalogBrandId,
    catalogProductId,
    originalSnapshot,
  ]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);


  const refreshReadiness = useCallback(() => {
    if (currentId) {
      loadReadiness(currentId).catch(() => undefined);
    }
  }, [currentId, loadReadiness]);

  const handleAddMapping = useCallback(async () => {
    if (!currentId) {
      toast("Save the SKU first to add supplier mappings.", { variant: "error" });
      return;
    }
    if (!mappingSupplierId || !mappingVendorSku.trim()) {
      toast("Supplier and vendor SKU are required.", { variant: "error" });
      return;
    }
    setMappingSaving(true);
    try {
      const payload: Record<string, unknown> = {
        supplier_id: mappingSupplierId,
        sku_id: currentId,
        supplier_sku: mappingVendorSku.trim(),
      };
      if (mappingCostCents.trim()) {
        const parsed = Number(mappingCostCents);
        if (!Number.isFinite(parsed)) throw new Error("Cost cents must be a number.");
        payload.cost_cents = Math.round(parsed);
      }
      if (mappingCurrency.trim()) payload.currency = mappingCurrency.trim().toUpperCase();
      if (mappingLeadTimeDays.trim()) {
        const parsed = Number(mappingLeadTimeDays);
        if (!Number.isFinite(parsed)) throw new Error("Lead time must be a number.");
        payload.lead_time_days = Math.round(parsed);
      }

      const headers = new Headers({ "content-type": "application/json" });
      const accessToken = await getValidAccessToken().catch(() => null);
      if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
      const res = await adminFetch("/api/admin/supplier-skus", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || json.ok === false) {
        const isDuplicate = res.status === 409 || json.error === "duplicate";
        throw new Error(isDuplicate ? "Vendor SKU already mapped for this supplier." : json.message || json.error || "Failed to save mapping.");
      }
      toast("Mapping saved.", { variant: "success" });
      setMappingVendorSku("");
      setMappingCostCents("");
      setMappingLeadTimeDays("");
      refreshReadiness();
    } catch (err: any) {
      toast(err?.message || "Failed to save mapping.", { variant: "error" });
    } finally {
      setMappingSaving(false);
    }
  }, [
    currentId,
    mappingSupplierId,
    mappingVendorSku,
    mappingCostCents,
    mappingCurrency,
    mappingLeadTimeDays,
    refreshReadiness,
  ]);

  const handleLoadUnmapped = useCallback(async () => {
    if (!unmappedSupplierId) {
      toast("Select a supplier first.", { variant: "error" });
      return;
    }
    setUnmappedLoading(true);
    try {
      const url = new URL("/api/admin/supplier-feed/unmapped", window.location.origin);
      url.searchParams.set("supplier_id", unmappedSupplierId);
      const res = await authorizedFetch(url.toString(), { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; items?: UnmappedVendorSku[]; error?: string; message?: string };
      if (!res.ok || json.ok === false) {
        throw new Error(json.message || json.error || "Failed to load unmapped vendor SKUs.");
      }
      setUnmappedItems(Array.isArray(json.items) ? json.items : []);
    } catch (err: any) {
      toast(err?.message || "Failed to load unmapped vendor SKUs.", { variant: "error" });
    } finally {
      setUnmappedLoading(false);
    }
  }, [unmappedSupplierId]);

  const handleMapUnmapped = useCallback(
    async (vendorSku: string, supplierId?: string | null) => {
      const supplierIdValue = supplierId || unmappedSupplierId;
      if (!currentId) {
        toast("Save the SKU first to add supplier mappings.", { variant: "error" });
        return;
      }
      if (!supplierIdValue || !vendorSku) {
        toast("Supplier and vendor SKU are required.", { variant: "error" });
        return;
      }
      try {
        const headers = new Headers({ "content-type": "application/json" });
        const accessToken = await getValidAccessToken().catch(() => null);
        if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
        const res = await adminFetch("/api/admin/supplier-feed/unmapped", {
          method: "POST",
          headers,
          body: JSON.stringify({
            supplier_id: supplierIdValue,
            vendor_sku: vendorSku,
            sku_id: currentId,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
        if (!res.ok || json.ok === false) {
          const isDuplicate = res.status === 409 || json.error === "duplicate";
          throw new Error(isDuplicate ? "Vendor SKU already mapped for this supplier." : json.message || json.error || "Failed to map vendor SKU.");
        }
        toast("Vendor SKU mapped.", { variant: "success" });
        setUnmappedItems((prev) => prev.filter((item) => item.vendor_sku !== vendorSku));
        refreshReadiness();
      } catch (err: any) {
        toast(err?.message || "Failed to map vendor SKU.", { variant: "error" });
      }
    },
    [currentId, unmappedSupplierId, refreshReadiness],
  );

  const runFeedForSupplier = useCallback(async (supplierId: string) => {
    const headers = new Headers({ "content-type": "application/json" });
    const accessToken = await getValidAccessToken().catch(() => null);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    const res = await adminFetch("/api/admin/supplier-feed/run", {
      method: "POST",
      headers,
      body: JSON.stringify({ supplier_id: supplierId, mode: "remote" }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
    if (!res.ok || json.ok === false) {
      const isRunning = res.status === 409 && json.error === "already_running";
      throw new Error(isRunning ? "Feed already running for this supplier." : json.message || json.error || "Failed to run feed.");
    }
  }, []);

  const handleRunFeedForMapped = useCallback(async () => {
    const supplierIds = Array.from(new Set((readiness?.mappings ?? []).map((row) => row.supplier_id)));
    if (!supplierIds.length) {
      toast("No supplier mappings found for this SKU.", { variant: "error" });
      return;
    }
    setFeedRunning(true);
    try {
      for (const supplierId of supplierIds) {
        await runFeedForSupplier(supplierId);
      }
      toast("Feed started for mapped suppliers.", { variant: "success" });
      refreshReadiness();
    } catch (err: any) {
      toast(err?.message || "Failed to run feed.", { variant: "error" });
    } finally {
      setFeedRunning(false);
    }
  }, [readiness, refreshReadiness, runFeedForSupplier]);

  const handleRunFeedForSupplier = useCallback(
    async (supplierId: string) => {
      setFeedRunning(true);
      try {
        await runFeedForSupplier(supplierId);
        toast("Feed started.", { variant: "success" });
        refreshReadiness();
      } catch (err: any) {
        toast(err?.message || "Failed to run feed.", { variant: "error" });
      } finally {
        setFeedRunning(false);
      }
    },
    [refreshReadiness, runFeedForSupplier],
  );

  const handleOpenOffers = useCallback(() => {
    const query = sku || slug;
    router.push(query ? `/admin/supplier-offers?q=${encodeURIComponent(query)}` : "/admin/supplier-offers");
  }, [router, sku, slug]);

  const handleOpenInventory = useCallback(() => {
    const query = sku || slug;
    router.push(query ? `/admin/supplier-inventory?q=${encodeURIComponent(query)}` : "/admin/supplier-inventory");
  }, [router, sku, slug]);

  const categoryOptions = useMemo(() => {
    return [{ slug: "", name: "Не выбрана" }, ...categories];
  }, [categories]);

  const handleUseImage = useCallback((url: string) => {
    setImages((prev) => [url, ...prev.filter((item) => item !== url)]);
  }, []);

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value || null;
    setCategory(value);
    setCatalogBrandId("");
    setCatalogProductId("");
    setCatalogModels([]);
  };

  const handleCatalogBrandChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value;
    setCatalogBrandId(value);
    setCatalogProductId("");
  };

  const handleCatalogProductChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCatalogProductId(event.currentTarget.value);
  };

  const fetchCatalogModelsByBrand = useCallback(
    async (brandId: string): Promise<CatalogProductRecord[]> => {
      if (!brandId) return [];
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = origin ? new URL("/api/admin/catalog/products", origin) : new URL("/api/admin/catalog/products", "http://localhost");
      url.searchParams.set("brand_id", brandId);
      url.searchParams.set("status", "all");
      const res = await authorizedFetch(url.toString(), { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as CatalogApiListResponse<CatalogProductRecord>;
      if (!res.ok || !payload?.ok) {
        const message = payload?.message || payload?.error || "Не удалось загрузить модели";
        throw new Error(message);
      }
      return Array.isArray(payload.items) ? payload.items : [];
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    if (!catalogBrandId) {
      setCatalogModels([]);
      setCatalogProductId("");
      return;
    }
    setCatalogModelsLoading(true);
    fetchCatalogModelsByBrand(catalogBrandId)
      .then((items) => {
        if (cancelled) return;
        setCatalogModels(items);
        if (items.every((m) => m.id !== catalogProductId)) {
          setCatalogProductId("");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        toast(err instanceof Error ? err.message : "Не удалось загрузить модели", { variant: "error" });
        setCatalogModels([]);
        setCatalogProductId("");
      })
      .finally(() => {
        if (!cancelled) setCatalogModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogBrandId, catalogProductId, fetchCatalogModelsByBrand]);

  const handlePriceChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
  setPrice(normalizePriceInput(event.currentTarget.value));
}, []);

const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSpecsError(null);

      const normalizedSku = normalizeSku(sku, title);
      const normalizedSlug = slugifyTitle(slug || title, normalizedSku);
      const priceValue = parseFloat(price.replace(",", "."));
      if (!Number.isFinite(priceValue)) {
        throw new Error("Цена должна быть числом");
      }
      const normalizedCurrency = currency.trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
        throw new Error("??????? ?????? (???: USD ??? EUR)");
      }
      const ratingValue = parseFloat(rating.replace(",", "."));

      let specsData: Record<string, unknown> = {};
      try {
        specsData = specsJson.trim() ? (JSON.parse(specsJson) as Record<string, unknown>) : {};
      } catch (specError) {
        setSpecsError("Поле должно содержать корректный JSON");
        throw specError;
      }

      const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (!category) {
        throw new Error("Выберите категорию каталога");
      }
      if (!catalogBrandId) {
        throw new Error("Выберите бренд каталога");
      }
      if (!catalogProductId) {
        throw new Error("Выберите модель каталога");
      }
      const modelRecord = catalogModels.find((model) => model.id === catalogProductId);
      if (modelRecord?.brand_id && String(modelRecord.brand_id) !== String(catalogBrandId)) {
        throw new Error("Выбранная модель принадлежит другому бренду. Проверьте связку.");
      }
      if (status === "published" && catalogPublishBlockedReason) {
        throw new Error(catalogPublishBlockedReason);
      }

      const payload: Record<string, unknown> = {
        id: currentId ?? undefined,
        title: title.trim(),
        slug: normalizedSlug,
        sku: normalizedSku,
        price: priceValue,
        currency: normalizedCurrency,
        rating: Number.isFinite(ratingValue) ? ratingValue : null,
        category_slug: category || null,
        status,
        short_desc: shortDesc.trim(),
        tags: tagsArray,
        images,
        specs: specsData,
        catalog_product_id: catalogProductId,
      };

      const accessToken = await getValidAccessToken().catch(() => null);

      const headers = new Headers({
        "content-type": "application/json",
      });
      if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

      const response = await adminFetch("/api/admin/shop/products", {
        method: "POST",
        headers,
        body: JSON.stringify({ op: "upsert", product: payload }),
      });

      if (!response.ok) {
        const rawText = await response.text();
        const friendly = constraintHint(rawText);
        if (response.status === 409 && isNew) {
          const existingId =
            (await findExistingProductId(normalizedSku)) ??
            (await findExistingProductId(normalizedSlug));
          if (existingId) {
            const confirmed = window.confirm(
              "SKU already exists. Open the existing SKU and add supplier mappings there?",
            );
            if (confirmed) {
              router.push(`/admin/shop/products/${existingId}`);
            }
          }
        }
        const fallback =
          response.status === 409
            ? "SKU or slug already exists. Open the existing SKU and add supplier mappings instead of creating a duplicate."
            : "Не удалось сохранить товар";
        throw new Error(friendly ?? rawText ?? fallback);
      }

      const json = await response.json();
      if (json?.ok === false) {
        throw new Error(String(json?.message || json?.error || "Не удалось сохранить товар"));
      }

      const nextId = (json?.id as string | undefined) ?? currentId;
      toast("Сохранено", { variant: "success" });

      const snapshot = snapshotState({
        title: payload.title as string,
        slug: normalizedSlug,
        sku: normalizedSku,
        price: String(priceValue),
        currency: normalizedCurrency,
        category: category || null,
        status,
        rating: Number.isFinite(ratingValue) ? String(ratingValue) : "0",
        shortDesc: payload.short_desc as string,
        tags: tagsArray.join(", "),
        images,
        specs: specsData,
        catalogBrandId,
        catalogProductId,
      });
      setOriginalSnapshot(snapshot);
      setIsDirty(false);

      if (!currentId && nextId) {
        setCurrentId(nextId);
        setHistoryRefresh((value) => value + 1);
        loadReadiness(nextId).catch(() => undefined);
        router.replace(`/admin/shop/products/${nextId}`);
      } else if (currentId) {
        setHistoryRefresh((value) => value + 1);
        refreshReadiness();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const formId = "admin-product-editor-form";
  const pageTitle = isNew ? "Новый товар" : "Редактирование товара";
  const pageDescription = isNew
    ? "Заполните карточку и опубликуйте товар в каталоге."
    : "Обновите контент, цены и статус публикации.";
  const statusMessage = loading
    ? "Загрузка данных..."
    : saving
      ? "Сохраняем изменения..."
      : isDirty
        ? "Есть несохранённые изменения"
        : "Все изменения сохранены";
  const breadcrumbs = useMemo(
    () => [
      { label: "Админка", href: "/admin" },
      { label: "Товары", href: "/admin/shop/products" },
      { label: isNew ? "Новый товар" : title || "Редактирование" },
    ],
    [isNew, title],
  );

  return (
    <AdminContentWrapper>
      <AdminPageLayout
        title={pageTitle}
        description={pageDescription}
        breadcrumbs={breadcrumbs}
        primaryActions={
          <Button type="submit" form={formId} disabled={saving || loading}>
            {saving ? "Сохраняем..." : "Сохранить"}
          </Button>
        }
        secondaryActions={
          <Button
            type="button"
            variant="soft"
            disabled={saving}
            onClick={() => router.push("/admin/shop/products")}
          >
            К списку товаров
          </Button>
        }
        sidebar={
          <AdminStack gap="lg">
            <AdminInfoPanel title="Статус карточки">
              <div className="space-y-2">
                <p>{statusMessage}</p>
                <p className="text-xs text-admin-textSubtle">
                  {currentId
                    ? `ID: ${currentId}`
                    : "Карточка появится после первого сохранения."}
                </p>
              </div>
            </AdminInfoPanel>
            <AdminInfoPanel title="Подсказка">
              <div className="space-y-2 text-sm">
                <p>Заполните обязательные поля. После сохранения станет доступна история изображений.</p>
                <p>Статус «Опубликован» сделает товар видимым в каталоге.</p>
              </div>
            </AdminInfoPanel>
          </AdminStack>
        }
      >
        <AdminSurface padded="lg">
          {loading ? (
            <AdminStack gap="lg">
              <div className="space-y-3">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-[320px] w-full" />
              </div>
            </AdminStack>
          ) : (
            <form id={formId} className="space-y-6" onSubmit={handleSave}>
              <AdminStack gap="lg">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Новые бренды и модели добавляются в разделе <strong>Catalog → Brands / Products</strong>. Здесь вы только привязываете SKU к готовым моделям.
                </div>

                <div className="rounded-xl border border-admin-border bg-admin-surface px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-admin-text">Dropship readiness</p>
                      <p className="text-xs text-admin-textSoft">One SKU can map to multiple suppliers. Add mappings here instead of creating duplicates.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="soft" onClick={refreshReadiness} disabled={!currentId || readinessLoading}>
                        Refresh
                      </Button>
                      <Button type="button" variant="neutral" onClick={handleOpenOffers}>
                        Open offers
                      </Button>
                      <Button type="button" variant="neutral" onClick={handleOpenInventory}>
                        Open inventory
                      </Button>
                    </div>
                  </div>

                  {!currentId ? (
                    <p className="mt-3 text-sm text-admin-textSoft">Save the SKU to see readiness.</p>
                  ) : readinessLoading ? (
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : readinessError ? (
                    <p className="mt-3 text-sm text-rose-700">{readinessError}</p>
                  ) : readiness ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            readiness.sellable ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {readiness.sellable ? "Sellable" : "Not sellable"}
                        </span>
                        <span className="text-xs text-admin-textSoft">
                          {readiness.sellable
                            ? "Ready for sale."
                            : `Reason: ${READINESS_REASON_LABELS[readiness.reason ?? "no_mapping"]}`}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-admin-border bg-admin-surfaceSubtle p-3">
                          <p className="text-xs font-semibold text-admin-text">Best offer</p>
                          <p className="mt-1 text-sm text-admin-text">
                            {readiness.best_offer
                              ? `${readiness.best_offer.supplier_name ?? readiness.best_offer.supplierId}`
                              : "No active offer"}
                          </p>
                          {readiness.best_offer && (
                            <div className="mt-2 space-y-1 text-xs text-admin-textSoft">
                              <p>Price: {formatMoney(readiness.best_offer.priceCents, readiness.best_offer.currency)}</p>
                              <p>Cost: {formatMoney(readiness.best_offer.costCents ?? null, readiness.best_offer.currency)}</p>
                              <p>Lead time: {readiness.best_offer.leadTimeDays ?? "-"} days</p>
                            </div>
                          )}
                        </div>
                        <div className="rounded-lg border border-admin-border bg-admin-surfaceSubtle p-3">
                          <p className="text-xs font-semibold text-admin-text">Inventory</p>
                          <p className="mt-1 text-sm text-admin-text">
                            {readiness.inventory ? readiness.inventory.status.replace(/_/g, " ") : "No inventory"}
                          </p>
                          {readiness.inventory && (
                            <div className="mt-2 space-y-1 text-xs text-admin-textSoft">
                              <p>Qty: {readiness.inventory.stock_quantity ?? "-"}</p>
                              <p>Available: {readiness.inventory.is_available === null ? "-" : readiness.inventory.is_available ? "yes" : "no"}</p>
                              <p>Last synced: {formatDate(readiness.inventory.last_synced_at)}</p>
                            </div>
                          )}
                        </div>
                        <div className="rounded-lg border border-admin-border bg-admin-surfaceSubtle p-3">
                          <p className="text-xs font-semibold text-admin-text">Mappings</p>
                          {readiness.mappings.length ? (
                            <ul className="mt-2 space-y-1 text-xs text-admin-textSoft">
                              {readiness.mappings.map((row) => (
                                <li key={row.id}>
                                  {row.supplier_name ?? row.supplier_id} · {row.supplier_sku ?? "-"}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-xs text-admin-textSoft">No supplier mappings yet.</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="soft" onClick={() => setShowAddMapping((value) => !value)}>
                          {showAddMapping ? "Hide mapping form" : "Add mapping"}
                        </Button>
                        <Button type="button" variant="soft" onClick={() => setShowUnmapped((value) => !value)}>
                          {showUnmapped ? "Hide unmapped" : "Map unmapped vendor SKUs"}
                        </Button>
                        <Button
                          type="button"
                          variant="soft"
                          onClick={handleRunFeedForMapped}
                          disabled={feedRunning || !readiness.mappings.length}
                        >
                          {feedRunning ? "Running..." : "Run feed now"}
                        </Button>
                      </div>

                      {showAddMapping && (
                        <div className="mt-3 grid gap-3 md:grid-cols-6">
                          <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-admin-text">Supplier</label>
                            <select
                              className="mt-1 h-10 w-full rounded-md border border-admin-border bg-white px-3 text-sm"
                              value={mappingSupplierId}
                              onChange={(event) => setMappingSupplierId(event.currentTarget.value)}
                            >
                              <option value="">Select supplier</option>
                              {suppliers.map((supplier) => (
                                <option key={supplier.id} value={supplier.id}>
                                  {supplier.name} {supplier.code ? `(${supplier.code})` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-admin-text">Vendor SKU</label>
                            <Input
                              value={mappingVendorSku}
                              onChange={(event) => setMappingVendorSku(event.currentTarget.value)}
                              placeholder="SUP-001"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-admin-text">Cost (cents)</label>
                            <Input
                              value={mappingCostCents}
                              onChange={(event) => setMappingCostCents(event.currentTarget.value)}
                              placeholder="1200"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-admin-text">Currency</label>
                            <Input
                              value={mappingCurrency}
                              onChange={(event) => setMappingCurrency(event.currentTarget.value.toUpperCase())}
                              placeholder="USD"
                              className="mt-1"
                              maxLength={3}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-admin-text">Lead days</label>
                            <Input
                              value={mappingLeadTimeDays}
                              onChange={(event) => setMappingLeadTimeDays(event.currentTarget.value)}
                              placeholder="5"
                              className="mt-1"
                            />
                          </div>
                          <div className="md:col-span-6">
                            <Button type="button" variant="neutral" onClick={handleAddMapping} disabled={mappingSaving}>
                              {mappingSaving ? "Saving..." : "Save mapping"}
                            </Button>
                          </div>
                        </div>
                      )}

                      {showUnmapped && (
                        <div className="mt-3 space-y-2">
                          <div className="flex flex-wrap items-end gap-2">
                            <select
                              className="h-10 rounded-md border border-admin-border bg-white px-3 text-sm"
                              value={unmappedSupplierId}
                              onChange={(event) => setUnmappedSupplierId(event.currentTarget.value)}
                            >
                              <option value="">Select supplier</option>
                              {[...suppliers].map((supplier) => (
                                <option key={supplier.id} value={supplier.id}>
                                  {supplier.name} {supplier.code ? `(${supplier.code})` : ""}
                                </option>
                              ))}
                            </select>
                            <Button type="button" variant="soft" onClick={handleLoadUnmapped} disabled={unmappedLoading}>
                              {unmappedLoading ? "Loading..." : "Load unmapped"}
                            </Button>
                          </div>
                          {unmappedItems.length ? (
                            <div className="space-y-2">
                              {unmappedItems.map((item) => (
                                <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-admin-border bg-white px-3 py-2 text-xs">
                                  <span>{item.vendor_sku}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => handleMapUnmapped(item.vendor_sku, item.supplier_id ?? unmappedSupplierId)}
                                  >
                                    Map to this SKU
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-admin-textSoft">No unmapped vendor SKUs.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-admin-textSoft">No readiness data.</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Название</label>
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.currentTarget.value)}
                      placeholder="Например, Премиум-рулетка"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Слаг</label>
                    <Input
                      value={slug}
                      onChange={(event) => setSlug(event.currentTarget.value)}
                      placeholder="premium-ruletka"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Цена</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={price}
                    onChange={handlePriceChange}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-admin-text">Currency</label>
                  <Input
                    type="text"
                    value={currency}
                    onChange={(event) => setCurrency(event.currentTarget.value.toUpperCase())}
                    placeholder="EUR"
                    maxLength={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Рейтинг</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={rating}
                      onChange={(event) => setRating(event.currentTarget.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Артикул (SKU)</label>
                    <div className="flex gap-2">
                      <Input
                        value={sku}
                        onChange={(event) => setSku(event.currentTarget.value)}
                        required
                      />
                      <Button type="button" variant="soft" onClick={() => setSku(generateSku())}>
                        Сгенерировать
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Категория</label>
                    <select
                      className="h-10 w-full rounded-md border border-admin-border bg-admin-surface px-3 text-sm"
                      value={category ?? ""}
                      onChange={handleCategoryChange}
                    >
                      {categoryOptions.map((option) => (
                        <option key={option.slug || "none"} value={option.slug}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Статус</label>
                    <select
                      className="h-10 w-full rounded-md border border-admin-border bg-admin-surface px-3 text-sm"
                      value={status}
                      onChange={(event) => setStatus(event.currentTarget.value)}
                    >
                      <option value="draft">Черновик</option>
                      <option value="published" disabled={Boolean(catalogPublishBlockedReason)}>
                        Опубликован
                      </option>
                      <option value="archived">Архив</option>
                    </select>
                    {catalogPublishBlockedReason ? (
                      <p className="text-xs text-amber-600">{catalogPublishBlockedReason}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Бренд каталога</label>
                    <select
                      className="h-10 w-full rounded-md border border-admin-border bg-admin-surface px-3 text-sm"
                      value={catalogBrandId}
                      onChange={handleCatalogBrandChange}
                      disabled={catalogBrandsLoading || catalogBrands.length === 0}
                    >
                      <option value="">{catalogBrandsLoading ? "Загрузка..." : "Не выбран"}</option>
                      {catalogBrands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                          {brand.status && brand.status !== "published" ? ` (${brand.status})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Модель каталога</label>
                    <select
                      className="h-10 w-full rounded-md border border-admin-border bg-admin-surface px-3 text-sm"
                      value={catalogProductId}
                      onChange={handleCatalogProductChange}
                      disabled={!catalogBrandId || catalogModelsLoading || catalogModels.length === 0}
                    >
                      <option value="">
                        {catalogBrandId ? (catalogModelsLoading ? "Загрузка..." : "Не выбрана") : "Сначала выберите бренд"}
                      </option>
                      {catalogModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.title}
                          {model.status && model.status !== "published" ? ` (${model.status})` : ""}
                        </option>
                      ))}
                    </select>
                    {selectedModel ? (
                      <div className="rounded-lg border border-admin-border bg-admin-surfaceMuted px-3 py-2 text-xs text-admin-text">
                        <div className="flex items-center justify-between gap-3">
                          <span>
                            Бренд: {selectedBrand?.name ?? "—"} ({selectedBrand?.slug ?? "—"})
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold capitalize ${
                              selectedModel.status === "published"
                                ? "bg-emerald-100 text-emerald-700"
                                : selectedModel.status === "archived"
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {selectedModel.status ?? "unknown"}
                          </span>
                        </div>
                        {catalogPublishBlockedReason ? (
                          <p className="mt-1 text-[11px] text-amber-700">{catalogPublishBlockedReason}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-admin-text">Краткое описание</label>
                  <textarea
                    value={shortDesc}
                    onChange={(event) => setShortDesc(event.currentTarget.value)}
                    rows={3}
                    className="w-full resize-y rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm"
                    placeholder="Ключевые преимущества товара в двух-трёх предложениях"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-admin-text">Теги (через запятую)</label>
                  <Input
                    value={tags}
                    onChange={(event) => setTags(event.currentTarget.value)}
                    placeholder="phone, laptop, accessory"
                  />
                </div>

                <ProductImagesField
                  label="Изображения"
                  images={images}
                  onChange={setImages}
                  productId={currentId}
                  slug={slug}
                  sku={sku}
                  onVersionCreated={() => setHistoryRefresh((value) => value + 1)}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium text-admin-text">Характеристики (JSON)</label>
                  <textarea
                    value={specsJson}
                    onChange={(event) => setSpecsJson(event.currentTarget.value)}
                    rows={6}
                    className="w-full resize-y rounded-md border border-admin-border bg-admin-surface px-3 py-2 font-mono text-xs"
                    placeholder='{"volatility": "low", "minBet": 1.5}'
                  />
                  {specsError ? <p className="text-xs text-rose-500">{specsError}</p> : null}
                </div>

                {error ? <p className="text-sm text-rose-500">{error}</p> : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Сохраняем..." : "Сохранить"}
                  </Button>
                  <Button
                    type="button"
                    variant="soft"
                    onClick={() => router.push("/admin/shop/products")}
                  >
                    К списку товаров
                  </Button>
                </div>
              </AdminStack>
            </form>
          )}
        </AdminSurface>

        {!loading && currentId ? (
          <AdminSurface tone="muted" padded="lg">
            <AdminStack gap="md">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-admin-text">История изображений</h2>
                <p className="text-sm text-admin-textSoft">
                  Используйте прошлые версии или удалите лишние варианты.
                </p>
              </div>
              <ProductImageHistory
                productId={currentId}
                refreshToken={historyRefresh}
                onUseImage={handleUseImage}
              />
            </AdminStack>
          </AdminSurface>
        ) : null}
      </AdminPageLayout>
    </AdminContentWrapper>
  );
}
