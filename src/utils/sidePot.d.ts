import type { Player, SidePot } from '../types/card';
import type { Card } from '../types/card';
/**
 * A single side pot with its amount and eligible players.
 * Eligible players are those who contributed enough to compete for this pot.
 */
export interface CalculatedPot {
    amount: number;
    eligiblePlayers: Player[];
}
/**
 * Distribution of pot winnings across player IDs.
 */
export interface PotDistribution {
    [playerId: string]: number;
}
/**
 * Result of resolving all side pots and distributing winnings.
 */
export interface SidePotResult {
    /** All calculated side pots (including the main pot) */
    pots: CalculatedPot[];
    /** Total chips each player wins */
    distribution: PotDistribution;
    /** Winners list for display */
    winners: {
        playerId: string;
        amount: number;
    }[];
    /** Side pots formatted for the UI */
    sidePots: SidePot[];
    /** Human-readable pot descriptions for the action log */
    potDescriptions: string[];
    /** The player who won the most (primary winner for display) */
    primaryWinnerId: string;
}
/**
 * Calculate side pots from player contributions and determine winners.
 *
 * This is a pure function — given players and community cards, it computes
 * all side pots, distributes winnings, and returns results without mutating
 * any state. The caller is responsible for applying the results.
 *
 * Side pot algorithm:
 * 1. Sort all contributing players by their total hand bet (ascending)
 * 2. For each contribution level, create a pot with:
 *    - Amount = (this level - previous level) × number of players at this level or higher
 *    - Eligible players = non-folded players who contributed at least this much
 * 3. For each pot, evaluate hands and split among winners (odd chips to first winner)
 *
 * @param allPlayers - All players in the hand (including folded)
 * @param communityCards - The 5 community cards
 * @returns SidePotResult with pots, distribution, winners, and descriptions
 *
 * TODO: Add Training Bot decision-quality scoring per pot (did the bot make +EV decisions?)
 * TODO: Track expected-value-per-pot for bot performance analysis
 * TODO: Store pot-resolution snapshots for session replay/analysis
 */
export declare function calculateSidePots(allPlayers: Player[], communityCards: Card[]): SidePotResult;
//# sourceMappingURL=sidePot.d.ts.map