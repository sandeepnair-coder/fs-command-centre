import type { RateCardTier, TierPrice } from "@/lib/types/rate-card";

export function roundPrice(value: number): number {
  return Math.round(value);
}

export function computeTierPrice(
  baseInr: number,
  multiplier: number,
  fxRate: number
): number {
  if (multiplier === 1.0) return baseInr;
  return roundPrice((baseInr * multiplier) / fxRate);
}

export function computeFloor(listPrice: number, floorPercent: number): number {
  return roundPrice(listPrice * (floorPercent / 100));
}

export function computeAllTierPrices(
  baseInr: number,
  floorPercent: number,
  tiers: RateCardTier[],
  fxRate: number
): TierPrice[] {
  return tiers.map((tier) => {
    const list = computeTierPrice(baseInr, tier.multiplier, fxRate);
    return {
      tier_key: tier.tier_key,
      tier_name: tier.name,
      currency: tier.currency,
      symbol: tier.symbol,
      list,
      floor: computeFloor(list, floorPercent),
    };
  });
}
