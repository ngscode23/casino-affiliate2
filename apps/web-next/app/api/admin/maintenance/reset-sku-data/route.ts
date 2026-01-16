import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const CONFIRM_PHRASE = "RESET SKU DATA";

type ResetPayload = {
  confirm?: string;
};

type DeleteTask = {
  schema?: string | null;
  table: string;
  filterColumn: string;
  optional?: boolean;
};

const DELETE_TASKS: DeleteTask[] = [
  { table: "purchase_order_items", filterColumn: "id" },
  { table: "supplier_inventory_levels", filterColumn: "id" },
  { table: "supplier_offers", filterColumn: "id" },
  { table: "supplier_skus", filterColumn: "id" },
  { table: "supplier_feed_unmapped", filterColumn: "id" },
  { table: "order_items", filterColumn: "id" },
  { table: "product_review_messages", filterColumn: "id" },
  { table: "user_reviews", filterColumn: "id" },
  { table: "product_impressions", filterColumn: "id" },
  { table: "shop_clicks", filterColumn: "id" },
  { table: "shop_impressions", filterColumn: "id" },
  { table: "recent_views", filterColumn: "id" },
  { table: "ecom_wishlist", filterColumn: "product_id" },
  { table: "user_activity", filterColumn: "id" },
  { table: "product_attributes", filterColumn: "product_id" },
  { table: "ecom_product_image_versions", filterColumn: "id" },
  { table: "product_id_map", filterColumn: "id" },
  { schema: "cleanup_backup", table: "product_id_map", filterColumn: "legacy_product_id", optional: true },
  { table: "ecom_products", filterColumn: "id" },
];

function isResetAllowed() {
  const envFlag =
    process.env.ALLOW_ADMIN_RESET?.toLowerCase() === "true" ||
    process.env.NEXT_PUBLIC_ALLOW_ADMIN_RESET?.toLowerCase() === "true";
  const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
  if (nodeEnv === "production" && !envFlag) return false;
  return true;
}

function normalizeConfirm(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function fullTableName(task: DeleteTask) {
  if (task.schema && task.schema !== "public") {
    return `${task.schema}.${task.table}`;
  }
  return task.table;
}

function isMissingRelation(error: any): boolean {
  if (!error) return false;
  if (error.code === "42P01") return true;
  const message = String(error.message ?? "");
  return /does not exist/i.test(message);
}

function isSchemaNotAllowed(error: any): boolean {
  if (!error) return false;
  if (error.code === "PGRST106") return true;
  const message = String(error.message ?? "");
  return /schema must be one of/i.test(message);
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  if (!isResetAllowed()) {
    return json(
      {
        ok: false,
        error: "reset_disabled",
        message: "Reset is disabled in production. Set ALLOW_ADMIN_RESET=true to enable.",
      },
      403,
    );
  }

  let payload: ResetPayload = {};
  try {
    payload = (await request.json()) as ResetPayload;
  } catch {
    return json({ ok: false, error: "bad_json", message: "Invalid JSON payload." }, 400);
  }

  const confirm = normalizeConfirm(payload.confirm);
  if (confirm !== CONFIRM_PHRASE) {
    return json(
      {
        ok: false,
        error: "confirm_required",
        message: `Type "${CONFIRM_PHRASE}" to confirm.`,
      },
      400,
    );
  }

  const results: Array<{
    table: string;
    deleted: number;
    skipped?: boolean;
    reason?: string;
  }> = [];

  const supabase = getAdminClient();
  const { data: catalogReset, error: catalogResetError } = (await (supabase as any).rpc(
    "admin_reset_catalog_models"
  )) as { data?: Record<string, number> | null; error?: any };
  if (catalogResetError) {
    return json(
      {
        ok: false,
        error: "catalog_reset_failed",
        message: catalogResetError.message ?? "Failed to reset catalog models.",
      },
      500
    );
  }
  if (catalogReset && typeof catalogReset === "object") {
    Object.entries(catalogReset).forEach(([table, deleted]) => {
      results.push({ table, deleted: Number(deleted) || 0 });
    });
  }

  for (const task of DELETE_TASKS) {
    const client = getAdminClient(task.schema);
    const { error, count } = await client
      .from(task.table)
      .delete({ count: "exact" })
      .not(task.filterColumn, "is", null);
    if (error) {
      if (task.optional && (isMissingRelation(error) || isSchemaNotAllowed(error))) {
        results.push({
          table: fullTableName(task),
          deleted: 0,
          skipped: true,
          reason: isSchemaNotAllowed(error) ? "schema_not_allowed" : "missing_relation",
        });
        continue;
      }
      return json(
        {
          ok: false,
          error: "delete_failed",
          table: fullTableName(task),
          message: error.message,
          code: error.code,
        },
        500,
      );
    }
    results.push({
      table: fullTableName(task),
      deleted: typeof count === "number" ? count : 0,
    });
  }

  return json({ ok: true, results }, 200);
}
