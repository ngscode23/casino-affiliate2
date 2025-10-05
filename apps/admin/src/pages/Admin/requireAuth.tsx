import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Section from "@ui/components/common/section";
import { ensureSession, onAuthStateChange } from "@shared/lib/auth";
import { useAuthState } from "@shared/lib/authStore";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const { user } = useAuthState();
  const loc = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureSession();
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    const unsubscribe = onAuthStateChange(() => {
      if (!cancelled) {
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <Section className="p-6">
        <div>Checking auth.</div>
      </Section>
    );
  }
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  }
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const { user } = useAuthState();
  const loc = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureSession();
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    const unsubscribe = onAuthStateChange(() => {
      if (!cancelled) {
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <Section className="p-6">
        <div>Checking admin access.</div>
      </Section>
    );
  }
  if (!user || user.role !== "admin") {
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace state={{ from: loc }} />;
  }
  return <>{children}</>;
}

