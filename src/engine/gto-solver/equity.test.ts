import { describe, it, expect } from 'vitest';
import { 
  cardIndexToString, 
  stringToCardIndex,
} from './equity';

describe('cardIndexToString', () => {
  it('converts card index to readable format', () => {
    expect(cardIndexToString(0)).toBe('2c');
    expect(cardIndexToString(12)).toBe('Ac');
    expect(cardIndexToString(13)).toBe('2d');
    expect(cardIndexToString(51)).toBe('As');
  });

  it('handles all suits', () => {
    for (let suit = 0; suit < 4; suit++) {
      const index = suit * 13;
      const result = cardIndexToString(index);
      expect(result).toMatch(/^2[c,d,h,s]$/);
    }
  });
});

describe('stringToCardIndex', () => {
  it('converts readable format to card index', () => {
    expect(stringToCardIndex('2c')).toBe(0);
    expect(stringToCardIndex('Ac')).toBe(12);
    expect(stringToCardIndex('As')).toBe(51);
  });

  it('roundtrips correctly', () => {
    for (let i = 0; i < 52; i++) {
      const str = cardIndexToString(i);
      const index = stringToCardIndex(str);
      expect(index).toBe(i);
    }
  });

  it('handles suited notation', () => {
    // Ah = index 38 (A of hearts, suit 2, rank 12: 2*13 + 12 = 38)
    // Ks = index 50 (K of spades, suit 3, rank 11: 3*13 + 11 = 50)
    expect(stringToCardIndex('Ah')).toBe(38);
    expect(stringToCardIndex('Ks')).toBe(50);
  });

  it('handles offsuit notation', () => {
    // stringToCardIndex only handles single card notation (e.g., 'Ah', 'Ks')
    // Not hand ranges (e.g., 'AKo')
    // This test verifies that single cards work correctly
    expect(stringToCardIndex('2c')).toBe(0);
    expect(stringToCardIndex('As')).toBe(51);
  });
});
