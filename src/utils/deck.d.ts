import type { Card, Rank } from '../types/card';
export declare function createDeck(): Card[];
export declare function shuffleDeck(deck: Card[]): Card[];
export declare function cardRankValue(rank: Rank): number;
export declare function isSuited(cards: Card[]): boolean;
export declare function isConnected(cards: Card[], gap?: number): boolean;
export declare function getPairValue(cards: Card[]): number | null;
//# sourceMappingURL=deck.d.ts.map