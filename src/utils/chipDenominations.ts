/**
 * Realistic poker chip denominations and visualization helpers.
 *
 * Standard cash-game denominations:
 *   $1  — White
 *   $5  — Red
 *   $25 — Green
 *   $100 — Black
 *   $500 — Purple
 *   $1000 — Yellow/Orange
 *   $5000 — Gray/Brown
 *
 * Color-coding follows common casino standards for consistency.
 */

export interface ChipDenomination {
  value: number;
  label: string;
  color: string;
  bgClass: string;
  borderColor: string;
  textColor: string;
}

export const CHIP_DENOMINATIONS: ChipDenomination[] = [
  { value: 1,    label: '$1',    color: '#f8fafc', bgClass: 'bg-gradient-to-br from-slate-100 via-white to-slate-300',    borderColor: '#cbd5e1', textColor: '#334155' },
  { value: 5,    label: '$5',    color: '#ef4444', bgClass: 'bg-gradient-to-br from-red-400 via-red-500 to-red-700',       borderColor: '#b91c1c', textColor: '#fef2f2' },
  { value: 25,   label: '$25',   color: '#22c55e', bgClass: 'bg-gradient-to-br from-green-400 via-green-500 to-green-700',  borderColor: '#15803d', textColor: '#f0fdf4' },
  { value: 100,  label: '$100',  color: '#1e293b', bgClass: 'bg-gradient-to-br from-slate-500 via-slate-700 to-slate-900', borderColor: '#0f172a', textColor: '#f1f5f9' },
  { value: 500,  label: '$500',  color: '#7c3aed', bgClass: 'bg-gradient-to-br from-violet-400 via-violet-500 to-violet-700', borderColor: '#5b21b6', textColor: '#f5f3ff' },
  { value: 1000, label: '$1K',   color: '#f59e0b', bgClass: 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600',  borderColor: '#b45309', textColor: '#451a03' },
  { value: 5000, label: '$5K',   color: '#78716c', bgClass: 'bg-gradient-to-br from-stone-300 via-stone-400 to-stone-600',  borderColor: '#44403c', textColor: '#1c1917' },
];

/**
 * Break down a chip amount into the minimum number of physical chips.
 * Uses a greedy algorithm with the standard denominations.
 *
 * @param amount - Total chip amount to break down
 * @returns Map of denomination value → count
 *
 * @example
 * breakdownChips(386)
 * // => Map { 100 => 3, 25 => 3, 5 => 2, 1 => 1 }
 */
export function breakdownChips(amount: number): Map<number, number> {
  const result = new Map<number, number>();
  let remaining = amount;

  // Sort denominations descending for greedy algorithm
  const sorted = [...CHIP_DENOMINATIONS].sort((a, b) => b.value - a.value);

  for (const denom of sorted) {
    if (remaining <= 0) break;
    const count = Math.floor(remaining / denom.value);
    if (count > 0) {
      result.set(denom.value, count);
      remaining -= count * denom.value;
    }
  }

  return result;
}

/**
 * Get the highest denomination chip for a given amount.
 * Useful for displaying a representative chip in compact UIs.
 */
export function getHighestChip(amount: number): ChipDenomination {
  for (const denom of [...CHIP_DENOMINATIONS].sort((a, b) => b.value - a.value)) {
    if (amount >= denom.value) return denom;
  }
  return CHIP_DENOMINATIONS[0]; // $1 chip as fallback
}

/**
 * Calculate the number of visual chip stacks needed for an amount.
 *
 * @param amount - Total chip amount
 * @param chipsPerStack - Max chips shown per stack before overflow indicator
 * @returns Number of chip objects to render, each with a value
 */
export function getChipStacks(
  amount: number,
  chipsPerStack: number = 5,
): { denom: ChipDenomination; count: number; stackHeight: number }[] {
  const breakdown = breakdownChips(amount);
  const stacks: { denom: ChipDenomination; count: number; stackHeight: number }[] = [];

  for (const [value, count] of breakdown) {
    const denom = CHIP_DENOMINATIONS.find(d => d.value === value)!;
    // Each denomination gets its own stack, clipped to max visible height
    const visibleHeight = Math.min(count, chipsPerStack);
    stacks.push({ denom, count, stackHeight: visibleHeight });
  }

  // Sort highest denom first
  return stacks.sort((a, b) => b.denom.value - a.denom.value);
}

/**
 * Format a chip amount for display, e.g. "$1,250" or "1.2K" for compact mode.
 */
export function formatChipAmount(amount: number, compact: boolean = false): string {
  if (!compact) return `$${amount.toLocaleString()}`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount}`;
}
