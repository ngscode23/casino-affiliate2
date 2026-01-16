import { ProductEditorClient } from "../product-editor-client";

export const metadata = {
  title: "Admin | Edit SKU",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminProductEditPage({ params }: PageProps) {
  const { id } = await params;
  return <ProductEditorClient productId={id} />;
}
