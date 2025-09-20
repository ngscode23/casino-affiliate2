// src/types/offer.ts
export type PaymentMethod =
  | "Cards" | "SEPA" | "Crypto" | "Paypal" | "Skrill"
  | string;
  
export type Offer = {
  slug?: string;
  name: string;
  rating: number;
  license: "MGA" | "Curaçao" | "UKGC" | "Other" | string;
  payout: string;
  payoutHours?: number;
  methods?: string[];
  payments?: string[];
  link?: string;
  enabled?: boolean;
  position?: number;
};

export type License = "MGA" | "UKGC" | "Curaçao" | "Other";

export type NormalizedOffer = {
  slug: string;
  name: string;
  license: License;
  rating: number;
  payout: string;
  payoutHours?: number;
  methods: string[];
  link?: string;        // обратите внимание: undefined, а не null
  enabled?: boolean;
  position?: number;
};

















