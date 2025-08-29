// src/pages/NotFound/index.tsx
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";

export default function NotFoundPage() {
  return (
    <>
      <Seo title="Страница не найдена" noindex />
      <section className="container mx-auto max-w-3xl py-16 text-center space-y-4">
        <h1 className="text-4xl font-extrabold">404</h1>
        <p className="opacity-80">Такой страницы нет.</p>
        <Link to="/" className="underline">На главную</Link>
      </section>
    </>
  );
}

















