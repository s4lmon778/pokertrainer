import type { Card, Player, GamePhase } from '../types/card';
/**
 * Compute preflop raw equity (0-1) from hole cards using heuristics.
 * Used when community cards haven't been dealt yet and full hand evaluation
 * returns score 0 for fewer than 5 cards.
 */
export declare function computePreflopEquity(holeCards: Card[], opponentCount: number): number;
/**
 * Compute win probability (0-1) for a player given current game state.
 */
export declare function computeEquity(player: Player, communityCards: Card[], currentPhase: GamePhase, activeOpponents: number): number;
/**
 * Compute action-specific win rate percentages for display.
 */
export interface ActionWinRates {
    fold: number;
    checkCall: number;
    raise: number;
    allIn: number;
}
export declare function computeActionWinRates(player: Player, communityCards: Card[], currentPhase: GamePhase, currentBet: number, pot: number, activeOpponents?: number): ActionWinRates;
/** Shared color classifier for win rate percentages */
export declare function winRateColor(pct: number): 'green' | 'yellow' | 'red';
/** Tailwind classes for win rate text color */
export declare function winRateTextClass(pct: number): string;
/** Tailwind classes for win rate background/border */
export declare function winRateBgClass(pct: number): string;
//# sourceMappingURL=equity.d.ts.map