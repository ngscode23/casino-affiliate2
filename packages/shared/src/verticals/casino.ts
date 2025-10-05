import type { VerticalConfig } from "./types";

export const casinoVertical: VerticalConfig = {
  key: "casino",
  branding: {
    primary: "#3B82F6",
    primaryFg: "#FFFFFF",
  },
  disclosures: {
    footer: 'verticals.casino.disclosures.footer',
    card: 'verticals.casino.disclosures.card',
  },
  list: {
    visibleFields: ["license", "payout", "methods", "rating"],
    pills: ["license", "methods"],
    cta: { labelKey: "offer.cta" },
  },
  compare: {
    columns: ["rating", "license", "payoutHours", "methods"],
    defaultSort: { key: "rating", dir: "desc" },
  },
  filters: [
    { key: "q", type: "text" },
    { key: "license", type: "enum" },
  ],
};

export default casinoVertical;

