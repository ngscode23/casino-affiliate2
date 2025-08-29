// файл: src/data/offers.ts  (или где у тебя лежит список offers)
export const offers = [
  // ...существующие элементы
  {
    slug: "lucky-star",
    name: "Lucky Star",
    rating: 4.2,
    payout: "1–2 дня",
    payoutHours: 36,
    license: "Curaçao",
    link: "https://partner.example/lucky-star",
    enabled: true,
    position: 10,
    methods: ["Cards", "Crypto"]
  },
  {
    slug: "golden-spin",
    name: "Golden Spin",
    rating: 4.5,
    payout: "до 48 ч",
    payoutHours: 48,
    license: "MGA",
    link: "https://partner.example/golden-spin",
    enabled: true,
    position: 11,
    methods: ["Cards", "SEPA"]
  },
  // ...
];