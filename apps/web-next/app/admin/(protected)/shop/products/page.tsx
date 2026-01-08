import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin | Legacy products",
};

export default function AdminProductsPage() {
  redirect("/admin/catalog");
}
