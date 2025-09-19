import { Link, useLocation } from "react-router-dom";
import Seo from "@/components/Seo";

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  const items = [
    { name: "Главная", url: "/" },
    ...parts.map((p, i) => {
      const url = "/" + parts.slice(0, i + 1).join("/");
      return { name: decodeURIComponent(p), url };
    }),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${location.origin}${it.url}`,
    })),
  };

  return (
    <>
      <Seo jsonLd={jsonLd} />
      <nav aria-label="Хлебные крошки" className="text-sm opacity-80">
        {items.map((it, i) => (
          <span key={it.url}>
            {i > 0 && <span className="mx-1">/</span>}
            {i === items.length - 1 ? (
              <span aria-current="page">{it.name}</span>
            ) : (
              <Link to={it.url} className="underline hover:no-underline">{it.name}</Link>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}