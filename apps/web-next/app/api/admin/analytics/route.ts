import { json } from "../../orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

import {
  parseRange,
  parseFilters,
  buildAnalyticsSnapshot,
  buildCompareBlock,
  type AnalyticsRange,
} from "@/app/api/admin/analytics-service";

function computePreviousRange(range: AnalyticsRange): AnalyticsRange {
  const duration = range.to.getTime() - range.from.getTime();
  const previousTo = new Date(range.from.getTime() - 1);
  previousTo.setUTCHours(23, 59, 59, 999);
  const previousFrom = new Date(previousTo.getTime() - duration);
  previousFrom.setUTCHours(0, 0, 0, 0);
  return { from: previousFrom, to: previousTo };
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const supabase = getAdminClient();
  const url = new URL(request.url);
  const range = parseRange(url.searchParams);
  const filters = parseFilters(url.searchParams);

  try {
    const { snapshot } = await buildAnalyticsSnapshot(supabase, range, filters);

    if (filters.compare) {
      const previousRange = computePreviousRange(range);
      const { snapshot: previousSnapshot } = await buildAnalyticsSnapshot(supabase, previousRange, filters);
      snapshot.compare = buildCompareBlock(snapshot, previousSnapshot);
    }

    return json({ ok: true, snapshot }, 200);
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
