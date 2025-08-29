// netlify/functions/go.ts
import type { Handler } from "@netlify/functions";
import { offers } from "../../src/data/offers";
const map: Record<string, string> = {
  skyspin:  "https://partner.example/skyspin?utm_source=casinowatch&utm_medium=aff",
  novawin:  "https://partner.example/novawin?utm_source=casinowatch&utm_medium=aff",
  rapidpay: "https://partner.example/rapidpay?utm_source=casinowatch&utm_medium=aff",
};

// 302 на внешний партнёрский URL + базовая разметка UTM
export const handler: Handler = async (event) => {
  const slug = (event.queryStringParameters?.slug || "").toLowerCase();
  const ref = event.headers.referer || "";

  const found = offers.find(
    (o) => (o.slug || "").toLowerCase() === slug
  );

  const fallback = "https://google.com/"; // на всякий случай
  const target = found?.link || fallback;

  const url = new URL(target);
  url.searchParams.set("utm_source", "casinowatch");
  url.searchParams.set("utm_medium", "affiliate");
  if (ref) url.searchParams.set("utm_ref", ref);

  return {
    statusCode: 302,
    headers: {
      Location: url.toString(),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer-when-downgrade",
    },
  };
};