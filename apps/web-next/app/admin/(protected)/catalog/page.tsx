import { redirect } from "next/navigation";

export const metadata = {
  title: "Каталог",
};

export default function AdminCatalogIndexPage() {
  redirect("/admin/catalog/categories");
}

