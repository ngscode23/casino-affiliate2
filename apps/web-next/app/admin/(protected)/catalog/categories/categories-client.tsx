"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { RefreshCw } from "lucide-react";

import Button from "@ui/components/common/button";
import { toast } from "@ui/components/common/toast";
import { AdminPageLayout, AdminSurface, AdminStack, AdminInfoPanel } from "@/components/admin/layout";

export type CatalogCategoryRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number | null;
  is_active: boolean;
};

type ApiListResponse = {
  ok?: boolean;
  items?: CatalogCategoryRecord[];
  error?: string;
  message?: string;
};

type ApiMutationResponse = {
  ok?: boolean;
  item?: CatalogCategoryRecord;
  deleted?: boolean;
  error?: string;
  message?: string;
};

type FormState = {
  id: string | null;
  title: string;
  slug: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  slug: "",
  description: "",
  sortOrder: "100",
  isActive: true,
};

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

async function fetchCategories(includeInactive = true): Promise<CatalogCategoryRecord[]> {
  const url = new URL("/api/admin/catalog/categories", window.location.origin);
  if (!includeInactive) {
    url.searchParams.set("include_inactive", "false");
  }
  const response = await fetch(url.toString(), {
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as ApiListResponse;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Не удалось загрузить категории");
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

async function saveCategory(payload: Partial<CatalogCategoryRecord>) {
  const response = await fetch("/api/admin/catalog/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = (await response.json().catch(() => ({}))) as ApiMutationResponse;
  if (!response.ok || !json.ok || !json.item) {
    throw new Error(json.message || json.error || "Не удалось сохранить категорию");
  }
  return json.item;
}

async function deleteCategory(id: string) {
  const response = await fetch("/api/admin/catalog/categories", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
  const json = (await response.json().catch(() => ({}))) as ApiMutationResponse;
  if (!response.ok || !json.ok) {
    throw new Error(json.message || json.error || "Не удалось удалить категорию");
  }
}

export function CategoriesClient() {
  const [categories, setCategories] = useState<CatalogCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const orderA = Number.isFinite(a.sort_order ?? NaN) ? Number(a.sort_order) : 1000;
      const orderB = Number.isFinite(b.sort_order ?? NaN) ? Number(b.sort_order) : 1000;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
  }, [categories]);

  const editMode = Boolean(form.id);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
  }, []);

  const startEdit = useCallback((record: CatalogCategoryRecord) => {
    setForm({
      id: record.id,
      title: record.title,
      slug: record.slug,
      description: record.description ?? "",
      sortOrder: record.sort_order != null ? String(record.sort_order) : "100",
      isActive: record.is_active,
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCategories(true);
      setCategories(data);
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Не удалось загрузить категории", { variant: "error" });
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
    const title = form.title.trim();
    if (!title) {
      toast("Укажите название категории", { variant: "error" });
      return;
    }
    const slugInput = form.slug.trim() || slugify(title);
    if (!slugInput) {
      toast("Заполните slug (латиница, без пробелов)", { variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: form.id ?? undefined,
        title,
        slug: slugInput,
        description: form.description.trim() || null,
        sort_order: Number(form.sortOrder) || 100,
        is_active: form.isActive,
      } satisfies Partial<CatalogCategoryRecord>;
      const saved = await saveCategory(payload);
      setCategories((prev) => {
        const next = prev.filter((item) => item.id !== saved.id);
        next.push(saved);
        return next;
      });
      toast(editMode ? "Категория обновлена" : "Категория создана", { variant: "success" });
      resetForm();
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Ошибка сохранения", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: CatalogCategoryRecord) => {
    if (!record.id) return;
    const confirmed = window.confirm(`Удалить категорию «${record.title}»?`);
    if (!confirmed) return;
    setDeletingId(record.id);
    try {
      await deleteCategory(record.id);
      setCategories((prev) => prev.filter((item) => item.id !== record.id));
      if (form.id === record.id) {
        resetForm();
      }
      toast("Категория удалена", { variant: "success" });
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Ошибка удаления", { variant: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (record: CatalogCategoryRecord) => {
    try {
      const updated = await saveCategory({
        id: record.id,
        title: record.title,
        slug: record.slug,
        description: record.description,
        sort_order: record.sort_order ?? 100,
        is_active: !record.is_active,
      });
      setCategories((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Не удалось обновить статус", { variant: "error" });
    }
  };

  const handleGenerateSlug = () => {
    if (!form.title.trim()) return;
    const generated = slugify(form.title);
    setForm((prev) => ({ ...prev, slug: generated }));
  };

  const sidebar = (
    <AdminInfoPanel title="Памятка">
      <ul className="list-disc space-y-2 pl-5">
        <li>Slug используется в URL: /products/<strong>slug</strong>.</li>
        <li>Только активные категории появляются в хедере и дропдауне.</li>
        <li>Сортировка влияет на порядок в всплывающем меню.</li>
      </ul>
      <div className="flex items-center gap-2 text-sm text-admin-textSoft">
        <RefreshCw size={14} />
        Изменения применяются сразу после сохранения.
      </div>
    </AdminInfoPanel>
  );

  return (
    <AdminPageLayout
      title="Категории каталога"
      description="Управляйте верхним уровнем каталога, который отображается в шапке сайта."
      breadcrumbs={[
        { label: "Админ", href: "/admin" },
        { label: "Каталог", href: "/admin/catalog/categories" },
        { label: "Категории" },
      ]}
      sidebar={sidebar}
      primaryActions={
        <Button variant="secondary" onClick={resetForm} disabled={saving}>
          {editMode ? "Создать новую" : "Очистить форму"}
        </Button>
      }
    >
      <AdminSurface>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Название</label>
            <input
              type="text"
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  title: event.target.value,
                  slug: prev.id ? prev.slug : prev.slug || slugify(event.target.value),
                }))
              }
              placeholder="Например, Ноутбуки"
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
                placeholder="notebooks"
              />
              <Button type="button" variant="neutral" onClick={handleGenerateSlug}>
                Сгенерировать
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Описание</label>
            <textarea
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              rows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Короткое описание (опционально)"
            />
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-admin-text">Сортировка</label>
              <input
                type="number"
                className="w-32 rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.sortOrder}
                onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-admin-text">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-admin-border"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              Активна
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Сохранение..." : editMode ? "Сохранить изменения" : "Создать категорию"}
            </Button>
            {editMode ? (
              <Button type="button" variant="soft" onClick={resetForm} disabled={saving}>
                Отмена редактирования
              </Button>
            ) : null}
          </div>
        </form>
      </AdminSurface>

      <AdminSurface>
        <div className="flex items-center justify-between gap-4 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">Список категорий</h2>
            <p className="text-sm text-admin-textSoft">Всего: {categories.length}</p>
          </div>
          <Button variant="neutral" onClick={load} disabled={loading}>
            Обновить
          </Button>
        </div>

        {loading ? (
          <p className="py-6 text-sm text-admin-textSoft">Загрузка...</p>
        ) : sortedCategories.length === 0 ? (
          <p className="py-6 text-sm text-admin-textSoft">Категории ещё не созданы.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-admin-textSubtle">
                  <th className="px-3 py-2">Название</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Порядок</th>
                  <th className="px-3 py-2">Статус</th>
                  <th className="px-3 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map((category) => (
                  <tr key={category.id} className="border-t border-admin-border">
                    <td className="px-3 py-3">
                      <div className="font-medium text-admin-text">{category.title}</div>
                      {category.description ? (
                        <div className="text-xs text-admin-textSoft">{category.description}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-admin-textSubtle">{category.slug}</td>
                    <td className="px-3 py-3 text-admin-textSubtle">{category.sort_order ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                          category.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600",
                        )}
                      >
                        {category.is_active ? "Активна" : "Скрыта"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="neutral"
                          onClick={() => startEdit(category)}
                          className="min-h-[36px] px-3 py-2 text-sm"
                        >
                          Редактировать
                        </Button>
                        <Button
                          variant="neutral"
                          onClick={() => handleToggleActive(category)}
                          disabled={saving}
                          className="min-h-[36px] px-3 py-2 text-sm"
                        >
                          {category.is_active ? "Скрыть" : "Показать"}
                        </Button>
                        <Button
                          variant="soft"
                          className={clsx(
                            "min-h-[36px] px-3 py-2 text-sm text-rose-600",
                            deletingId === category.id && "opacity-60",
                          )}
                          disabled={deletingId === category.id}
                          onClick={() => handleDelete(category)}
                        >
                          {deletingId === category.id ? "Удаление..." : "Удалить"}
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
    </AdminPageLayout>
  );
}
