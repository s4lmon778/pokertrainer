import type { Card, Suit, Rank } from '../types/card';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}-${suit}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function cardRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  };
  return values[rank];
}

export function isSuited(cards: Card[]): boolean {
  if (cards.length < 2) return false;
  return cards.every(c => c.suit === cards[0].suit);
}

export function isConnected(cards: Card[], gap = 1): boolean {
  if (cards.length < 2) return false;
  const values = cards.map(c => cardRankValue(c.rank)).sort((a, b) => a - b);
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i + 1] - values[i] > gap) return false;
  }
  return true;
}

export function getPairValue(cards: Card[]): number | null {
  const counts: Record<string, number> = {};
  for (const c of cards) {
    counts[c.rank] = (counts[c.rank] || 0) + 1;
  }
  for (const [rank, count] of Object.entries(counts)) {
    if (count >= 2) return cardRankValue(rank as Rank);
  }
  return null;
}
