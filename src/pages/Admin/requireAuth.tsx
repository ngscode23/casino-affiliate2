import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Section from "@/components/common/section";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const unsub = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      setOk(!!session);
      setLoading(false);
    });
    // initial check:
    supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
      setOk(!!data.session);
      setLoading(false);
    });
    return () => { unsub.data.subscription.unsubscribe(); };
  }, []);

  if (loading) {
    return (
      <Section className="p-6">
        <div>Checking auth.</div>
      </Section>
    );
  }
  if (!ok) {
    return <Navigate to={`/admin/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  }
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user as any;
        const role = user?.user_metadata?.role || user?.app_metadata?.role;
        if (!cancelled) setOk(!!user && role === 'admin');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Section className="p-6">
        <div>Checking admin access.</div>
      </Section>
    );
  }
  if (!ok) {
    // redirect non-admins to home (or show 403 page)
    return <Navigate to={`/`} replace state={{ from: loc }} />;
  }
  return <>{children}</>;
}
