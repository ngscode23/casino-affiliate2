// src/features/offers/api/types.ts
export type OfferDTO = {
  id: string;                // slug
  name: string;
  license: "MGA" | "UKGC" | "Curaçao" | "Other";
  rating?: number;
  payout?: string;
  payoutHours?: number;
  methods: string[];
  link?: string | null;
};


