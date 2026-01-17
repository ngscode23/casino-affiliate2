"use client";;
import { mutedTextXs } from "@/styles/classnames";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { RefreshCw, Save, Trash2, Plus } from "lucide-react";
import Button from "@ui/components/common/button";
import { toast } from "@ui/components/common/toast";
import {
  AdminPageLayout,
  AdminSurface,
  AdminStack,
  AdminInfoPanel,
} from "@/components/admin/layout";

type HeroRecord = {
  id: string;
  title: string;
  eyebrow: string | null;
  body: string | null;
  primary_cta_label: string | null;
  primary_cta_href: string | null;
  secondary_cta_label: string | null;
  secondary_cta_href: string | null;
  image_url: string | null;
  image_alt: string | null;
  theme: string | null;
  priority: number | null;
  start_at: string | null;
  end_at: string | null;
  segment_locale: string | null;
  segment_country: string | null;
  segment_currency: string | null;
  variant: string | null;
  tracking_id: string | null;
  published: boolean | null;
  created_at?: string;
  updated_at?: string;
};

type ApiListResponse = { ok?: boolean; items?: HeroRecord[]; error?: string; message?: string };
type ApiMutationResponse = { ok?: boolean; item?: HeroRecord; deleted?: boolean; error?: string; message?: string };

type FormState = {
  id: string | null;
  title: string;
  eyebrow: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  imageUrl: string;
  imageAlt: string;
  theme: string;
  priority: string;
  startAt: string;
  endAt: string;
  locale: string;
  country: string;
  currency: string;
  variant: string;
  trackingId: string;
  published: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  eyebrow: "",
  body: "",
  primaryLabel: "",
  primaryHref: "",
  secondaryLabel: "",
  secondaryHref: "",
  imageUrl: "",
  imageAlt: "",
  theme: "dark",
  priority: "0",
  startAt: "",
  endAt: "",
  locale: "",
  country: "",
  currency: "",
  variant: "A",
  trackingId: "",
  published: false,
};

async function fetchHeroes(): Promise<HeroRecord[]> {
  const res = await fetch("/api/admin/hero", { credentials: "include" });
  const payload = (await res.json().catch(() => ({}))) as ApiListResponse;
  if (!res.ok || !payload.ok) throw new Error(payload.message || payload.error || "Не удалось загрузить кампании");
  return payload.items ?? [];
}

async function saveHero(data: Partial<HeroRecord>) {
  const res = await fetch("/api/admin/hero", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const payload = (await res.json().catch(() => ({}))) as ApiMutationResponse;
  if (!res.ok || !payload.ok || !payload.item) throw new Error(payload.message || payload.error || "Сохранение не удалось");
  return payload.item;
}

async function deleteHero(id: string) {
  const res = await fetch("/api/admin/hero", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
  const payload = (await res.json().catch(() => ({}))) as ApiMutationResponse;
  if (!res.ok || !payload.ok) throw new Error(payload.message || payload.error || "Удаление не удалось");
}

const INPUT_CLASS =
  "w-full rounded-lg border border-border/50 bg-card/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

export function HeroAdminClient() {
  const [items, setItems] = useState<HeroRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const pa = Number.isFinite(a.priority ?? NaN) ? Number(a.priority) : 0;
        const pb = Number.isFinite(b.priority ?? NaN) ? Number(b.priority) : 0;
        if (pa !== pb) return pb - pa;
        return (b.start_at || "").localeCompare(a.start_at || "");
      }),
    [items],
  );

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchHeroes();
        setItems(list);
      } catch (error) {
        console.error(error);
        toast("Не удалось загрузить кампании", { variant: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resetForm = () => setForm(EMPTY_FORM);

  const selectItem = (item: HeroRecord) => {
    setForm({
      id: item.id,
      title: item.title ?? "",
      eyebrow: item.eyebrow ?? "",
      body: item.body ?? "",
      primaryLabel: item.primary_cta_label ?? "",
      primaryHref: item.primary_cta_href ?? "",
      secondaryLabel: item.secondary_cta_label ?? "",
      secondaryHref: item.secondary_cta_href ?? "",
      imageUrl: item.image_url ?? "",
      imageAlt: item.image_alt ?? "",
      theme: item.theme ?? "dark",
      priority: String(item.priority ?? 0),
      startAt: item.start_at ? item.start_at.slice(0, 16) : "",
      endAt: item.end_at ? item.end_at.slice(0, 16) : "",
      locale: item.segment_locale ?? "",
      country: item.segment_country ?? "",
      currency: item.segment_currency ?? "",
      variant: item.variant ?? "A",
      trackingId: item.tracking_id ?? "",
      published: Boolean(item.published),
    });
  };

  const handleChange = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<HeroRecord> = {
        id: form.id || undefined,
        title: form.title,
        eyebrow: form.eyebrow || null,
        body: form.body || null,
        primary_cta_label: form.primaryLabel || null,
        primary_cta_href: form.primaryHref || null,
        secondary_cta_label: form.secondaryLabel || null,
        secondary_cta_href: form.secondaryHref || null,
        image_url: form.imageUrl || null,
        image_alt: form.imageAlt || null,
        theme: form.theme || null,
        priority: Number(form.priority) || 0,
        start_at: form.startAt ? new Date(form.startAt).toISOString() : null,
        end_at: form.endAt ? new Date(form.endAt).toISOString() : null,
        segment_locale: form.locale || null,
        segment_country: form.country || null,
        segment_currency: form.currency || null,
        variant: form.variant || null,
        tracking_id: form.trackingId || null,
        published: form.published,
      };

      const item = await saveHero(payload);
      setItems((prev) => {
        const others = prev.filter((p) => p.id !== item.id);
        return [...others, item];
      });
      selectItem(item);
      toast("Сохранено и кеш инвалидаирован", { variant: "success" });
    } catch (error) {
      console.error(error);
      toast((error as Error)?.message || "Ошибка сохранения", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!form.id) return;
    setDeletingId(form.id);
    try {
      await deleteHero(form.id);
      setItems((prev) => prev.filter((item) => item.id !== form.id));
      resetForm();
      toast("Удалено и кеш инвалидаирован", { variant: "success" });
    } catch (error) {
      console.error(error);
      toast((error as Error)?.message || "Ошибка удаления", { variant: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminPageLayout
      title="Hero баннеры"
      description="Управление кампаниями для главного промо-блока. Публикация автоматически инвалидаирует кеш hero."
    >
      <AdminStack>
        <AdminSurface>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="secondary" className="h-9 px-3 text-sm" onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" /> Новая кампания
              </Button>
            </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {loading ? "Загрузка..." : `${items.length} шт.`}
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-9 min-h-0 rounded-full border border-border/60 p-0 text-muted-foreground hover:text-foreground"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        setItems(await fetchHeroes());
                      } catch {
                        toast("?? ??????? ???????? ??????", { variant: "error" });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    aria-label="????????"
                  >
                    <RefreshCw className={clsx("h-4 w-4", loading && "animate-spin")} />
                  </Button>
                </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[2fr_3fr]">
            <div className="rounded-xl border border-border/40 bg-card/70 p-4 shadow-soft">
              <div className="mb-3 text-sm font-semibold text-muted-foreground">Кампании</div>
              <div className="flex flex-col gap-2">
                {sortedItems.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant="ghost"
                    className={clsx(
                      "h-auto min-h-0 w-full items-start justify-between rounded-lg border px-3 py-2 text-left transition",
                      form.id === item.id
                        ? "border-primary/60 bg-primary/10 text-primary-foreground"
                        : "border-border/40 bg-card hover:border-primary/40",
                    )}
                    onClick={() => selectItem(item)}
                  >
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className={mutedTextXs}>
                        {item.published ? "Опубликовано" : "Черновик"} · приоритет {item.priority ?? 0}
                      </div>
                    </div>
                    {item.start_at ? (
                      <div className="text-[11px] text-muted-foreground">
                        {item.start_at.slice(0, 10)}
                        {item.end_at ? ` → ${item.end_at.slice(0, 10)}` : ""}
                      </div>
                    ) : null}
                  </Button>
                ))}
                {sortedItems.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/50 p-3 text-sm text-muted-foreground">
                    Пока нет кампаний
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-card/70 p-4 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-muted-foreground">
                  {form.id ? "Редактирование" : "Новая кампания"}
                </div>
                <div className="flex items-center gap-2">
                  {form.id && (
                    <Button
                      variant="ghost"
                      onClick={onDelete}
                      disabled={deletingId === form.id}
                      className="h-9 px-3 text-sm text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> {deletingId === form.id ? "Удаление..." : "Удалить"}
                    </Button>
                  )}
                  <Button className="h-9 px-4 text-sm" onClick={onSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Сохранение..." : "Сохранить"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Заголовок" required>
                  <input
                    className={INPUT_CLASS}
                    value={form.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="Deal of the day"
                  />
                </Field>
                <Field label="Eyebrow">
                  <input
                    className={INPUT_CLASS}
                    value={form.eyebrow}
                    onChange={(e) => handleChange("eyebrow", e.target.value)}
                    placeholder="# Promo"
                  />
                </Field>
              </div>

              <Field label="Текст">
                  <textarea
                  className={`${INPUT_CLASS} min-h-[88px]`}
                  value={form.body}
                  onChange={(e) => handleChange("body", e.target.value)}
                  placeholder="Оффер и детали"
                />
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Primary CTA label">
                  <input
                    className={INPUT_CLASS}
                    value={form.primaryLabel}
                    onChange={(e) => handleChange("primaryLabel", e.target.value)}
                    placeholder="Shop now"
                  />
                </Field>
                <Field label="Primary CTA href">
                  <input
                    className={INPUT_CLASS}
                    value={form.primaryHref}
                    onChange={(e) => handleChange("primaryHref", e.target.value)}
                    placeholder="/products"
                  />
                </Field>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Secondary CTA label">
                  <input
                    className={INPUT_CLASS}
                    value={form.secondaryLabel}
                    onChange={(e) => handleChange("secondaryLabel", e.target.value)}
                    placeholder="Learn more"
                  />
                </Field>
                <Field label="Secondary CTA href">
                  <input
                    className={INPUT_CLASS}
                    value={form.secondaryHref}
                    onChange={(e) => handleChange("secondaryHref", e.target.value)}
                    placeholder="/contact"
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Image URL">
                  <input
                    className={INPUT_CLASS}
                    value={form.imageUrl}
                    onChange={(e) => handleChange("imageUrl", e.target.value)}
                    placeholder="https://..."
                  />
                </Field>
                <Field label="Image alt">
                  <input
                    className={INPUT_CLASS}
                    value={form.imageAlt}
                    onChange={(e) => handleChange("imageAlt", e.target.value)}
                    placeholder="Описание картинки"
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Тема">
                  <input
                    className={INPUT_CLASS}
                    value={form.theme}
                    onChange={(e) => handleChange("theme", e.target.value)}
                    placeholder="dark / light"
                  />
                </Field>
                <Field label="Приоритет">
                  <input
                    className={INPUT_CLASS}
                    type="number"
                    value={form.priority}
                    onChange={(e) => handleChange("priority", e.target.value)}
                  />
                </Field>
                <Field label="Variant (A/B)">
                  <input
                    className={INPUT_CLASS}
                    value={form.variant}
                    onChange={(e) => handleChange("variant", e.target.value)}
                    placeholder="A"
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Start at">
                  <input
                    className={INPUT_CLASS}
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => handleChange("startAt", e.target.value)}
                  />
                </Field>
                <Field label="End at">
                  <input
                    className={INPUT_CLASS}
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => handleChange("endAt", e.target.value)}
                  />
                </Field>
                <Field label="Published">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.published}
                      onChange={(e) => handleChange("published", e.target.checked)}
                    />
                    <span>Опубликовано</span>
                  </label>
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Locale (ru,en,...)">
                  <input
                    className={INPUT_CLASS}
                    value={form.locale}
                    onChange={(e) => handleChange("locale", e.target.value)}
                  />
                </Field>
                <Field label="Country (ISO)">
                  <input
                    className={INPUT_CLASS}
                    value={form.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                  />
                </Field>
                <Field label="Currency (USD/EUR)">
                  <input
                    className={INPUT_CLASS}
                    value={form.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Tracking ID">
                  <input
                    className="input"
                    value={form.trackingId}
                    onChange={(e) => handleChange("trackingId", e.target.value)}
                    placeholder="hero-2025-bf"
                  />
                </Field>
              </div>
            </div>
          </div>
        </AdminSurface>

        <AdminInfoPanel title="Как работает">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>— Публикация или удаление автоматически вызывает revalidate тега hero.</li>
            <li>— Приоритет: больше число выигрывает при одинаковых датах.</li>
            <li>— Время: кампания видна только в интервале start/end (если заданы).</li>
            <li>— Сегменты (locale/country/currency) пока не фильтруются на сервере — добавим при необходимости.</li>
          </ul>
        </AdminInfoPanel>
      </AdminStack>
    </AdminPageLayout>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-semibold text-muted-foreground">
        {label} {required ? "*" : ""}
      </span>
      {children}
    </label>
  );
}
