// src/pages/Home/index.tsx
import { Suspense, lazy } from "react";

// Render shop homepage on "/". Casino page remains at "/affiliate".
const ShopHome = lazy(() => import("@/ecom/pages/Home"));

export default function Home() {
  return (
    <Suspense fallback={null}>
      <ShopHome />
    </Suspense>
  );
}

