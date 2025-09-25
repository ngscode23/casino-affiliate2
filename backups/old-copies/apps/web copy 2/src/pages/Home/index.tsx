// src/pages/Home/index.tsx
import { Suspense, lazy } from "react";
import { Navigate } from "react-router-dom";
import { useAuthState } from "@shared/lib/authStore";

// Render shop homepage on "/". Casino page remains at "/affiliate".
const ShopHome = lazy(() => import("@web/ecom/pages/Home"));

export default function Home() {
  const { user } = useAuthState();

  if (user?.role?.toLowerCase() === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <Suspense fallback={null}>
      <ShopHome />
    </Suspense>
  );
}


