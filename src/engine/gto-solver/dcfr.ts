/**
 * Discounted CFR (DCFR) Solver Core
 * 
 * Implements the Discounted Counterfactual Regret Minimization algorithm
 * based on shark-2.0's DCFR.hh implementation.
 * 
 * Key features:
 * - Discounted regret matching with α, β, γ parameters
 * - Strategy averaging with discount factors
 * - int16 compression for memory efficiency (optional)
 */

import type { DCFRModule, Action, Node } from './types';

// DCFR parameters (from shark-2.0 DCFR.hh)
let alpha = 0.0;
let beta = 0.5;
let gamma = 0.0;

/**
 * Precompute discount factors for the given iteration.
 * These follow shark-2.0's formulas:
 * - α = √(t-1) / (√(t-1) + 1) — for regret accumulation
 * - β = 0.5 — constant
 * - γ = t² / (t+1)² — for strategy averaging
 */
export function precomputeDiscounts(t: number): void {
  const tAlpha = Math.max(0, t - 1);
  const powAlpha = tAlpha * Math.sqrt(tAlpha);
  alpha = powAlpha / (powAlpha + 1);
  
  beta = 0.5;
  
  const tf = t;
  const ratio = tf / (tf + 1);
  gamma = ratio * ratio;
}

/**
 * Get current discount factors.
 */
export function getDiscountFactors() {
  return { alpha, beta, gamma };
}

/**
 * Encode signed float array to int16 for memory compression.
 * Mirrors shark-2.0's encode_signed_slice function.
 */
export function encodeSignedSlice(src: number[]): { data: Int16Array; scale: number } {
  let maxAbs = 0;
  for (const val of src) {
    const absVal = Math.abs(val);
    if (absVal > maxAbs) maxAbs = absVal;
  }
  
  const scale = maxAbs === 0 ? 1 : maxAbs;
  const encoder = 32767 / scale;
  
  const dst = new Int16Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const scaled = src[i] * encoder;
    const rounded = Math.round(scaled);
    const clamped = Math.max(-32768, Math.min(32767, rounded));
    dst[i] = clamped as Int16Array[number];
  }
  
  return { data: dst, scale };
}

/**
 * Decode int16 back to float with discount factors.
 * Mirrors shark-2.0's decode_with_discount function.
 */
export function decodeWithDiscount(compressed: number, scale: number, posDiscount: number, negDiscount: number): number {
  const discount = compressed >= 0 ? posDiscount : negDiscount;
  return compressed * discount * scale / 32767;
}

/**
 * Regret matching strategy computation.
 * Converts cumulative regrets to strategy probabilities.
 */
export function regretMatching(regrets: number[]): number[] {
  let sumPositive = 0;
  for (const r of regrets) {
    if (r > 0) sumPositive += r;
  }
  
  if (sumPositive === 0) {
    // Uniform strategy if no positive regret
    return new Array(regrets.length).fill(1 / regrets.length);
  }
  
  return regrets.map(r => Math.max(0, r) / sumPositive);
}

/**
 * DCFR Module implementation.
 * Maintains cumulative regrets and computes strategies.
 */
export class DCFRImpl implements DCFRModule {
  private numHands: number;
  private numActions: number;
  private cummulativeRegret: number[];
  private cummulativeStrategy: number[];
  private currentStrategy: number[];
  
  constructor(numHands: number, numActions: number) {
    this.numHands = numHands;
    this.numActions = numActions;
    this.cummulativeRegret = new Array(numActions).fill(0);
    this.cummulativeStrategy = new Array(numActions).fill(0);
    this.currentStrategy = new Array(numActions).fill(1 / numActions);
  }
  
  /**
   * Update regrets based on action utilities.
   *
   * Uses discounted regret accumulation with gamma (strategy discount factor)
   * for regret decay. Counterfactual regret = cf_reach_prob * (action_util - expected_util).
   *
   * @param actionUtils - Counterfactual values for each action
   * @param cfReachProb - Counterfactual reach probability (opponent's reach × chance)
   * @param iteration - Current DCFR iteration number
   */
  updateRegrets(actionUtils: number[], cfReachProb: number, iteration: number): void {
    const { gamma } = getDiscountFactors();

    // Compute expected utility from current strategy
    const strategy = regretMatching(this.cummulativeRegret);
    let expectedUtil = 0;
    for (let i = 0; i < actionUtils.length; i++) {
      expectedUtil += strategy[i] * actionUtils[i];
    }

    for (let i = 0; i < actionUtils.length; i++) {
      // Counterfactual regret: how much better/worse this action is vs expected
      const actionRegret = cfReachProb * (actionUtils[i] - expectedUtil);
      // Discount old regrets with gamma, add new regret
      this.cummulativeRegret[i] = gamma * this.cummulativeRegret[i] + actionRegret;
    }

    // Update average strategy accumulator
    for (let i = 0; i < strategy.length; i++) {
      this.cummulativeStrategy[i] += cfReachProb * strategy[i];
    }
  }
  
  /**
   * Get average strategy over all iterations.
   * Normalizes cumulative strategy weights into a probability distribution.
   */
  getAverageStrategy(): number[] {
    let totalWeight = 0;
    for (const w of this.cummulativeStrategy) {
      totalWeight += w;
    }

    if (totalWeight === 0) {
      // No data yet — return uniform
      return new Array(this.numActions).fill(1 / this.numActions);
    }

    const avg = new Array(this.numActions);
    for (let i = 0; i < this.numActions; i++) {
      avg[i] = this.cummulativeStrategy[i] / totalWeight;
    }
    return avg;
  }
  
  /**
   * Get current strategy based on regret matching.
   */
  getCurrentStrategy(): number[] {
    this.currentStrategy = regretMatching(this.cummulativeRegret);
    return this.currentStrategy;
  }
  
  /**
   * Reset cumulative strategy for new solve.
   */
  resetCumulativeStrategy(): void {
    this.cummulativeRegret = new Array(this.numActions).fill(0);
    this.cummulativeStrategy = new Array(this.numActions).fill(0);
    this.currentStrategy = new Array(this.numActions).fill(1 / this.numActions);
  }
}

/**
 * Create a DCFR module for a given number of actions.
 */
export function createDCFRModule(numActions: number): DCFRModule {
  return new DCFRImpl(1, numActions); // numHands=1 for single information set
}

/**
 * Run CFR traversal on the game tree.
 *
 * This is the core recursive algorithm. For each node:
 * - Terminal: return the payoff directly
 * - Chance: average over all possible outcomes (each equally likely)
 * - Action: compute counterfactual values for each action, update regrets,
 *   and return the expected value under the current strategy
 *
 * @param node - Root node of the (sub)tree to traverse
 * @param heroReachProb - Probability hero reaches this node given their strategy
 * @param villainReachProb - Probability villain reaches this node given their strategy
 * @param iteration - Current DCFR iteration number
 * @param depth - Current tree depth (for debugging)
 */
export function cfrTraversal(
  node: Node,
  heroReachProb: number,
  villainReachProb: number,
  iteration: number,
  depth: number = 0,
): { heroUtility: number; villainUtility: number } {
  // Terminal node — return payoff directly
  if (node.type === 'TERMINAL') {
    return {
      heroUtility: node.payoff[0],
      villainUtility: node.payoff[1],
    };
  }

  // Chance node — average over all possible card deals
  if (node.type === 'CHANCE') {
    const numChildren = node.children.length;
    if (numChildren === 0) {
      return { heroUtility: 0, villainUtility: 0 };
    }

    const chanceProb = 1.0 / numChildren;
    let totalHeroUtil = 0;
    let totalVillainUtil = 0;

    for (const child of node.children) {
      const nextHeroProb = heroReachProb * chanceProb;
      const nextVillainProb = villainReachProb * chanceProb;
      const result = cfrTraversal(child, nextHeroProb, nextVillainProb, iteration, depth + 1);
      totalHeroUtil += result.heroUtility;
      totalVillainUtil += result.villainUtility;
    }

    // Weighted average over all possible card deals
    return {
      heroUtility: totalHeroUtil / numChildren,
      villainUtility: totalVillainUtil / numChildren,
    };
  }

  // Action node — compute counterfactual values
  if (node.type === 'ACTION') {
    const player = node.player;
    const numActions = node.actions.length;

    // Get current strategy (regret-matching)
    const strategy = node.dcfr?.getCurrentStrategy() || uniformStrategy(numActions);

    // Compute counterfactual values for each action
    const actionUtils: number[] = new Array(numActions);
    for (let i = 0; i < numActions; i++) {
      const child = node.children[i];
      // Update reach probabilities: the acting player multiplies by their strategy probability
      const nextHeroProb = player === 0
        ? heroReachProb * strategy[i]
        : heroReachProb;
      const nextVillainProb = player === 1
        ? villainReachProb * strategy[i]
        : villainReachProb;

      const result = cfrTraversal(child, nextHeroProb, nextVillainProb, iteration, depth + 1);
      actionUtils[i] = player === 0 ? result.heroUtility : result.villainUtility;
    }

    // Update regrets with counterfactual reach probability
    // Counterfactual: opponent's reach prob (what reaches here regardless of our actions)
    if (node.dcfr) {
      const cfReachProb = player === 0 ? villainReachProb : heroReachProb;
      node.dcfr.updateRegrets(actionUtils, cfReachProb, iteration);
    }

    // Compute expected utility under current strategy
    let expectedUtil = 0;
    for (let i = 0; i < numActions; i++) {
      expectedUtil += strategy[i] * actionUtils[i];
    }

    return {
      heroUtility: player === 0 ? expectedUtil : 0,
      villainUtility: player === 1 ? expectedUtil : 0,
    };
  }

  return { heroUtility: 0, villainUtility: 0 };
}

/**
 * Create uniform strategy.
 */
function uniformStrategy(numActions: number): number[] {
  return new Array(numActions).fill(1 / numActions);
}

/**
 * Run full DCFR solve on the game tree.
 *
 * @param root - Root node of the game tree
 * @param iterations - Number of DCFR iterations to run
 * @param minExploitability - Optional early stopping threshold
 * @param onProgress - Optional progress callback
 */
export function solveDCFR(
  root: Node,
  iterations: number = 100,
  minExploitability?: number,
  onProgress?: (iteration: number, exploitability: number) => void,
): { exploitability: number; timeMs: number } {
  const startTime = Date.now();

  for (let iter = 1; iter <= iterations; iter++) {
    // Precompute discount factors
    precomputeDiscounts(iter);

    // Run CFR traversal (both players start with reach prob 1.0)
    cfrTraversal(root, 1.0, 1.0, iter);

    // Report progress every 10 iterations or on final iteration
    if (onProgress && (iter % 10 === 0 || iter === iterations)) {
      const exploit = computeExploitability(root);
      onProgress(iter, exploit);

      // Early stopping if exploitability target reached
      if (minExploitability !== undefined && exploit <= minExploitability) {
        return { exploitability: exploit, timeMs: Date.now() - startTime };
      }
    }
  }

  const timeMs = Date.now() - startTime;
  const exploitability = computeExploitability(root);

  return { exploitability, timeMs };
}

/**
 * Compute exploitability of the current strategy.
 *
 * Performs a best-response computation: for each player, computes the value
 * of playing a best-response against the opponent's current average strategy.
 * Exploitability = (br_value_p0 - ev_p0 + br_value_p1 - ev_p1) / 2
 *
 * Lower values indicate closer convergence to Nash equilibrium (0 = perfect).
 *
 * @param root - Root node of the game tree with trained DCFR modules
 * @returns Exploitability in big blinds (or chips, depending on tree scale)
 */
function computeExploitability(root: Node): number {
  // Compute best-response values for each player
  const brValue0 = bestResponseValue(root, 0);
  const brValue1 = bestResponseValue(root, 1);

  // Compute current expected values under average strategies
  const ev0 = expectedValue(root, 0);
  const ev1 = expectedValue(root, 1);

  // Exploitability is the average gain from deviating to best response
  const exploit0 = Math.max(0, brValue0 - ev0);
  const exploit1 = Math.max(0, brValue1 - ev1);

  return (exploit0 + exploit1) / 2;
}

/**
 * Compute the best-response value for a given player.
 *
 * Traverses the tree assuming the responding player always picks the
 * highest-EV action, while the opponent plays their average strategy.
 */
function bestResponseValue(
  node: Node,
  respondingPlayer: 0 | 1,
): number {
  if (node.type === 'TERMINAL') {
    return respondingPlayer === 0 ? node.payoff[0] : node.payoff[1];
  }

  if (node.type === 'CHANCE') {
    const numChildren = node.children.length;
    if (numChildren === 0) return 0;
    let total = 0;
    for (const child of node.children) {
      total += bestResponseValue(child, respondingPlayer);
    }
    return total / numChildren;
  }

  if (node.type === 'ACTION') {
    const player = node.player;
    const numActions = node.actions.length;

    if (player === respondingPlayer) {
      // Responding player: pick the best action
      let bestVal = -Infinity;
      for (let i = 0; i < numActions; i++) {
        const val = bestResponseValue(node.children[i], respondingPlayer);
        if (val > bestVal) bestVal = val;
      }
      return bestVal;
    } else {
      // Opponent: use their average strategy
      const strategy = node.dcfr?.getAverageStrategy() || uniformStrategy(numActions);
      let expected = 0;
      for (let i = 0; i < numActions; i++) {
        expected += strategy[i] * bestResponseValue(node.children[i], respondingPlayer);
      }
      return expected;
    }
  }

  return 0;
}

/**
 * Compute expected value for a player under the current average strategies.
 */
function expectedValue(
  node: Node,
  playerIndex: 0 | 1,
): number {
  if (node.type === 'TERMINAL') {
    return playerIndex === 0 ? node.payoff[0] : node.payoff[1];
  }

  if (node.type === 'CHANCE') {
    const numChildren = node.children.length;
    if (numChildren === 0) return 0;
    let total = 0;
    for (const child of node.children) {
      total += expectedValue(child, playerIndex);
    }
    return total / numChildren;
  }

  if (node.type === 'ACTION') {
    const numActions = node.actions.length;
    const strategy = node.dcfr?.getAverageStrategy() || uniformStrategy(numActions);
    let ev = 0;
    for (let i = 0; i < numActions; i++) {
      ev += strategy[i] * expectedValue(node.children[i], playerIndex);
    }
    return ev;
  }

  return 0;
}
