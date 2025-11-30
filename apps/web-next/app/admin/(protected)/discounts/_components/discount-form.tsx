"use client";;
import { adminFieldLabel } from "@/styles/classnames";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import { AdminSectionHeading, AdminStack, AdminSurface } from "@/components/admin/layout";

const ASSIGNMENT_SCOPES = ["PRODUCT", "BRAND", "VENDOR", "CATEGORY", "CUSTOMER_GROUP"] as const;
const DISCOUNT_TYPES = ["percent_off", "amount_off", "coupon", "bogo", "tiered"] as const;

type AssignmentScope = (typeof ASSIGNMENT_SCOPES)[number];

type AssignmentState = {
  scope: AssignmentScope;
  refId: string;
};

type CouponState = {
  id?: string;
  code: string;
  maxRedemptions?: string;
  startsAt?: string;
  endsAt?: string;
};

type FormState = {
  name: string;
  description: string;
  type: (typeof DISCOUNT_TYPES)[number];
  percentOff: string;
  amountOffCts: string;
  currency: string;
  bogoBuyQty: string;
  bogoGetQty: string;
  stackable: boolean;
  priority: string;
  minSubtotalCts: string;
  minQty: string;
  startAt: string;
  endAt: string;
  channel: string;
  usageLimitTotal: string;
  usageLimitPerUser: string;
  active: boolean;
  assignments: AssignmentState[];
  exclusions: AssignmentState[];
  coupons: CouponState[];
};

type DiscountFormProps = {
  mode: "create" | "edit";
  discountId?: string;
  initial?: any;
};

type ApiError = { field?: string; message: string };

const DEFAULT_STATE: FormState = {
  name: "",
  description: "",
  type: "percent_off",
  percentOff: "",
  amountOffCts: "",
  currency: "USD",
  bogoBuyQty: "",
  bogoGetQty: "",
  stackable: false,
  priority: "100",
  minSubtotalCts: "",
  minQty: "",
  startAt: "",
  endAt: "",
  channel: "all",
  usageLimitTotal: "",
  usageLimitPerUser: "",
  active: true,
  assignments: [],
  exclusions: [],
  coupons: [],
};

function toDateInputValue(value?: string | Date | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function fromApi(initial?: any): FormState {
  if (!initial) return { ...DEFAULT_STATE };
  return {
    name: initial.name ?? "",
    description: initial.description ?? "",
    type: initial.type ?? "percent_off",
    percentOff:
      initial.percentOff != null ? String(Number(initial.percentOff)) : "",
    amountOffCts:
      initial.amountOffCts != null ? String(initial.amountOffCts) : "",
    currency: initial.currency ?? DEFAULT_STATE.currency,
    bogoBuyQty: initial.bogoBuyQty != null ? String(initial.bogoBuyQty) : "",
    bogoGetQty: initial.bogoGetQty != null ? String(initial.bogoGetQty) : "",
    stackable: Boolean(initial.stackable),
    priority: initial.priority != null ? String(initial.priority) : "100",
    minSubtotalCts:
      initial.minSubtotalCts != null ? String(initial.minSubtotalCts) : "",
    minQty: initial.minQty != null ? String(initial.minQty) : "",
    startAt: toDateInputValue(initial.startAt),
    endAt: toDateInputValue(initial.endAt),
    channel: initial.channel ?? "all",
    usageLimitTotal:
      initial.usageLimitTotal != null ? String(initial.usageLimitTotal) : "",
    usageLimitPerUser:
      initial.usageLimitPerUser != null
        ? String(initial.usageLimitPerUser)
        : "",
    active: initial.active ?? true,
    assignments: Array.isArray(initial.assignments)
      ? initial.assignments.map((assignment: any) => ({
          scope: assignment.scope ?? "PRODUCT",
          refId: assignment.refId ?? "",
        }))
      : [],
    exclusions: Array.isArray(initial.exclusions)
      ? initial.exclusions.map((exclusion: any) => ({
          scope: exclusion.scope ?? "PRODUCT",
          refId: exclusion.refId ?? "",
        }))
      : [],
    coupons: Array.isArray(initial.coupons)
      ? initial.coupons.map((coupon: any) => ({
          id: coupon.id,
          code: coupon.code ?? "",
          maxRedemptions:
            coupon.maxRedemptions != null ? String(coupon.maxRedemptions) : "",
          startsAt: toDateInputValue(coupon.startsAt),
          endsAt: toDateInputValue(coupon.endsAt),
        }))
      : [],
  };
}

function toNumber(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function buildPayload(state: FormState) {
  const includeCurrency = state.type === "amount_off" || state.type === "coupon";
  const includeAmount = includeCurrency;
  const includePercent = state.type === "percent_off" || state.type === "coupon";
  const includeBogo = state.type === "bogo";

  const assignments = state.assignments
    .map((assignment) => ({
      scope: assignment.scope,
      refId: assignment.refId.trim(),
    }))
    .filter((assignment) => assignment.refId.length > 0);

  const exclusions = state.exclusions
    .map((exclusion) => ({
      scope: exclusion.scope,
      refId: exclusion.refId.trim(),
    }))
    .filter((exclusion) => exclusion.refId.length > 0);

  const coupons = state.coupons
    .map((coupon) => ({
      id: coupon.id,
      code: coupon.code.trim(),
      maxRedemptions: toNumber(coupon.maxRedemptions ?? ""),
      startsAt: coupon.startsAt ? new Date(coupon.startsAt).toISOString() : null,
      endsAt: coupon.endsAt ? new Date(coupon.endsAt).toISOString() : null,
    }))
    .filter((coupon) => coupon.code.length > 0);

  return {
    name: state.name.trim(),
    description: state.description.trim() || null,
    type: state.type,
    percentOff: includePercent ? toNumber(state.percentOff ?? "") ?? undefined : undefined,
    amountOffCts: includeAmount ? toNumber(state.amountOffCts ?? "") ?? undefined : undefined,
    currency: includeCurrency ? state.currency.trim().toUpperCase() || undefined : undefined,
    bogoBuyQty: includeBogo ? toNumber(state.bogoBuyQty ?? "") ?? undefined : undefined,
    bogoGetQty: includeBogo ? toNumber(state.bogoGetQty ?? "") ?? undefined : undefined,
    stackable: state.stackable,
    priority: toNumber(state.priority ?? "100") ?? 100,
    minSubtotalCts: toNumber(state.minSubtotalCts ?? "") ?? undefined,
    minQty: toNumber(state.minQty ?? "") ?? undefined,
    startAt: state.startAt ? new Date(state.startAt).toISOString() : null,
    endAt: state.endAt ? new Date(state.endAt).toISOString() : null,
    channel: state.channel.trim() || "all",
    usageLimitTotal: toNumber(state.usageLimitTotal ?? "") ?? undefined,
    usageLimitPerUser:
      toNumber(state.usageLimitPerUser ?? "") ?? undefined,
    active: state.active,
    assignments,
    exclusions,
    coupons,
  };
}

export function DiscountForm({ mode, discountId, initial }: DiscountFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => fromApi(initial));
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const showCurrency = useMemo(
    () => state.type === "amount_off" || state.type === "coupon",
    [state.type],
  );

  const showPercent = useMemo(
    () => state.type === "percent_off" || state.type === "coupon",
    [state.type],
  );

  const showBogo = state.type === "bogo";

  const handleChange = (key: keyof FormState, value: any) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);

    try {
      const payload = buildPayload(state);
      const endpoint =
        mode === "create"
          ? "/api/admin/discounts"
          : `/api/admin/discounts/${discountId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const response = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (!response.ok) {
        const issues = Array.isArray(json?.errors)
          ? (json.errors as any[]).map((issue) => ({
              field: issue.field ?? undefined,
              message: issue.messages?.[0] ?? json.message ?? "Validation error",
            }))
          : [{ message: json?.message ?? "Failed to save discount" }];
        setErrors(issues);
        setSubmitting(false);
        return;
      }

      const nextId = json?.item?.id ?? discountId;
      if (nextId) {
        router.push(`/admin/discounts/${nextId}`);
        router.refresh();
      } else {
        router.push("/admin/discounts");
        router.refresh();
      }
    } catch (error) {
      setErrors([{ message: error instanceof Error ? error.message : "Unexpected error" }]);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errors.length ? (
        <AdminSurface tone="accent" padded="md">
          <AdminStack gap="sm">
            <p className="text-sm font-medium text-admin-primary">Не удалось сохранить скидку</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-admin-primary">
              {errors.map((error, index) => (
                <li key={`${error.field ?? "generic"}-${index}`}>
                  {error.field ? (
                    <span className="font-medium capitalize">{error.field}: </span>
                  ) : null}
                  {error.message}
                </li>
              ))}
            </ul>
          </AdminStack>
        </AdminSurface>
      ) : null}
      <AdminSurface padded="lg">
        <AdminStack gap="lg">
          <AdminSectionHeading title="Основные параметры" description="Название, тип и базовые ограничения скидки." />
          <div className="grid gap-6 md:grid-cols-2">
            <label className="space-y-2">
              <span className={adminFieldLabel}>Название</span>
              <Input
                value={state.name}
                required
                onChange={(event) => handleChange("name", event.currentTarget.value)}
              />
            </label>
            <label className="space-y-2">
              <span className={adminFieldLabel}>Тип</span>
              <select
                value={state.type}
                onChange={(event) => handleChange("type", event.currentTarget.value as FormState["type"])}
                className="h-10 w-full rounded-md border border-admin-border bg-admin-surface px-3 text-sm text-admin-text"
              >
                {DISCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="space-y-2">
            <span className={adminFieldLabel}>Описание</span>
            <textarea
              value={state.description}
              onChange={(event) => handleChange("description", event.currentTarget.value)}
              className="min-h-[96px] w-full rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text shadow-sm focus:outline-none focus:ring-2 focus:ring-admin-primary"
              placeholder="Необязательно"
            />
          </label>
          <div className="grid gap-6 md:grid-cols-3">
            {showPercent ? (
              <label className="space-y-2">
                <span className={adminFieldLabel}>Процент</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={state.percentOff}
                  onChange={(event) => handleChange("percentOff", event.currentTarget.value)}
                  placeholder="Например, 10"
                />
              </label>
            ) : null}
            {showCurrency ? (
              <label className="space-y-2">
                <span className={adminFieldLabel}>Сумма (в центах)</span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={state.amountOffCts}
                  onChange={(event) => handleChange("amountOffCts", event.currentTarget.value)}
                  placeholder="Например, 500"
                />
              </label>
            ) : null}
            {showCurrency ? (
              <label className="space-y-2">
                <span className={adminFieldLabel}>Валюта</span>
                <Input
                  value={state.currency}
                  onChange={(event) => handleChange("currency", event.currentTarget.value)}
                  placeholder="USD"
                />
              </label>
            ) : null}
            {showBogo ? (
              <label className="space-y-2">
                <span className={adminFieldLabel}>Купить X</span>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={state.bogoBuyQty}
                  onChange={(event) => handleChange("bogoBuyQty", event.currentTarget.value)}
                />
              </label>
            ) : null}
            {showBogo ? (
              <label className="space-y-2">
                <span className={adminFieldLabel}>Получить Y</span>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={state.bogoGetQty}
                  onChange={(event) => handleChange("bogoGetQty", event.currentTarget.value)}
                />
              </label>
            ) : null}
          </div>
        </AdminStack>
      </AdminSurface>
      <AdminSurface padded="lg">
        <AdminStack gap="lg">
          <AdminSectionHeading title="Правила и ограничения" description="Период действия, приоритет и лимиты." />
          <div className="grid gap-6 md:grid-cols-3">
            <label className="space-y-2">
              <span className={adminFieldLabel}>Приоритет</span>
              <Input
                type="number"
                value={state.priority}
                onChange={(event) => handleChange("priority", event.currentTarget.value)}
                min={0}
                max={1000}
              />
            </label>
            <label className="space-y-2">
              <span className={adminFieldLabel}>Минимальная сумма (¢)</span>
              <Input
                type="number"
                min={0}
                value={state.minSubtotalCts}
                onChange={(event) => handleChange("minSubtotalCts", event.currentTarget.value)}
              />
            </label>
            <label className="space-y-2">
              <span className={adminFieldLabel}>Минимальное количество</span>
              <Input
                type="number"
                min={0}
                value={state.minQty}
                onChange={(event) => handleChange("minQty", event.currentTarget.value)}
              />
            </label>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <label className="space-y-2">
              <span className={adminFieldLabel}>Старт</span>
              <Input
                type="datetime-local"
                value={state.startAt}
                onChange={(event) => handleChange("startAt", event.currentTarget.value)}
              />
            </label>
            <label className="space-y-2">
              <span className={adminFieldLabel}>Окончание</span>
              <Input
                type="datetime-local"
                value={state.endAt}
                onChange={(event) => handleChange("endAt", event.currentTarget.value)}
              />
            </label>
            <label className="space-y-2">
              <span className={adminFieldLabel}>Канал</span>
              <Input
                value={state.channel}
                onChange={(event) => handleChange("channel", event.currentTarget.value)}
                placeholder="all, web, retail..."
              />
            </label>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="space-y-2">
              <span className={adminFieldLabel}>Лимит по всем использованиям</span>
              <Input
                type="number"
                min={0}
                value={state.usageLimitTotal}
                onChange={(event) => handleChange("usageLimitTotal", event.currentTarget.value)}
              />
            </label>
            <label className="space-y-2">
              <span className={adminFieldLabel}>Лимит на пользователя</span>
              <Input
                type="number"
                min={0}
                value={state.usageLimitPerUser}
                onChange={(event) => handleChange("usageLimitPerUser", event.currentTarget.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-admin-text">
              <input
                type="checkbox"
                checked={state.stackable}
                onChange={(event) => handleChange("stackable", event.currentTarget.checked)}
                className="h-4 w-4 rounded border-admin-border text-admin-primary focus:ring-admin-primary"
              />
              Суммируется с другими скидками
            </label>
            <label className="flex items-center gap-2 text-sm text-admin-text">
              <input
                type="checkbox"
                checked={state.active}
                onChange={(event) => handleChange("active", event.currentTarget.checked)}
                className="h-4 w-4 rounded border-admin-border text-admin-primary focus:ring-admin-primary"
              />
              Скидка активна
            </label>
          </div>
        </AdminStack>
      </AdminSurface>
      <RelationEditor
        title="Назначения"
        description="Выберите сущности, для которых действует скидка."
        rows={state.assignments}
        onChange={(rows) => handleChange("assignments", rows)}
      />
      <RelationEditor
        title="Исключения"
        description="Сущности, для которых скидка не применяется."
        rows={state.exclusions}
        onChange={(rows) => handleChange("exclusions", rows)}
      />
      {state.type === "coupon" ? (
        <CouponsEditor
          rows={state.coupons}
          onChange={(rows) => handleChange("coupons", rows)}
        />
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Сохранение..." : mode === "create" ? "Создать скидку" : "Сохранить изменения"}
        </Button>
        <Button
          type="button"
          variant="soft"
          disabled={submitting}
          onClick={() => router.push("/admin/discounts")}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}

function RelationEditor({
  title,
  description,
  rows,
  onChange,
}: {
  title: string;
  description: string;
  rows: AssignmentState[];
  onChange: (rows: AssignmentState[]) => void;
}) {
  const addRow = () => onChange([...rows, { scope: "PRODUCT", refId: "" }]);
  const updateRow = (index: number, patch: Partial<AssignmentState>) => {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };
  const removeRow = (index: number) => {
    const next = rows.filter((_, rowIndex) => rowIndex !== index);
    onChange(next);
  };

  return (
    <AdminSurface padded="lg">
      <AdminStack gap="lg">
        <AdminSectionHeading
          title={title}
          description={description}
          actions={
            <Button type="button" variant="soft" onClick={addRow}>
              Добавить
            </Button>
          }
        />
        {rows.length === 0 ? (
          <p className="text-sm text-admin-textSoft">Пока нет записей.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row, index) => (
              <div
                key={`${row.scope}-${index}`}
                className="grid gap-4 rounded-xl border border-admin-border/60 bg-admin-surfaceMuted p-4 md:grid-cols-[200px,1fr,auto]"
              >
                <select
                  value={row.scope}
                  onChange={(event) =>
                    updateRow(index, { scope: event.currentTarget.value as AssignmentScope })
                  }
                  className="h-10 rounded-md border border-admin-border bg-admin-surface px-3 text-sm text-admin-text"
                >
                  {ASSIGNMENT_SCOPES.map((scope) => (
                    <option key={scope} value={scope}>
                      {scope}
                    </option>
                  ))}
                </select>
                <Input
                  value={row.refId}
                  onChange={(event) => updateRow(index, { refId: event.currentTarget.value })}
                  placeholder="Идентификатор сущности"
                />
                <Button type="button" variant="ghost" onClick={() => removeRow(index)}>
                  Удалить
                </Button>
              </div>
            ))}
          </div>
        )}
      </AdminStack>
    </AdminSurface>
  );
}

function CouponsEditor({
  rows,
  onChange,
}: {
  rows: CouponState[];
  onChange: (rows: CouponState[]) => void;
}) {
  const addRow = () => onChange([...rows, { code: "" }]);
  const updateRow = (index: number, patch: Partial<CouponState>) => {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };
  const removeRow = (index: number) => {
    const next = rows.filter((_, rowIndex) => rowIndex !== index);
    onChange(next);
  };

  return (
    <AdminSurface padded="lg">
      <AdminStack gap="lg">
        <AdminSectionHeading
          title="Купоны"
          description="Коды, лимиты и сроки действия купонов."
          actions={
            <Button type="button" variant="soft" onClick={addRow}>
              Добавить купон
            </Button>
          }
        />
        {rows.length === 0 ? (
          <p className="text-sm text-admin-textSoft">Купоны не добавлены.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row, index) => (
              <div
                key={row.id ?? index}
                className="grid gap-4 rounded-xl border border-admin-border/60 bg-admin-surfaceMuted p-4 md:grid-cols-[minmax(160px,1fr),repeat(3,minmax(0,1fr)),auto]"
              >
                <Input
                  value={row.code}
                  onChange={(event) => updateRow(index, { code: event.currentTarget.value })}
                  placeholder="Код"
                />
                <Input
                  type="number"
                  min={0}
                  value={row.maxRedemptions ?? ""}
                  onChange={(event) => updateRow(index, { maxRedemptions: event.currentTarget.value })}
                  placeholder="Макс. использований"
                />
                <Input
                  type="datetime-local"
                  value={row.startsAt ?? ""}
                  onChange={(event) => updateRow(index, { startsAt: event.currentTarget.value })}
                />
                <Input
                  type="datetime-local"
                  value={row.endsAt ?? ""}
                  onChange={(event) => updateRow(index, { endsAt: event.currentTarget.value })}
                />
                <Button type="button" variant="ghost" onClick={() => removeRow(index)}>
                  Удалить
                </Button>
              </div>
            ))}
          </div>
        )}
      </AdminStack>
    </AdminSurface>
  );
}
