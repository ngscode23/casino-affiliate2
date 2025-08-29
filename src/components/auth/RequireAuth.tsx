//src/components/auth/RequireAuth.tsx
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getUser } from "@/lib/auth";

type Props = { children: React.ReactNode };

export default function RequireAuth({ children }: Props) {
  const [pending, setPending] = useState(true);
  const [authed, setAuthed] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await getUser();
        if (mounted) {
          setAuthed(!!user);
          setPending(false);
        }
      } catch {
        if (mounted) {
          setAuthed(false);
          setPending(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (pending) return null; // или спиннер

  if (!authed) {
    return <Navigate to="/auth/login" replace state={{ from: loc }} />;
  }

  return <>{children}</>;
}