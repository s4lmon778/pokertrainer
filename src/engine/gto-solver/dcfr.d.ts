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
import type { DCFRModule, Node } from './types';
/**
 * Precompute discount factors for the given iteration.
 * These follow shark-2.0's formulas:
 * - α = √(t-1) / (√(t-1) + 1) — for regret accumulation
 * - β = 0.5 — constant
 * - γ = t² / (t+1)² — for strategy averaging
 */
export declare function precomputeDiscounts(t: number): void;
/**
 * Get current discount factors.
 */
export declare function getDiscountFactors(): {
    alpha: number;
    beta: number;
    gamma: number;
};
/**
 * Encode signed float array to int16 for memory compression.
 * Mirrors shark-2.0's encode_signed_slice function.
 */
export declare function encodeSignedSlice(src: number[]): {
    data: Int16Array;
    scale: number;
};
/**
 * Decode int16 back to float with discount factors.
 * Mirrors shark-2.0's decode_with_discount function.
 */
export declare function decodeWithDiscount(compressed: number, scale: number, posDiscount: number, negDiscount: number): number;
/**
 * Regret matching strategy computation.
 * Converts cumulative regrets to strategy probabilities.
 */
export declare function regretMatching(regrets: number[]): number[];
/**
 * DCFR Module implementation.
 * Maintains cumulative regrets and computes strategies.
 */
export declare class DCFRImpl implements DCFRModule {
    private numHands;
    private numActions;
    private cummulativeRegret;
    private cummulativeStrategy;
    private currentStrategy;
    constructor(numHands: number, numActions: number);
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
    updateRegrets(actionUtils: number[], cfReachProb: number, iteration: number): void;
    /**
     * Get average strategy over all iterations.
     * Normalizes cumulative strategy weights into a probability distribution.
     */
    getAverageStrategy(): number[];
    /**
     * Get current strategy based on regret matching.
     */
    getCurrentStrategy(): number[];
    /**
     * Reset cumulative strategy for new solve.
     */
    resetCumulativeStrategy(): void;
}
/**
 * Create a DCFR module for a given number of actions.
 */
export declare function createDCFRModule(numActions: number): DCFRModule;
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
export declare function cfrTraversal(node: Node, heroReachProb: number, villainReachProb: number, iteration: number, depth?: number): {
    heroUtility: number;
    villainUtility: number;
};
/**
 * Run full DCFR solve on the game tree.
 *
 * @param root - Root node of the game tree
 * @param iterations - Number of DCFR iterations to run
 * @param minExploitability - Optional early stopping threshold
 * @param onProgress - Optional progress callback
 */
export declare function solveDCFR(root: Node, iterations?: number, minExploitability?: number, onProgress?: (iteration: number, exploitability: number) => void): {
    exploitability: number;
    timeMs: number;
};
//# sourceMappingURL=dcfr.d.ts.map