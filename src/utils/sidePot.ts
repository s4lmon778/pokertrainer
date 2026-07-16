import type { Player, SidePot } from '../types/card';
import { evaluateHand } from './handEvaluator';
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
  winners: { playerId: string; amount: number }[];
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
export function calculateSidePots(
  allPlayers: Player[],
  communityCards: Card[],
): SidePotResult {
  // Include ALL players who contributed to the pot (including folded — their money is dead)
  const allContributors = allPlayers.filter(p => p.totalHandBet > 0);
  const nonFolded = allContributors.filter(p => !p.folded);
  const sortedByBet = [...allContributors].sort((a, b) => a.totalHandBet - b.totalHandBet);

  const pots: CalculatedPot[] = [];
  let prevAmount = 0;

  for (const p of sortedByBet) {
    const contribution = p.totalHandBet - prevAmount;
    if (contribution > 0) {
      // ALL players who contributed at least this much (including folded — their money is in the pot)
      const allAtLevel = allContributors.filter(pl => pl.totalHandBet >= p.totalHandBet);
      // Only non-folded players are eligible to win
      const eligible = nonFolded.filter(pl => pl.totalHandBet >= p.totalHandBet);
      pots.push({ amount: contribution * allAtLevel.length, eligiblePlayers: eligible });
    }
    prevAmount = p.totalHandBet;
  }

  // Evaluate each pot and distribute
  const distributions: PotDistribution = {};
  const potDescriptions: string[] = [];

  for (const pot of pots) {
    const evals = pot.eligiblePlayers.map(p => ({
      player: p,
      ...evaluateHand(p.hand, communityCards),
    }));
    evals.sort((a, b) => b.score - a.score);
    const bestScore = evals[0].score;
    const potWinners = evals.filter(e => e.score === bestScore);
    const share = Math.floor(pot.amount / potWinners.length);

    for (const w of potWinners) {
      distributions[w.player.id] = (distributions[w.player.id] || 0) + share;
    }
    // Remainder chips go to first winner
    const remainder = pot.amount - share * potWinners.length;
    if (remainder > 0 && potWinners.length > 0) {
      distributions[potWinners[0].player.id] += remainder;
    }

    if (potWinners.length > 0) {
      const wName = potWinners[0].player.id === 'human' ? 'You' : potWinners[0].player.name;
      if (potWinners.length > 1) {
        potDescriptions.push(`Split pot (${potWinners.length} ways): ${wName} + others`);
      } else {
        potDescriptions.push(`${wName}: ${potWinners[0].description}`);
      }
    }
  }

  // Build winner entries
  const allWinners: { playerId: string; amount: number }[] = [];
  for (const [pid, amt] of Object.entries(distributions)) {
    if (amt > 0) allWinners.push({ playerId: pid, amount: amt });
  }

  // Build side pot display
  const sidePots: SidePot[] = pots.map(pot => ({
    amount: pot.amount,
    eligiblePlayerIds: pot.eligiblePlayers.map(p => p.id),
  }));

  // Pick primary winner for display (won the most)
  const primaryWinnerId = nonFolded.reduce((best, p) => {
    const bestAmount = distributions[best] || 0;
    const pAmount = distributions[p.id] || 0;
    return pAmount > bestAmount ? p.id : best;
  }, nonFolded[0]?.id || '');

  return {
    pots,
    distribution: distributions,
    winners: allWinners,
    sidePots,
    potDescriptions,
    primaryWinnerId,
  };
}
