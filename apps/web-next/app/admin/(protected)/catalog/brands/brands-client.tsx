"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import Button from "@ui/components/common/button";
import { toast } from "@ui/components/common/toast";
import { AdminStack, AdminSurface } from "@/components/admin/layout";

import type { CatalogBrandRecord } from "../catalog-types";

type ApiListResponse = {
  ok?: boolean;
  items?: CatalogBrandRecord[];
  error?: string;
  message?: string;
};

type ApiMutationResponse = {
  ok?: boolean;
  item?: CatalogBrandRecord;
  deleted?: boolean;
  error?: string;
  message?: string;
};

type FormState = {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  website: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  slug: "",
  description: "",
  website: "",
};

function LoadingMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 py-6 text-sm text-admin-textSoft">
      <span
        className="h-3 w-3 animate-spin rounded-full border-2 border-admin-border border-t-transparent"
        aria-hidden="true"
      />
      {children}
    </p>
  );
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

async function fetchBrands(): Promise<CatalogBrandRecord[]> {
  const response = await fetch("/api/admin/catalog/brands", {
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as ApiListResponse;
  if (!response.ok || !payload.ok) {
    const code = payload.error;
    let message = payload.message || payload.error || "Не удалось загрузить бренды.";
    if (code === "fetch_failed") {
      message = "Не удалось загрузить бренды. Попробуйте обновить страницу.";
    }
    throw new Error(message);
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

async function saveBrand(payload: Partial<CatalogBrandRecord>) {
  const response = await fetch("/api/admin/catalog/brands", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as ApiMutationResponse;
  if (!response.ok || !result.ok || !result.item) {
    const code = result.error;
    let message = result.message || result.error || "Не удалось сохранить бренд.";
    if (code === "name_required") {
      message = "Введите название бренда.";
    } else if (code === "slug_required") {
      message = "Введите слаг бренда.";
    } else if (code === "duplicate_slug") {
      message = "Бренд с таким слагом уже существует.";
    } else if (code === "bad_json") {
      message = "Неверный формат данных запроса.";
    }
    throw new Error(message);
  }
  return result.item;
}

async function deleteBrand(id: string) {
  const response = await fetch("/api/admin/catalog/brands", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  const result = (await response.json().catch(() => ({}))) as ApiMutationResponse;
  if (!response.ok || !result.ok) {
    const code = result.error;
    let message = result.message || result.error || "Не удалось удалить бренд.";
    if (code === "id_required") {
      message = "Не удалось удалить бренд: не передан идентификатор.";
    } else if (code === "has_sku") {
      message = "У бренда есть связанные SKU. Сначала отвяжите их от бренда.";
    } else if (code === "delete_failed") {
      message = "Ошибка при удалении бренда.";
    }
    throw new Error(message);
  }
}

async function brandSkuUsage(brandId: string): Promise<number> {
  const url = new URL("/api/admin/catalog/products", window.location.origin);
  url.searchParams.set("brand_id", brandId);
  url.searchParams.set("has_sku", "true");
  url.searchParams.set("include_sku_count", "true");
  const res = await fetch(url.toString(), { credentials: "include" });
  const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; items?: Array<{ sku_count?: number }> };
  if (!res.ok || !payload.ok || !Array.isArray(payload.items)) return 0;
  return payload.items.reduce((total, item) => total + (item?.sku_count ?? 0), 0);
}

export function BrandsClient() {
  const [brands, setBrands] = useState<CatalogBrandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const editMode = Boolean(form.id);

  const sortedBrands = useMemo(() => {
    return [...brands].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [brands]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
  }, []);

  const startEdit = useCallback((record: CatalogBrandRecord) => {
    setForm({
      id: record.id,
      name: record.name,
      slug: record.slug,
      description: record.description ?? "",
      website: record.website ?? "",
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBrands();
      setBrands(data);
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Не удалось загрузить бренды.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const name = form.name.trim();
    if (!name) {
      toast("Введите название бренда.", { variant: "error" });
      return;
    }
    const slug = form.slug.trim() || slugify(name);
    if (!slug) {
      toast("Введите слаг бренда.", { variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: form.id ?? undefined,
        name,
        slug,
        description: form.description.trim() || null,
        website: form.website.trim() || null,
      } satisfies Partial<CatalogBrandRecord>;
      const saved = await saveBrand(payload);
      setBrands((prev) => {
        const next = prev.filter((item) => item.id !== saved.id);
        next.push(saved);
        return next;
      });
      toast(editMode ? "Бренд обновлён." : "Бренд создан.", { variant: "success" });
      resetForm();
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Не удалось сохранить бренд.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: CatalogBrandRecord) => {
    const usage = await brandSkuUsage(record.id).catch(() => 0);
    if (usage > 0) {
      window.alert(
        `К этому бренду привязано ${usage} SKU через модели. Сначала отвяжите или перенесите их, затем удалите бренд.`,
      );
      return;
    }
    const confirmed = window.confirm(`Delete brand "${record.name}"?`);
    if (!confirmed) return;
    setDeletingId(record.id);
    try {
      await deleteBrand(record.id);
      setBrands((prev) => prev.filter((item) => item.id !== record.id));
      if (form.id === record.id) {
        resetForm();
      }
      toast("Бренд удалён.", { variant: "success" });
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Не удалось удалить бренд.", { variant: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerateSlug = () => {
    if (!form.name.trim()) return;
    setForm((prev) => ({ ...prev, slug: slugify(prev.name) }));
  };

  return (
    <AdminStack gap="lg">
      <AdminSurface>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Name</label>
            <input
              type="text"
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                  slug: prev.id ? prev.slug : prev.slug || slugify(event.target.value),
                }))
              }
              placeholder="Acme"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Slug</label>
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                type="text"
                className="flex-1 rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder="acme"
              />
              <Button type="button" variant="neutral" onClick={handleGenerateSlug}>
                Сгенерировать
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Description</label>
            <textarea
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              rows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Optional short blurb"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Website</label>
            <input
              type="url"
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              value={form.website}
              onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
              placeholder="https://example.com"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Сохранение..." : editMode ? "Сохранить изменения" : "Создать бренд"}
            </Button>
            <Button type="button" variant="soft" onClick={resetForm} disabled={saving}>
              {editMode ? "Отменить редактирование" : "Сбросить"}
            </Button>
          </div>
        </form>
      </AdminSurface>

      <AdminSurface>
        <div className="flex items-center justify-between gap-4 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">Бренды</h2>
            <p className="text-sm text-admin-textSoft">Всего: {brands.length}</p>
          </div>
          <Button variant="neutral" onClick={load} disabled={loading}>
            Обновить
          </Button>
        </div>

        {loading ? (
          <LoadingMessage>Загрузка брендов...</LoadingMessage>
        ) : sortedBrands.length === 0 ? (
          <p className="py-6 text-sm text-admin-textSoft">Бренды пока не добавлены.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-admin-textSubtle">
                  <th className="px-3 py-2">Название</th>
                  <th className="px-3 py-2">Слаг</th>
                  <th className="px-3 py-2">Сайт</th>
                  <th className="px-3 py-2">Создан</th>
                  <th className="px-3 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {sortedBrands.map((brand) => (
                  <tr key={brand.id} className="border-t border-admin-border">
                    <td className="px-3 py-3">
                      <div className="font-medium text-admin-text">{brand.name}</div>
                      {brand.description ? (
                        <div className="text-xs text-admin-textSoft">{brand.description}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-admin-textSubtle">{brand.slug}</td>
                    <td className="px-3 py-3 text-admin-textSubtle">
                      {brand.website ? (
                        <a
                          href={brand.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-admin-primary underline"
                        >
                          {brand.website}
                        </a>
                      ) : (
                        <span className="text-admin-textSoft">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-admin-textSubtle">
                      {brand.created_at ? new Date(brand.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="neutral"
                          onClick={() => startEdit(brand)}
                          className="min-h-[36px] px-3 py-2 text-sm"
                        >
                          Редактировать
                        </Button>
                        <Button
                          variant="soft"
                          className={clsx(
                            "min-h-[36px] px-3 py-2 text-sm text-rose-600",
                            deletingId === brand.id && "opacity-60",
                          )}
                          disabled={deletingId === brand.id}
                          onClick={() => handleDelete(brand)}
                        >
                          {deletingId === brand.id ? "Удаление..." : "Удалить"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurface>
    </AdminStack>
  );
}
