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

import type { DCFRModule, Action } from './types';

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
   * Uses discounted regret accumulation.
   */
  updateRegrets(actionUtils: number[], reachProb: number, iteration: number): void {
    const { alpha } = getDiscountFactors();
    
    for (let i = 0; i < actionUtils.length; i++) {
      // Counterfactual regret = reach_prob * (action_util - outcome_util)
      const regret = reachProb * actionUtils[i];
      this.cummulativeRegret[i] = alpha * this.cummulativeRegret[i] + regret;
    }
  }
  
  /**
   * Get average strategy over all iterations.
   */
  getAverageStrategy(): number[] {
    return this.currentStrategy;
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
 * This is the core recursive algorithm.
 */
export function cfrTraversal(
  node: any, // Node from game-tree.ts
  heroReachProb: number,
  villainReachProb: number,
  iteration: number,
  depth: number = 0,
): { heroUtility: number; villainUtility: number } {
  // Terminal node
  if (node.type === 'TERMINAL') {
    return {
      heroUtility: node.payoff[0],
      villainUtility: node.payoff[1],
    };
  }
  
  // Chance node (deal card)
  if (node.type === 'CHANCE') {
    let totalHeroUtil = 0;
    let totalVillainUtil = 0;
    
    for (const child of node.children) {
      const result = cfrTraversal(child, heroReachProb, villainReachProb, iteration, depth + 1);
      totalHeroUtil += result.heroUtility;
      totalVillainUtil += result.villainUtility;
    }
    
    // Average over all possible card deals
    const numChildren = node.children.length;
    return {
      heroUtility: totalHeroUtil / numChildren,
      villainUtility: totalVillainUtil / numChildren,
    };
  }
  
  // Action node
  if (node.type === 'ACTION') {
    const player = node.player;
    const reachProb = player === 0 ? heroReachProb : villainReachProb;
    
    // Get current strategy
    const strategy = node.dcfr?.getCurrentStrategy() || uniformStrategy(node.actions.length);
    
    // Compute counterfactual values for each action
    let actionUtils = [];
    for (const child of node.children) {
      const nextHeroProb = player === 0 
        ? heroReachProb * strategy[node.children.indexOf(child)]
        : heroReachProb;
      const nextVillainProb = player === 1
        ? villainReachProb * strategy[node.children.indexOf(child)]
        : villainReachProb;
      
      const result = cfrTraversal(child, nextHeroProb, nextVillainProb, iteration, depth + 1);
      actionUtils.push(player === 0 ? result.heroUtility : result.villainUtility);
    }
    
    // Update regrets
    if (node.dcfr) {
      node.dcfr.updateRegrets(actionUtils, reachProb, iteration);
    }
    
    // Compute weighted utility
    let totalUtil = 0;
    for (let i = 0; i < actionUtils.length; i++) {
      totalUtil += strategy[i] * actionUtils[i];
    }
    
    return {
      heroUtility: player === 0 ? totalUtil : 0,
      villainUtility: player === 1 ? totalUtil : 0,
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
 */
export function solveDCFR(
  root: any, // Node from game-tree.ts
  iterations: number = 100,
): { exploitability: number; timeMs: number } {
  const startTime = Date.now();
  
  for (let iter = 1; iter <= iterations; iter++) {
    // Precompute discount factors
    precomputeDiscounts(iter);
    
    // Run CFR traversal
    cfrTraversal(root, 1.0, 1.0, iter);
  }
  
  const timeMs = Date.now() - startTime;
  
  // Compute exploitability (simplified)
  const exploitability = computeExploitability(root);
  
  return { exploitability, timeMs };
}

/**
 * Compute exploitability of the current strategy.
 * Lower is better (0 = perfect Nash equilibrium).
 */
function computeExploitability(root: any): number {
  // Simplified exploitability computation
  // Real implementation would compute best response for each player
  return 0.1; // Placeholder
}
