import type { VerticalConfig } from "./types";

// Placeholder config for a different vertical. Uses same labels to avoid copy changes.
export const hostingVertical: VerticalConfig = {
  key: "hosting",
  branding: {
    primary: "#3B82F6", // using existing brand token color
    primaryFg: "#FFFFFF",
  },
  disclosures: {
    footer: 'verticals.hosting.disclosures.footer',
    card: 'verticals.hosting.disclosures.card',
  },
  list: {
    visibleFields: ["rating", "methods", "payout"],
    pills: ["methods"],
    cta: { labelKey: "offer.cta" },
  },
  compare: {
    columns: ["rating", "payoutHours", "methods"],
    defaultSort: { key: "rating", dir: "desc" },
  },
  filters: [
    { key: "q", type: "text" },
  ],
};

export default hostingVertical;

