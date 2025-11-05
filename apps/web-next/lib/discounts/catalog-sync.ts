import { revalidateTag } from "next/cache";
import { getAdminClient } from "@/utils/supabase/admin";

type AssignmentLike = {
  scope?: string | null;
  refId?: string | null;
};

const PRODUCT_COLLECTION_TAG = "products:list";
const PRODUCT_TAG_PREFIX = "product:";
const CATEGORY_TAG_PREFIX = "category:";

export async function refreshCatalogAfterDiscountChange(
  assignments?: AssignmentLike[] | null
): Promise<void> {
  const admin = getAdminClient();

  try {
    await admin.rpc("sync_catalog_published");
  } catch (error) {
    console.error("[catalog] sync_catalog_published failed", error);
  }

  try {
    revalidateTag(PRODUCT_COLLECTION_TAG, "max");
  } catch (error) {
    console.error("[catalog] revalidateTag(products:list) failed", error);
  }

  const productIds = new Set<string>();
  const categorySlugs = new Set<string>();

  for (const assignment of assignments ?? []) {
    if (!assignment) continue;
    if (assignment.scope === "PRODUCT" && assignment.refId) {
      productIds.add(assignment.refId);
    }
    if (assignment.scope === "CATEGORY" && assignment.refId) {
      categorySlugs.add(assignment.refId);
    }
  }

  if (productIds.size > 0) {
    try {
      const { data, error } = await admin
        .from("products")
        .select("id, slug, category_slug")
        .in("id", Array.from(productIds));

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          if (row?.slug) {
            try {
              revalidateTag(`${PRODUCT_TAG_PREFIX}${row.slug}`, "max");
            } catch (revalidateError) {
              console.error(`[catalog] revalidateTag(product:${row.slug}) failed`, revalidateError);
            }
          }
          if (row?.category_slug) {
            categorySlugs.add(String(row.category_slug));
          }
        }
      } else if (error) {
        console.error("[catalog] failed to load product slugs for revalidation", error);
      }
    } catch (error) {
      console.error("[catalog] revalidate product tags failed", error);
    }
  }

  for (const category of categorySlugs) {
    if (!category) continue;
    try {
      revalidateTag(`${CATEGORY_TAG_PREFIX}${category}`, "max");
    } catch (error) {
      console.error(`[catalog] revalidateTag(category:${category}) failed`, error);
    }
  }
}
