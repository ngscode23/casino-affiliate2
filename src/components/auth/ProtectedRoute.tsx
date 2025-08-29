// src/components/auth/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";

type Props = {
  children: React.ReactElement;
};

export default function ProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const user = await getUser();
        if (alive) setAuthed(!!user);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return null; // можно поставить спиннер

  if (!authed) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }
  return children;
}