import raw from "./casinos.json";
import { OfferSchema, type Offer } from "./schema";

export const casinos: Offer[] = (raw as unknown[]).map((item, i) => {
  const parsed = OfferSchema.safeParse(item);
  if (!parsed.success) {
    console.error("Invalid offer at index", i, parsed.error.issues);
    return null;
  }
  return parsed.data;
}).filter(Boolean) as Offer[];

// 👇 Добавь, если хочешь, чтобы старый импорт не ломался
export type { Offer } from "./schema";




















