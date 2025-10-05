import { NextResponse } from "next/server";

export const DAY_MS = 86_400_000;

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

type ClampOptions = {
  min?: number;
  max?: number;
  round?: boolean;
};

export function clampNumber(value: number, { min, max, round }: ClampOptions = {}): number {
  let result = value;
  if (!Number.isFinite(result)) {
    result = 0;
  }
  if (typeof min === "number") {
    result = Math.max(min, result);
  }
  if (typeof max === "number") {
    result = Math.min(max, result);
  }
  if (round) {
    result = Math.round(result);
  }
  return result;
}

export function qsNumber(input: string | null, fallback: number, opts: ClampOptions = {}): number {
  const parsed = Number(input ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return clampNumber(parsed, opts);
}

export function normalizeSort(sortRaw?: string | null): { column: string; ascending: boolean } {
  const fallback = { column: "created_at", ascending: false } as const;
  if (!sortRaw) return fallback;
  const normalized = sortRaw.toLowerCase();
  if (normalized.startsWith("amount_total")) {
    return { column: "amount_total", ascending: !normalized.includes("desc") };
  }
  if (normalized.startsWith("created_at")) {
    return { column: "created_at", ascending: !normalized.includes("desc") };
  }
  return fallback;
}

export function formatRangeEnd(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(23, 59, 59, 999);
  return date.toISOString();
}

export function toNumber(raw: number | string | null | undefined): number {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : 0;
  }
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
