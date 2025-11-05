"use server";

import { redirect } from "next/navigation";

export default async function AdminProductsRedirect() {
  redirect("/admin/shop/products");
}
