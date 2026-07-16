import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, cardRankValue, isSuited, isConnected, getPairValue } from './deck';
import type { Card } from '../types/card';

describe('createDeck', () => {
  it('creates a 52-card deck', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
  });

  it('has all unique cards', () => {
    const deck = createDeck();
    const ids = new Set(deck.map(c => c.id));
    expect(ids.size).toBe(52);
  });

  it('has 13 ranks x 4 suits', () => {
    const deck = createDeck();
    const suits = new Set(deck.map(c => c.suit));
    const ranks = new Set(deck.map(c => c.rank));
    expect(suits.size).toBe(4);
    expect(ranks.size).toBe(13);
  });
});

describe('shuffleDeck', () => {
  it('returns a deck with same cards', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(52);
    const originalIds = new Set(deck.map(c => c.id));
    const shuffledIds = new Set(shuffled.map(c => c.id));
    expect(shuffledIds).toEqual(originalIds);
  });

  it('does not mutate the original deck', () => {
    const deck = createDeck();
    const originalOrder = [...deck.map(c => c.id)];
    shuffleDeck(deck);
    expect(deck.map(c => c.id)).toEqual(originalOrder);
  });

  it('typically reorders cards (probabilistic)', () => {
    const deck = createDeck();
    // Run 100 shuffles — at least 90 should differ from original order
    let differentCount = 0;
    for (let i = 0; i < 100; i++) {
      const shuffled = shuffleDeck(deck);
      const isDifferent = shuffled.some((c, idx) => c.id !== deck[idx].id);
      if (isDifferent) differentCount++;
    }
    expect(differentCount).toBeGreaterThanOrEqual(90);
  });
});

describe('cardRankValue', () => {
  it('maps ranks to correct values', () => {
    expect(cardRankValue('2')).toBe(2);
    expect(cardRankValue('3')).toBe(3);
    expect(cardRankValue('10')).toBe(10);
    expect(cardRankValue('J')).toBe(11);
    expect(cardRankValue('Q')).toBe(12);
    expect(cardRankValue('K')).toBe(13);
    expect(cardRankValue('A')).toBe(14);
  });
});

describe('isSuited', () => {
  it('returns true for same-suit cards', () => {
    const cards: Card[] = [
      { suit: 'hearts', rank: 'A', id: 'A-hearts' },
      { suit: 'hearts', rank: 'K', id: 'K-hearts' },
    ];
    expect(isSuited(cards)).toBe(true);
  });

  it('returns false for different-suit cards', () => {
    const cards: Card[] = [
      { suit: 'hearts', rank: 'A', id: 'A-hearts' },
      { suit: 'spades', rank: 'K', id: 'K-spades' },
    ];
    expect(isSuited(cards)).toBe(false);
  });

  it('returns false for fewer than 2 cards', () => {
    expect(isSuited([])).toBe(false);
    expect(isSuited([{ suit: 'hearts', rank: 'A', id: 'A-hearts' }])).toBe(false);
  });
});

describe('isConnected', () => {
  it('returns true for consecutive ranks', () => {
    const cards: Card[] = [
      { suit: 'hearts', rank: 'A', id: 'A-h' },
      { suit: 'spades', rank: 'K', id: 'K-s' },
    ];
    expect(isConnected(cards)).toBe(true);
  });

  it('returns true for one-gap with gap=2', () => {
    const cards: Card[] = [
      { suit: 'hearts', rank: 'A', id: 'A-h' },
      { suit: 'spades', rank: 'Q', id: 'Q-s' },
    ];
    expect(isConnected(cards, 2)).toBe(true);
  });

  it('returns false for disconnected cards', () => {
    const cards: Card[] = [
      { suit: 'hearts', rank: 'A', id: 'A-h' },
      { suit: 'spades', rank: '7', id: '7-s' },
    ];
    expect(isConnected(cards)).toBe(false);
  });
});

describe('getPairValue', () => {
  it('returns pair rank value if pair exists', () => {
    const cards: Card[] = [
      { suit: 'hearts', rank: 'K', id: 'K-h' },
      { suit: 'spades', rank: 'K', id: 'K-s' },
      { suit: 'diamonds', rank: 'A', id: 'A-d' },
    ];
    expect(getPairValue(cards)).toBe(13);
  });

  it('returns null if no pair', () => {
    const cards: Card[] = [
      { suit: 'hearts', rank: 'A', id: 'A-h' },
      { suit: 'spades', rank: 'K', id: 'K-s' },
    ];
    expect(getPairValue(cards)).toBeNull();
  });
});
