/**
 * GTO Solver Core Types
 * 
 * Type definitions for the Discounted CFR poker solver.
 * Mirrors shark-2.0's node structure but adapted for TypeScript/browser execution.
 */

// Card encoding: 0-51 (standard poker card indices)
export type CardIndex = number;

// Action types for the solver
export type ActionKind = 'CHECK' | 'BET' | 'FOLD' | 'CALL' | 'RAISE';

export interface Action {
  kind: ActionKind;
  size?: number; // Fraction of pot for bet/raise (e.g., 0.5 = half pot)
}

// Node types in the game tree
export type NodeType = 'ACTION' | 'CHANCE' | 'TERMINAL';

export interface ActionNode {
  type: 'ACTION';
  player: 0 | 1; // 0 = hero, 1 = villain
  actions: Action[];
  children: Node[];
  dcfr?: DCFRModule; // Training module for regret matching
}

export interface ChanceNode {
  type: 'CHANCE';
  children: Node[]; // One per possible deal card
  dealtCard?: CardIndex;
  dealtCards?: CardIndex[]; // Parallel to children — which card each branch corresponds to
}

export interface TerminalNode {
  type: 'TERMINAL';
  payoff: [number, number]; // [hero payoff, villain payoff]
  lastToAct: 0 | 1;
  potSize: number;
}

export type Node = ActionNode | ChanceNode | TerminalNode;

// DCFR training module (mirrors shark-2.0's DCFR.hh)
export interface DCFRModule {
  updateRegrets(actionUtils: number[], reachProb: number, iteration: number): void;
  getAverageStrategy(): number[];
  getCurrentStrategy(): number[];
  resetCumulativeStrategy(): void;
}

// Solver configuration
export interface SolverConfig {
  stackSize: number;
  potSize: number;
  minBet: number;
  allInThreshold: number;
  iterations: number;
  minExploitability: number;
  threadCount: number; // For future parallelization
  raiseCap: number; // Max raises per street
  removeDonkBets: boolean;
}

// Bet sizing config with preflop support
export const BET_SIZING = {
  preflop: { bets: [0.5, 1.0], raises: [1.0] },
  flop: { bets: [0.5, 1.0], raises: [1.0] },
  turn: { bets: [0.33, 0.66, 1.0], raises: [0.5, 1.0] },
  river: { bets: [0.33, 0.66, 1.0], raises: [0.5, 1.0] },
} as const;

// Web Worker message types
export interface SolveRequest {
  type: 'SOLVE';
  board: CardIndex[];
  heroRange: number[];
  villainRange: number[];
  stackSize: number;
  potSize: number;
  iterations: number;
}

export interface SolveProgress {
  type: 'PROGRESS';
  iteration: number;
  total: number;
  exploitability: number;
}

export interface SolveComplete {
  type: 'COMPLETE';
  result: SolveResult;
  timeMs: number;
}

export interface SolveError {
  type: 'ERROR';
  error: string;
}

export type WorkerMessage = SolveRequest;
export type WorkerResponse = SolveProgress | SolveComplete | SolveError;

// Street types
export type Street = 'flop' | 'turn' | 'river';

// Range representation (1326 x 1326 matrix for preflop)
export type RangeMatrix = boolean[][]; // [heroHand][villainHand]

// Solve result
export interface SolveResult {
  root: Node;
  iterations: number;
  exploitability: number;
  strategy: Map<string, number[]>; // infoSetKey → strategy probabilities
  solveTimeMs: number;
}
