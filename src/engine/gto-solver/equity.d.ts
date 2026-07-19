/**
 * Hand Equity Calculator
 *
 * Computes hand equity for terminal node payoffs using monte carlo sampling.
 * Integrates with the existing handEvaluator.ts for hand strength evaluation.
 */
import type { Card } from '../../types/card';
/**
 * Convert card index (0-51) to Card object.
 */
export declare function cardIndexToCard(card: number): Card;
/**
 * Convert card index to readable string.
 */
export declare function cardIndexToString(card: number): string;
/**
 * Convert readable format to card index.
 */
export declare function stringToCardIndex(str: string): number;
/**
 * Get all possible hands for a player given board and remaining cards.
 * Uses monte carlo sampling for efficiency.
 */
export declare function sampleOpponentHands(board: number[], ownHand: number[], sampleSize?: number): number[][];
/**
 * Compute hand equity for a given board and hero hand.
 * Samples opponent hands and computes win/tie percentages.
 */
export declare function computeHandEquity(board: number[], heroHand: number[], sampleSize?: number): {
    winRate: number;
    tieRate: number;
    equity: number;
};
/**
 * Compute terminal payoff for a showdown.
 * Returns [hero_payoff, villain_payoff] in chips.
 */
export declare function computeShowdownPayoff(board: number[], heroHand: number[], villainHand: number[], potSize: number): [number, number];
/**
 * Estimate equity for a hand against a range.
 * Used during solving to approximate terminal values.
 */
export declare function estimateEquityAgainstRange(hand: number[], board: number[], range: boolean[], // 1326-element range array
samples?: number): number;
//# sourceMappingURL=equity.d.ts.map