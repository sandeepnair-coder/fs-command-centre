export const POSITION_GAP = 1000;

/**
 * Compute the position for an item inserted between two neighbors.
 * - Both null → first item at 0
 * - before is null → inserting at start: after / 2
 * - after is null → inserting at end: before + POSITION_GAP
 * - Both present → midpoint
 */
export function getInsertPosition(
  before: number | null,
  after: number | null
): number {
  if (before == null && after == null) return 0;
  if (before == null) return after! / 2;
  if (after == null) return before + POSITION_GAP;
  return (before + after) / 2;
}

/**
 * Returns true when adjacent positions are too close (< 0.001 apart),
 * indicating a full rebalance is needed to avoid float precision issues.
 */
export function needsRebalance(positions: number[]): boolean {
  if (positions.length < 2) return false;
  const sorted = [...positions].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] < 0.001) return true;
  }
  return false;
}

/**
 * Returns an array of `count` evenly-spaced positions starting at 0.
 */
export function rebalance(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i * POSITION_GAP);
}
