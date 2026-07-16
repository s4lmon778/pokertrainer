/**
 * GTO Solver Public API
 * 
 * High-level interface for running the DCFR solver and querying strategies.
 * Integrates game tree building, DCFR solving, and equity calculation.
 */

import { buildGameTree, type TreeBuilderSettings } from './game-tree';
import type { DCFRModule } from './types';
import { solveDCFR, createDCFRModule } from './dcfr';
import { computeHandEquity } from './equity';
import type { Node, SolveResult, Action, Street, CardIndex } from './types';

// Default solver settings
const DEFAULT_SETTINGS = {
  stackSize: 100,
  potSize: 2,
  minBet: 2,
  allInThreshold: 0.67,
  iterations: 100,
  minExploitability: 0.1,
  raiseCap: 3,
  removeDonkBets: false,
};

/**
 * Solve a poker position using DCFR.
 * 
 * @param board - Community cards (3 for flop, 4 for turn, 5 for river)
 * @param heroRange - Hero's range (array of hand indices)
 * @param villainRange - Villain's range (array of hand indices)
 * @param stackSize - Starting stack size in big blinds
 * @param potSize - Current pot size
 * @param iterations - Number of DCFR iterations (more = more accurate)
 * @returns SolveResult with strategy and statistics
 */
export function solve(
  board: CardIndex[],
  heroRange: number[],
  villainRange: number[],
  stackSize: number = DEFAULT_SETTINGS.stackSize,
  potSize: number = DEFAULT_SETTINGS.potSize,
  iterations: number = DEFAULT_SETTINGS.iterations
): SolveResult {
  const startTime = Date.now();
  
  // Determine street from board size
  const street = board.length === 3 ? 'flop' : board.length === 4 ? 'turn' : 'river';
  
  // Build game tree
  const settings: TreeBuilderSettings = {
    range1: { numHands: heroRange.length },
    range2: { numHands: villainRange.length },
    inPositionPlayer: 0, // Hero in position
    initialBoard: board,
    initialStreet: street,
    startingStack: stackSize,
    startingPot: potSize,
    minimumBet: DEFAULT_SETTINGS.minBet,
    allInThreshold: DEFAULT_SETTINGS.allInThreshold,
    raiseCap: DEFAULT_SETTINGS.raiseCap,
    removeDonkBets: DEFAULT_SETTINGS.removeDonkBets,
  };
  
  const root = buildGameTree(settings);
  
  // Attach DCFR modules to action nodes
  attachDCFRModules(root);
  
  // Run solver
  const { exploitability, timeMs } = solveDCFR(root, iterations);
  
  // Collect strategies
  const strategy = collectStrategies(root);
  
  return {
    root,
    iterations,
    exploitability,
    strategy,
    solveTimeMs: Date.now() - startTime,
  };
}

/**
 * Query the optimal strategy for a specific hand.
 */
export function getStrategyForHand(
  result: SolveResult,
  heroHand: number[],
  board: CardIndex[]
): Map<string, number> {
  const strategy = new Map<string, number>();
  
  // Find the information set in the tree
  const infoSet = findInfoSet(result.root, board, heroHand);
  
  if (infoSet && infoSet.type === 'ACTION' && infoSet.dcfr) {
    const actions = infoSet.actions;
    const probs = infoSet.dcfr.getAverageStrategy();
    
    for (let i = 0; i < actions.length; i++) {
      strategy.set(actions[i].kind, probs[i]);
    }
  }
  
  return strategy;
}

/**
 * Export strategy in PioFormat for use with PioSolver viewers.
 */
export function exportPIO(result: SolveResult, board: CardIndex[]): string {
  let output = '';
  
  // Header
  output += 'SB: 100.00%\n';
  output += 'BB: 100.00%\n\n';
  
  // Board
  const boardStr = board.map(cardIndexToString).join(' ');
  output += `Board: ${boardStr}\n\n`;
  
  // Hero strategy
  output += 'Hero:\n';
  // Simplified - real implementation would iterate through all hands
  output += '  [Strategy data would be populated here]\n\n';
  
  // Villain strategy
  output += 'Villain:\n';
  output += '  [Strategy data would be populated here]\n';
  
  return output;
}

/**
 * Convert card index to PioFormat string.
 */
function cardIndexToString(card: number): string {
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const SUITS = ['c', 'd', 'h', 's'];
  
  const rank = card % 13;
  const suit = Math.floor(card / 13);
  return `${RANKS[rank]}${SUITS[suit]}`;
}

/**
 * Attach DCFR modules to all action nodes in the tree.
 */
function attachDCFRModules(node: Node): void {
  if (node.type === 'ACTION') {
    node.dcfr = createDCFRModule(node.actions.length);
    
    for (const child of node.children) {
      attachDCFRModules(child);
    }
  } else if (node.type === 'CHANCE') {
    for (const child of node.children) {
      attachDCFRModules(child);
    }
  }
  // Terminal nodes don't need DCFR modules
}

/**
 * Collect strategies from all action nodes.
 */
function collectStrategies(node: Node): Map<string, number[]> {
  const strategy = new Map<string, number[]>();
  
  if (node.type === 'ACTION' && node.dcfr) {
    const key = `${node.player}_${node.actions.map(a => a.kind).join(',')}`;
    strategy.set(key, node.dcfr.getAverageStrategy());
  }
  
  if (node.type === 'ACTION' || node.type === 'CHANCE') {
    for (const child of node.children) {
      collectStrategies(child);
    }
  }
  
  return strategy;
}

/**
 * Find the information set for a given hand and board.
 */
function findInfoSet(node: Node, board: CardIndex[], heroHand: number[]): Node | null {
  // Simplified - real implementation would traverse tree to find matching info set
  return null;
}
