export default async () => {
  const safe = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: !!process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ? "(set)" : "(missing)"
  };

  console.log("[debug-env]", {
    SUPABASE_URL: process.env.SUPABASE_URL,
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    SUPABASE_SECRET_KEY: safe.SUPABASE_SECRET_KEY
  });

  return new Response(JSON.stringify(safe, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
