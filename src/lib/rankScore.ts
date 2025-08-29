import type { NormalizedOffer } from "@/types/offer";

function isStrongLicense(lic?: string) {
  if (!lic) return false;
  return /^(MGA|UKGC)$/i.test(lic.trim());
}
function isMediumLicense(lic?: string) {
  if (!lic) return false;
  return /curacao|curaçao|curaçao/i.test(lic.trim());
}

export function rankScore(o: NormalizedOffer | { rating?: number; payoutHours?: number; license?: string }): number {
  const r = typeof o.rating === "number" ? o.rating : 0; // 0..5
  const speed = typeof o.payoutHours === "number" ? Math.max(0, 72 - o.payoutHours) / 72 : 0.5; // 0..1
  const licRaw = typeof o.license === "string" ? o.license.trim() : "";
  const lic = isStrongLicense(licRaw) ? 1 : isMediumLicense(licRaw) ? 0.6 : 0.4;
  return (r / 5) * 0.6 + speed * 0.25 + lic * 0.15;
}