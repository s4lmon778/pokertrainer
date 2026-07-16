/**
 * Game Tree Builder
 * 
 * Constructs the poker game tree for the GTO solver.
 * Mirrors shark-2.0's GameTree.hh structure.
 */

import type { Node, ActionNode, ChanceNode, TerminalNode, Action, Street, DCFRModule, SolverConfig, RangeMatrix, SolveResult } from './types';
import { BET_SIZING } from './types';

// Tree statistics for monitoring
export interface TreeStatistics {
  totalActionNodes: number;
  flopActionNodes: number;
  turnActionNodes: number;
  riverActionNodes: number;
  chanceNodes: number;
  terminalNodes: number;
  p1NumHands: number;
  p2NumHands: number;
}

// Builder settings
export interface TreeBuilderSettings {
  range1: { numHands: number };
  range2: { numHands: number };
  inPositionPlayer: number;
  initialBoard: number[]; // Card indices
  initialStreet: Street;
  startingStack: number;
  startingPot: number;
  minimumBet: number;
  allInThreshold: number;
  raiseCap?: number;
  removeDonkBets?: boolean;
}

// Default settings
const DEFAULT_SETTINGS: Partial<TreeBuilderSettings> = {
  raiseCap: 3,
  removeDonkBets: false,
  allInThreshold: 0.67,
};

/**
 * Build the complete game tree starting from the given state.
 */
export function buildGameTree(settings: TreeBuilderSettings): Node {
  const merged = { ...DEFAULT_SETTINGS, ...settings } as TreeBuilderSettings;
  return buildRootNode(merged);
}

/**
 * Build the root node of the game tree.
 */
function buildRootNode(settings: TreeBuilderSettings): Node {
  const state = createInitialState(settings);
  return buildActionNode(null, state, settings);
}

/**
 * Create initial game state from settings.
 */
function createInitialState(settings: TreeBuilderSettings) {
  return {
    board: settings.initialBoard,
    street: settings.initialStreet,
    pot: settings.startingPot,
    stacks: [settings.startingStack, settings.startingStack] as [number, number],
    currentPlayer: (settings.inPositionPlayer === 0 ? 1 : 0) as 0 | 1, // Non-position acts first
    lastToAct: 0 as 0 | 1,
    currentBet: 0,
  };
}

/**
 * Build an action node with all legal actions.
 */
function buildActionNode(parent: Node | null, state: GameState, settings: TreeBuilderSettings): ActionNode {
  const node: ActionNode = {
    type: 'ACTION',
    player: state.currentPlayer,
    actions: [],
    children: [],
  };
  
  // Get legal actions based on street and game state
  const legalActions = getLegalActions(state, settings);
  
  for (const action of legalActions) {
    const nextState = applyAction(state, action, settings);
    const child = buildChildNode(node, nextState, action, settings);
    node.children.push(child);
    node.actions.push(action);
  }
  
  return node;
}

/**
 * Build the appropriate child node based on the action taken.
 */
function buildChildNode(parent: ActionNode, state: GameState, action: Action, settings: TreeBuilderSettings): Node {
  // Check if this leads to a terminal state
  if (isTerminalState(state)) {
    return buildTerminalNode(parent, state);
  }
  
  // Check if we need to deal a chance card (turn or river)
  if (state.street === 'flop' && action.kind === 'CHECK' && state.lastToAct === 0) {
    // Both players checked on flop, deal turn card
    return buildChanceNode(parent, state, 'turn', settings);
  }
  
  if (state.street === 'turn' && action.kind === 'CHECK' && state.lastToAct === 0) {
    // Both players checked on turn, deal river card
    return buildChanceNode(parent, state, 'river', settings);
  }
  
  // Continue with action nodes
  return buildActionNode(parent, state, settings);
}

/**
 * Build a chance node for dealing community cards.
 */
function buildChanceNode(parent: ActionNode, state: GameState, street: Street, settings: TreeBuilderSettings): ChanceNode {
  const node: ChanceNode = {
    type: 'CHANCE',
    children: [],
  };
  
  // Get available cards (not on board and not in hands)
  const availableCards = getAvailableCards(state.board);
  
  for (const card of availableCards) {
    const nextState = { ...state, board: [...state.board, card], street };
    const child = buildActionNode(node, nextState, settings);
    node.children.push(child);
  }
  
  return node;
}

/**
 * Build a terminal node with computed payoffs.
 */
function buildTerminalNode(parent: ActionNode, state: GameState): TerminalNode {
  // Compute payoffs based on last action and hand strengths
  // For now, use simplified payoff calculation
  const payoff = computeTerminalPayoff(state);
  
  return {
    type: 'TERMINAL',
    payoff,
    lastToAct: state.lastToAct,
    potSize: state.pot,
  };
}

/**
 * Get legal actions for the current player in the current state.
 */
function getLegalActions(state: GameState, settings: TreeBuilderSettings): Action[] {
  const actions: Action[] = [];
  
  // Always can check or fold (if facing a bet)
  if (state.currentBet === 0) {
    actions.push({ kind: 'CHECK' });
  } else {
    actions.push({ kind: 'FOLD' });
    actions.push({ kind: 'CALL' });
  }
  
  // Can bet/raise if has chips left
  const remainingChips = state.stacks[state.currentPlayer];
  if (remainingChips > 0) {
    const streetConfig = BET_SIZING[state.street];
    
    // Add bet sizes
    for (const size of streetConfig.bets) {
      const betAmount = Math.floor(state.pot * size);
      if (betAmount >= settings.minimumBet && betAmount <= remainingChips) {
        actions.push({ kind: 'BET', size });
      }
    }
    
    // Add raise sizes (only if facing a bet)
    if (state.currentBet > 0) {
      for (const raiseSize of streetConfig.raises) {
        const raiseAmount = Math.floor(state.currentBet * raiseSize);
        if (raiseAmount <= remainingChips) {
          actions.push({ kind: 'RAISE', size: raiseSize });
        }
      }
    }
  }
  
  return actions;
}

/**
 * Apply an action to the game state and return the new state.
 */
function applyAction(state: GameState, action: Action, settings: TreeBuilderSettings): GameState {
  const newState = { ...state };
  
  switch (action.kind) {
    case 'CHECK':
      newState.lastToAct = state.currentPlayer;
      break;
    case 'BET':
    case 'RAISE':
      const betAmount = action.size ? Math.floor(state.pot * action.size) : (state.minimumBet || 0);
      newState.stacks[state.currentPlayer] -= betAmount;
      newState.pot += betAmount;
      newState.currentBet = betAmount;
      newState.lastToAct = state.currentPlayer;
      break;
    case 'CALL':
      const callAmount = state.currentBet - 0; // Simplified
      newState.stacks[state.currentPlayer] -= callAmount;
      newState.pot += callAmount;
      break;
    case 'FOLD':
      // Terminal state - opponent wins
      break;
  }
  
  // Switch player
  newState.currentPlayer = newState.currentPlayer === 0 ? 1 : 0;
  
  return newState;
}

/**
 * Check if the current state is terminal (hand ended).
 */
function isTerminalState(state: GameState): boolean {
  // Check if any player folded
  // Check if all-in and no more cards to deal
  // Check if betting round is complete
  return false; // Simplified - real implementation needs more checks
}

/**
 * Compute terminal payoffs based on hand strengths.
 */
function computeTerminalPayoff(state: GameState): [number, number] {
  // This is a simplified version - real implementation needs hand evaluation
  // For now, return zero sum based on pot
  const halfPot = state.pot / 2;
  return [halfPot, -halfPot];
}

/**
 * Get available cards that haven't been dealt yet.
 */
function getAvailableCards(board: number[]): number[] {
  const available: number[] = [];
  for (let i = 0; i < 52; i++) {
    if (!board.includes(i)) {
      available.push(i);
    }
  }
  return available;
}

/**
 * Get tree statistics for monitoring.
 */
export function getTreeStats(node: Node, settings: TreeBuilderSettings): TreeStatistics {
  const stats: TreeStatistics = {
    totalActionNodes: 0,
    flopActionNodes: 0,
    turnActionNodes: 0,
    riverActionNodes: 0,
    chanceNodes: 0,
    terminalNodes: 0,
    p1NumHands: settings.range1.numHands,
    p2NumHands: settings.range2.numHands,
  };
  
  countNodes(node, stats, settings.initialStreet);
  
  return stats;
}

/**
 * Recursively count nodes in the tree.
 */
function countNodes(node: Node, stats: TreeStatistics, rootStreet: Street): void {
  if (node.type === 'ACTION') {
    stats.totalActionNodes++;
    
    // Count by street (simplified - real implementation tracks street per node)
    if (rootStreet === 'flop') stats.flopActionNodes++;
    else if (rootStreet === 'turn') stats.turnActionNodes++;
    else if (rootStreet === 'river') stats.riverActionNodes++;
    
    for (const child of node.children) {
      countNodes(child, stats, rootStreet);
    }
  } else if (node.type === 'CHANCE') {
    stats.chanceNodes++;
    for (const child of node.children) {
      countNodes(child, stats, rootStreet);
    }
  } else if (node.type === 'TERMINAL') {
    stats.terminalNodes++;
  }
}

// Game state interface
export interface GameState {
  board: number[];
  street: Street;
  pot: number;
  stacks: [number, number];
  currentPlayer: 0 | 1;
  lastToAct: 0 | 1;
  currentBet: number;
  minimumBet?: number;
}
