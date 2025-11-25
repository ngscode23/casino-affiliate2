import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f7f7f7] to-[#efefef]">
      <div className="text-center bg-white/80 backdrop-blur rounded-xl p-10 shadow">
        <h1 className="text-5xl font-extrabold mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">Oops! Page not found</p>
        <Link to="/" className="inline-flex items-center justify-center rounded-md bg-brand px-5 py-2 text-white font-semibold shadow hover:opacity-95">
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
