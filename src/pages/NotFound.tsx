// src/pages/NotFound.tsx
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="neon-container">
      <div className="neon-card p-6">
        <h1 className="text-2xl font-bold mb-2">404 — Страница не найдена</h1>
        <p className="text-[var(--text-dim)]">Такого маршрута нет. Проверь URL или вернись на главную.</p>
        <div className="mt-4">
          <Link to="/" className="neon-btn">На главную</Link>
        </div>
      </div>
    </section>
  );
}




















