import ReviewForm from "@ui/components/ReviewForm";

export default function ProductPage() {
  // Placeholder example page; use a real UUID from DB when wiring this view.
  const productId = "00000000-0000-0000-0000-000000000000"; // string UUID expected
  return (
    <div>
      <h1>Пример товара</h1>
      <ReviewForm productId={productId} />
    </div>
  );
}

