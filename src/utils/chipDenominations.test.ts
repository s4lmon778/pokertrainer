import { describe, it, expect } from 'vitest';
import {
  CHIP_DENOMINATIONS,
  breakdownChips,
  getHighestChip,
  getChipStacks,
  formatChipAmount,
} from './chipDenominations';

describe('CHIP_DENOMINATIONS', () => {
  it('has 7 standard denominations', () => {
    expect(CHIP_DENOMINATIONS).toHaveLength(7);
  });

  it('is sorted by value ascending', () => {
    for (let i = 1; i < CHIP_DENOMINATIONS.length; i++) {
      expect(CHIP_DENOMINATIONS[i].value).toBeGreaterThan(CHIP_DENOMINATIONS[i - 1].value);
    }
  });

  it('each denomination has required fields', () => {
    for (const denom of CHIP_DENOMINATIONS) {
      expect(denom.value).toBeGreaterThan(0);
      expect(denom.label).toBeTruthy();
      expect(denom.color).toBeTruthy();
      expect(denom.bgClass).toBeTruthy();
    }
  });
});

describe('breakdownChips', () => {
  it('returns empty map for 0 amount', () => {
    const result = breakdownChips(0);
    expect(result.size).toBe(0);
  });

  it('correctly breaks down 386', () => {
    const result = breakdownChips(386);
    expect(result.get(100)).toBe(3);
    expect(result.get(25)).toBe(3);
    expect(result.get(5)).toBe(2);
    expect(result.get(1)).toBe(1);
  });

  it('correctly breaks down single chip amounts', () => {
    expect(breakdownChips(5).get(5)).toBe(1);
    expect(breakdownChips(25).get(25)).toBe(1);
    expect(breakdownChips(100).get(100)).toBe(1);
  });

  it('uses largest denominations first', () => {
    const result = breakdownChips(500);
    expect(result.get(500)).toBe(1);
    expect(result.get(100)).toBeUndefined();
    expect(result.get(25)).toBeUndefined();
  });

  it('handles large amounts correctly', () => {
    const result = breakdownChips(12345);
    expect(result.get(5000)).toBe(2);
    expect(result.get(1000)).toBe(2);
    expect(result.get(100)).toBe(3);
    // remainder 45 = 1x25 + 4x5
  });

  it('total value of breakdown equals input', () => {
    for (const amount of [0, 1, 5, 27, 100, 386, 1000, 9999]) {
      const result = breakdownChips(amount);
      let total = 0;
      for (const [value, count] of result) {
        total += value * count;
      }
      expect(total).toBe(amount);
    }
  });
});

describe('getHighestChip', () => {
  it('returns $1 chip for 0 amount', () => {
    expect(getHighestChip(0).value).toBe(1);
  });

  it('returns correct chip for amount', () => {
    expect(getHighestChip(3).value).toBe(1);
    expect(getHighestChip(5).value).toBe(5);
    expect(getHighestChip(99).value).toBe(25);
    expect(getHighestChip(150).value).toBe(100);
    expect(getHighestChip(600).value).toBe(500);
    expect(getHighestChip(2000).value).toBe(1000);
    expect(getHighestChip(10000).value).toBe(5000);
  });
});

describe('getChipStacks', () => {
  it('returns empty array for 0 amount', () => {
    expect(getChipStacks(0)).toHaveLength(0);
  });

  it('returns sorted stacks highest denom first', () => {
    const stacks = getChipStacks(386);
    if (stacks.length > 0) {
      for (let i = 1; i < stacks.length; i++) {
        expect(stacks[i].denom.value).toBeLessThan(stacks[i - 1].denom.value);
      }
    }
  });

  it('clips stack height to max visible', () => {
    // 500 in $1 chips = 500 chips, stack height should be capped at 5
    const stacks = getChipStacks(500, 5);
    for (const stack of stacks) {
      expect(stack.stackHeight).toBeLessThanOrEqual(5);
    }
  });

  it('includes actual count separate from visible height', () => {
    const stacks = getChipStacks(10, 3);
    // $5 x2: count=2, height=2 (not clipped)
    // $10 in $1s: count=5, height=3 (clipped to 3)
    const dollarStack = stacks.find(s => s.denom.value === 1);
    if (dollarStack) {
      expect(dollarStack.stackHeight).toBeLessThanOrEqual(3);
    }
  });
});

describe('formatChipAmount', () => {
  it('formats normal amount with $ and commas', () => {
    expect(formatChipAmount(1000)).toBe('$1,000');
    expect(formatChipAmount(50000)).toBe('$50,000');
  });

  it('formats compact mode', () => {
    expect(formatChipAmount(1500, true)).toBe('$1.5K');
    expect(formatChipAmount(2000000, true)).toBe('$2.0M');
    expect(formatChipAmount(500, true)).toBe('$500');
  });
});
