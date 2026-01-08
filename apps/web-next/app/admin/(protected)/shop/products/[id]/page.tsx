import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin | Legacy products",
};

export default function AdminProductEditPage() {
  redirect("/admin/catalog");
}
