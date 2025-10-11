import { json } from "../../../orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

import {
  parseRange,
  parseFilters,
  buildAnalyticsSnapshot,
} from "@/app/api/admin/analytics-service";

function formatRevenueMap(map: Record<string, number> | undefined | null): string {
  if (!map) return "";
  return Object.entries(map)
    .map(([currency, amount]) => `${currency}:${Number(amount).toFixed(2)}`)
    .join("|");
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const supabase = getAdminClient();
  const url = new URL(request.url);
  const search = url.searchParams;

  const range = parseRange(search);
  const filters = parseFilters(search);
  const format = search.get("format") === "csv" ? "csv" : "json";
  const entity = search.get("entity") === "sources" ? "sources" : "slugs";

  const offsetRaw = Number.parseInt(search.get("offset") ?? "0", 10);
  const limitRaw = Number.parseInt(search.get("limit") ?? "200", 10);
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 1000) : 200;

  try {
    const topLimit = offset + limit;
    const { internals } = await buildAnalyticsSnapshot(supabase, range, filters, { topLimit });

    const allItems = entity === "sources" ? internals.topSourcesFull : internals.topSlugsFull;
    const sliced = allItems.slice(offset, offset + limit);

    if (format === "json") {
      return json(
        {
          ok: true,
          entity,
          range: {
            from: range.from.toISOString(),
            to: range.to.toISOString(),
          },
          pagination: {
            offset,
            limit,
            total: allItems.length,
          },
          items: sliced,
        },
        200,
      );
    }

    const headers =
      entity === "sources"
        ? ["source", "clicks", "paid", "cr", "revenue", "avg_order_value"]
        : ["slug", "clicks", "impressions", "ctr", "paid", "cr", "revenue", "avg_order_value"];

    const csvRows = [
      headers.join(","),
      ...sliced.map((item) => {
        if (entity === "sources") {
          const sourceItem = item as any;
          return [
            `"${sourceItem.source.replace(/"/g, '""')}"`,
            String(sourceItem.count ?? 0),
            String(sourceItem.paid ?? 0),
            (Number(sourceItem.cr ?? 0) || 0).toFixed(4),
            `"${formatRevenueMap(sourceItem.revenue).replace(/"/g, '""')}"`,
            sourceItem.avgOrderValue != null ? Number(sourceItem.avgOrderValue).toFixed(2) : "",
          ].join(",");
        }
        const slugItem = item as any;
        return [
          `"${slugItem.slug.replace(/"/g, '""')}"`,
          String(slugItem.clicks ?? 0),
          String(slugItem.impressions ?? 0),
          (Number(slugItem.ctr ?? 0) || 0).toFixed(4),
          String(slugItem.paid ?? 0),
          (Number(slugItem.cr ?? 0) || 0).toFixed(4),
          `"${formatRevenueMap(slugItem.revenue).replace(/"/g, '""')}"`,
          slugItem.avgOrderValue != null ? Number(slugItem.avgOrderValue).toFixed(2) : "",
        ].join(",");
      }),
    ].join("\n");

    return new Response(csvRows, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error: unknown) {
    return json(
      {
        ok: false,
        code: "internal",
        message: String((error as Error)?.message ?? error),
      },
      500,
    );
  }
}
