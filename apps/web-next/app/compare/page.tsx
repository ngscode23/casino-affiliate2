import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { ProductData } from "@/app/products/[slug]/data";
import { fetchProduct } from "@/app/products/[slug]/data";
import { mutedTextSm } from "@/styles/classnames";

type SearchParams = Record<string, string | string[] | undefined>;

type SpecFieldId = "display" | "memory" | "storage" | "battery" | "chip" | "camera" | "weight";

type SpecFieldConfig = {
  id: SpecFieldId;
  label: string;
  keys: string[];
};

const SPEC_FIELDS: SpecFieldConfig[] = [
  {
    id: "display",
    label: "Экран / диагональ",
    keys: ["display", "screen", "диагональ", "экран"],
  },
  {
    id: "memory",
    label: "Оперативная память",
    keys: ["ram", "memory", "оперативная", "оперативная память"],
  },
  {
    id: "storage",
    label: "Встроенная память",
    keys: ["storage", "drive", "ssd", "емкость памяти", "память", "хранилище"],
  },
  {
    id: "battery",
    label: "Батарея",
    keys: ["battery", "аккумулятор", "емкость батареи", "аккумуляторная батарея"],
  },
  {
    id: "chip",
    label: "Процессор",
    keys: ["chip", "processor", "cpu", "процессор"],
  },
  {
    id: "camera",
    label: "Камеры",
    keys: ["camera", "камера"],
  },
  {
    id: "weight",
    label: "Вес",
    keys: ["weight", "вес"],
  },
];

type CompareViewProduct = ProductData & {
  keySpecs: Record<SpecFieldId, string | null>;
};

type CompareRow = {
  id: string;
  label: string;
  render: (product: CompareViewProduct) => ReactNode;
};

export const metadata: Metadata = {
  title: "Сравнение товаров — Neon Shop",
  description:
    "Сравните по ключевым характеристикам (экран, память, батарея и другие параметры), чтобы выбрать лучший товар в Neon Shop.",
  alternates: {
    canonical: "/compare",
  },
};

function parseSetParam(raw: string | string[] | undefined, limit = 4): string[] {
  const value = Array.isArray(raw) ? raw[0] : raw ?? "";
  return Array.from(
    new Set(
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ).slice(0, limit);
}

function extractSpecValue(product: ProductData, keys: string[]): string | null {
  if (!product?.specs && !product?.techSpecs) {
    return null;
  }

  const normalizedKeys = keys.map((key) => key.toLowerCase());

  // 1) Пытаемся найти в attributes (основные характеристики)
  for (const row of product.specs?.attributes ?? []) {
    const name = row.key?.toLowerCase() ?? "";
    if (!name) continue;
    if (normalizedKeys.some((needle) => name.includes(needle))) {
      const value = row.value?.trim();
      if (value) return value;
    }
  }

  // 2) Пытаемся найти в techSpecs (структурированные характеристики)
  for (const section of product.techSpecs?.sections ?? []) {
    for (const row of section.rows) {
      const name = row.name.toLowerCase();
      if (!name) continue;
      if (normalizedKeys.some((needle) => name.includes(needle))) {
        const value = row.value?.trim();
        if (value) return value;
      }
    }
  }

  return null;
}

function buildKeySpecs(product: ProductData): Record<SpecFieldId, string | null> {
  const specs: Record<SpecFieldId, string | null> = {
    display: null,
    memory: null,
    storage: null,
    battery: null,
    chip: null,
    camera: null,
    weight: null,
  };

  for (const field of SPEC_FIELDS) {
    specs[field.id] = extractSpecValue(product, field.keys);
  }

  return specs;
}

async function loadCompareProducts(rawSearchParams: SearchParams): Promise<CompareViewProduct[]> {
  const slugs = parseSetParam(rawSearchParams.set);
  if (!slugs.length) return [];

  const products = await Promise.all(slugs.map((slug) => fetchProduct(slug)));
  const resolved = (products.filter(Boolean) as ProductData[]).filter(
    (product) => product.status === "published",
  );

  return resolved.map((product) => ({
    ...product,
    keySpecs: buildKeySpecs(product),
  }));
}

function buildRows(products: CompareViewProduct[]): CompareRow[] {
  const rows: CompareRow[] = [];

  rows.push({
    id: "summary",
    label: "Краткое описание",
    render: (product) => {
      const description =
        product.shortDescription ||
        product.description ||
        product.specs.highlights[0] ||
        null;
      return description ? (
        <p className="text-sm text-fg/90">{description}</p>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      );
    },
  });

  rows.push({
    id: "price",
    label: "Цена",
    render: (product) => (
      <div className="text-sm font-semibold text-fg">{product.formattedPrice}</div>
    ),
  });

  rows.push({
    id: "availability",
    label: "Наличие",
    render: (product) => {
      const rawStatus = (product.status ?? "").toLowerCase();
      let label = "В наличии";
      if (
        rawStatus === "preorder" ||
        rawStatus === "pre-order" ||
        rawStatus === "pre_order" ||
        rawStatus === "coming_soon"
      ) {
        label = "Предзаказ";
      } else if (
        rawStatus === "out_of_stock" ||
        rawStatus === "unavailable" ||
        rawStatus === "sold_out" ||
        rawStatus === "inactive" ||
        rawStatus === "archived" ||
        rawStatus === "disabled"
      ) {
        label = "Нет в наличии";
      }
      return <span className="text-sm text-fg/90">{label}</span>;
    },
  });

  rows.push({
    id: "brand",
    label: "Бренд",
    render: (product) => (
      <span className="text-sm text-fg/90">{product.brand || "—"}</span>
    ),
  });

  for (const field of SPEC_FIELDS) {
    rows.push({
      id: field.id,
      label: field.label,
      render: (product) => {
        const value = product.keySpecs[field.id];
        return (
          <span className="text-sm text-fg/90">
            {value || "—"}
          </span>
        );
      },
    });
  }

  rows.push({
    id: "shipping",
    label: "Доставка",
    render: (product) => (
      <span className="text-sm text-fg/90">
        {product.shippingEstimate || "2–4 дня"}
      </span>
    ),
  });

  rows.push({
    id: "highlights",
    label: "Особенности",
    render: (product) => {
      if (!product.specs.highlights.length) {
        return <span className="text-sm text-muted-foreground">—</span>;
      }
      return (
        <ul className="space-y-1 text-sm text-fg/90">
          {product.specs.highlights.slice(0, 4).map((item, index) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      );
    },
  });

  rows.push({
    id: "inTheBox",
    label: "Комплектация",
    render: (product) => {
      if (!product.specs.inTheBox.length) {
        return <span className="text-sm text-muted-foreground">—</span>;
      }
      return (
        <ul className="space-y-1 text-sm text-fg/90">
          {product.specs.inTheBox.slice(0, 4).map((item, index) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      );
    },
  });

  rows.push({
    id: "warranty",
    label: "Гарантия",
    render: (product) => {
      if (!product.specs.warranty.length) {
        return <span className="text-sm text-muted-foreground">—</span>;
      }
      return (
        <ul className="space-y-1 text-sm text-fg/90">
          {product.specs.warranty.slice(0, 3).map((item, index) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      );
    },
  });

  return rows;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await (searchParams ?? Promise.resolve({}))) ?? {};
  const products = await loadCompareProducts(resolvedSearchParams);

  const hasProducts = products.length > 0;

  return (
    <div className="bg-background">
      <main className="mx-auto max-w-screen-xl space-y-8 px-6 py-10 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-fg sm:text-4xl">
            Сравнение товаров
          </h1>
          <p className={mutedTextSm}>
            Добавьте до четырёх товаров и сравните их по ключевым характеристикам:
            экран, память, батарея и другие параметры.
          </p>
        </header>

        {!hasProducts ? (
          <section className="rounded-3xl border border-border/50 bg-card/70 p-6 text-center shadow-soft sm:p-10">
            <p className="text-lg font-medium text-fg">
              Вы ещё не выбрали товары для сравнения.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Откройте каталог и нажмите кнопку «Сравнить» на карточке товара — выбранные позиции
              появятся в панели внизу экрана, откуда можно перейти на эту страницу.
            </p>
            <div className="mt-5 flex justify-center">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full border border-primary/70 bg-primary px-6 py-2.5 text-sm font-semibold text-primaryfg transition hover:-translate-y-px hover:bg-primary/90"
              >
                Перейти в каталог
              </Link>
            </div>
          </section>
        ) : (
          <section className="space-y-4 rounded-3xl border border-border/50 bg-card/70 p-4 shadow-soft sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-x-0 border-spacing-y-0 text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="w-40 px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                      Характеристика
                    </th>
                    {products.map((product) => (
                      <th
                        key={product.id}
                        className="min-w-[220px] px-3 py-3 text-left align-bottom"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-muted/40">
                            {/** Ensure Next/Image gets a non-null source */}
                            {(() => {
                              const imageSrc = product.mainImage || product.fallbackImage || "/logo.png";
                              return (
                                <Image
                                  src={imageSrc}
                                  alt={product.title}
                                  fill
                                  sizes="56px"
                                  className="object-cover"
                                />
                              );
                            })()}
                          </div>
                          <div className="space-y-1">
                            <Link
                              href={`/products/${product.slug}`}
                              className="text-sm font-semibold text-fg hover:underline"
                            >
                              {product.title}
                            </Link>
                            {product.brand ? (
                              <p className="text-xs text-muted-foreground">{product.brand}</p>
                            ) : null}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buildRows(products).map((row) => (
                    <tr key={row.id} className="border-t border-border/30">
                      <th className="w-40 bg-card px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                        {row.label}
                      </th>
                      {products.map((product) => (
                        <td
                          key={`${row.id}-${product.id}`}
                          className="px-3 py-3 align-top"
                        >
                          {row.render(product)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
