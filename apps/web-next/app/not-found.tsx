"use client";

import Link from "next/link";


export default function NotFound() {
  return (
    <>
      <section className="container mx-auto max-w-3xl space-y-4 py-16 text-center">
        <h1 className="text-4xl font-extrabold">404</h1>
        <p className="text-neutral-600">Такой страницы нет.</p>
        <Link href="/" className="text-sm font-medium underline">
          На главную
        </Link>
      </section>
    </>
  );
}


