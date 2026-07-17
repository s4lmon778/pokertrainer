import { describe, it, expect } from 'vitest';
import { 
  regretMatching, 
  encodeSignedSlice, 
  decodeWithDiscount,
  precomputeDiscounts,
  getDiscountFactors,
  DCFRImpl,
  createDCFRModule
} from './dcfr';
import type { DCFRModule } from './types';

describe('regretMatching', () => {
  it('returns uniform distribution when all regrets are zero', () => {
    const result = regretMatching([0, 0, 0]);
    expect(result).toEqual([1/3, 1/3, 1/3]);
  });

  it('returns uniform distribution when all regrets are negative', () => {
    const result = regretMatching([-1, -2, -3]);
    expect(result).toEqual([1/3, 1/3, 1/3]);
  });

  it('converts positive regrets to probabilities', () => {
    const result = regretMatching([1, 2, 3]);
    expect(result).toEqual([1/6, 2/6, 3/6]);
  });

  it('ignores negative regrets', () => {
    const result = regretMatching([1, -1, 2]);
    expect(result).toEqual([1/3, 0, 2/3]);
  });

  it('handles mixed positive and zero', () => {
    const result = regretMatching([0, 1, 0]);
    expect(result).toEqual([0, 1, 0]);
  });
});

describe('encodeSignedSlice', () => {
  it('encodes and decodes accurately', () => {
    const input = [0.1, -0.2, 0.3, -0.4, 0.5];
    const { data, scale } = encodeSignedSlice(input);
    
    // Decode back
    const decoded = Array.from(data).map(val => decodeWithDiscount(val, scale, 1, 1));
    
    expect(decoded).toHaveLength(input.length);
    for (let i = 0; i < input.length; i++) {
      expect(Math.abs(decoded[i] - input[i])).toBeLessThan(0.01);
    }
  });

  it('handles all zeros', () => {
    const { data, scale } = encodeSignedSlice([0, 0, 0]);
    expect(scale).toBe(1);
    expect(Array.from(data)).toEqual([0, 0, 0]);
  });

  it('handles single value', () => {
    const { data } = encodeSignedSlice([0.5]);
    expect(data.length).toBe(1);
    expect(data[0]).toBeGreaterThan(0);
  });
});

describe('decodeWithDiscount', () => {
  it('applies positive discount correctly', () => {
    const result = decodeWithDiscount(1000, 10, 1, 1);
    expect(result).toBeCloseTo(1000 * 10 / 32767, 2);
  });

  it('applies negative discount correctly', () => {
    const result = decodeWithDiscount(-1000, 10, 1, 1);
    expect(result).toBeCloseTo(-1000 * 10 / 32767, 2);
  });

  it('handles zero', () => {
    const result = decodeWithDiscount(0, 10, 0.5, 0.5);
    expect(result).toBe(0);
  });
});

describe('precomputeDiscounts', () => {
  it('computes valid discount factors', () => {
    precomputeDiscounts(10);
    const { alpha, beta, gamma } = getDiscountFactors();
    
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(alpha).toBeLessThanOrEqual(1);
    expect(beta).toBe(0.5);
    expect(gamma).toBeGreaterThanOrEqual(0);
    expect(gamma).toBeLessThanOrEqual(1);
  });

  it('increases alpha with iterations', () => {
    precomputeDiscounts(1);
    const alpha1 = getDiscountFactors().alpha;
    
    precomputeDiscounts(100);
    const alpha100 = getDiscountFactors().alpha;
    
    expect(alpha100).toBeGreaterThan(alpha1);
  });
});

describe('DCFRImpl', () => {
  it('initializes with uniform strategy', () => {
    const module = new DCFRImpl(1, 3);
    const strategy = module.getCurrentStrategy();
    expect(strategy).toEqual([1/3, 1/3, 1/3]);
  });

  it('updates regrets and changes strategy', () => {
    const module = new DCFRImpl(1, 2);
    precomputeDiscounts(1);
    
    // Apply some regret
    module.updateRegrets([1, 0], 1.0, 1);
    
    const strategy = module.getCurrentStrategy();
    expect(strategy[0]).toBeGreaterThan(strategy[1]);
  });

  it('resets cumulative strategy', () => {
    const module = new DCFRImpl(1, 2);
    module.updateRegrets([1, 0], 1.0, 1);
    module.resetCumulativeStrategy();
    
    const strategy = module.getCurrentStrategy();
    expect(strategy).toEqual([0.5, 0.5]);
  });
});

describe('createDCFRModule', () => {
  it('creates module with correct action count', () => {
    const module = createDCFRModule(5);
    const strategy = module.getCurrentStrategy();
    expect(strategy).toHaveLength(5);
    expect(strategy.every(s => Math.abs(s - 0.2) < 0.001)).toBe(true);
  });
});
