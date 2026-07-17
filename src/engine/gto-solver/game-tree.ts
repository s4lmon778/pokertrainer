/**
 * Game Tree Builder
 * 
 * Constructs the poker game tree for the GTO solver.
 * Mirrors shark-2.0's GameTree.hh structure.
 */

import type { Node, ActionNode, ChanceNode, TerminalNode, Action, Street, DCFRModule, SolverConfig, RangeMatrix, SolveResult, CardIndex } from './types';
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
function createInitialState(settings: TreeBuilderSettings): GameState {
  return {
    board: [...settings.initialBoard],
    street: settings.initialStreet,
    pot: settings.startingPot,
    stacks: [settings.startingStack, settings.startingStack] as [number, number],
    currentPlayer: (settings.inPositionPlayer === 0 ? 1 : 0) as 0 | 1, // Non-position acts first
    lastToAct: 0 as 0 | 1,
    currentBet: 0,
    minimumBet: settings.minimumBet,
    raiseCount: 0,
    lastAction: undefined,
    isAllIn: false,
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

  // Check if already terminal before building actions
  if (isTerminalState(state)) {
    return node;
  }

  // Get legal actions based on street and game state
  const legalActions = getLegalActions(state, settings);

  // If no legal actions, treat as terminal (e.g., both all-in with no options)
  if (legalActions.length === 0) {
    return node;
  }

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
  // Check if this action leads to a terminal state
  if (isTerminalState(state)) {
    return buildTerminalNode(parent, state);
  }

  // Check if the betting round is complete and we need to deal the next street
  const bettingRoundComplete =
    state.currentBet === 0 &&
    state.lastAction !== undefined &&
    (state.lastAction === 'CHECK' || state.lastAction === 'CALL') &&
    state.lastToAct !== state.currentPlayer; // Both players have acted

  if (bettingRoundComplete) {
    const nextStreet = getNextStreet(state.street);
    if (nextStreet) {
      return buildChanceNode(parent, state, nextStreet, settings);
    }
    // If no next street (shouldn't happen since river terminal is caught above),
    // treat as terminal
    return buildTerminalNode(parent, state);
  }

  // Continue with action nodes
  return buildActionNode(parent, state, settings);
}

/**
 * Get the next street after the current one.
 * Returns null if there is no next street (river).
 */
function getNextStreet(street: Street): Street | null {
  if (street === 'flop') return 'turn';
  if (street === 'turn') return 'river';
  return null; // river has no next street
}

/**
 * Build a chance node for dealing community cards.
 */
function buildChanceNode(parent: ActionNode, state: GameState, street: Street, settings: TreeBuilderSettings): ChanceNode {
  const dealtCards: CardIndex[] = [];
  const node: ChanceNode = {
    type: 'CHANCE',
    children: [],
    dealtCards,
  };

  // Get available cards (not on board and not in hands)
  const availableCards = getAvailableCards(state.board);

  for (const card of availableCards) {
    const nextState = { ...state, board: [...state.board, card], street };
    const child = buildActionNode(node, nextState, settings);
    node.children.push(child);
    dealtCards.push(card);
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
export function getLegalActions(state: GameState, settings: TreeBuilderSettings): Action[] {
  const actions: Action[] = [];
  const currentPlayer = state.currentPlayer;
  const remainingChips = state.stacks[currentPlayer];
  const raiseCap = settings.raiseCap ?? MAX_RAISES_PER_STREET;
  const canRaiseMore = state.raiseCount < raiseCap;

  // Cannot act if all-in with no chips
  const isAllIn = remainingChips <= 0;
  if (isAllIn) {
    return actions;
  }

  // Facing a bet: can fold, call, or raise (if raise cap not reached)
  const facingBet = state.currentBet > 0;
  if (facingBet) {
    actions.push({ kind: 'FOLD' });
    // Call amount is limited by remaining chips (all-in call)
    const callAmount = Math.min(state.currentBet, remainingChips);
    if (callAmount > 0) {
      actions.push({ kind: 'CALL' });
    }
  } else {
    // No bet facing: can check
    actions.push({ kind: 'CHECK' });
  }

  // Can bet/raise if has chips left and hasn't exceeded raise cap
  if (remainingChips > 0 && (!facingBet || canRaiseMore)) {
    const streetConfig = BET_SIZING[state.street];
    const isAllInThreshold =
      remainingChips <= state.pot * settings.allInThreshold;

    if (isAllInThreshold && remainingChips > 0) {
      // Only all-in bet available (simplify to one action)
      actions.push({ kind: facingBet ? 'RAISE' : 'BET', size: remainingChips / state.pot });
    } else {
      // Add bet sizes
      if (!facingBet) {
        for (const size of streetConfig.bets) {
          const betAmount = Math.floor(state.pot * size);
          if (betAmount >= state.minimumBet && betAmount <= remainingChips) {
            actions.push({ kind: 'BET', size });
          }
        }
      }

      // Add raise sizes (only if facing a bet)
      if (facingBet && canRaiseMore) {
        for (const raiseSize of streetConfig.raises) {
          const raiseAmount = Math.floor(state.currentBet * (1 + raiseSize));
          if (raiseAmount <= remainingChips + state.currentBet) {
            actions.push({ kind: 'RAISE', size: raiseSize });
          }
        }
      }
    }
  }

  return actions;
}

/**
 * Apply an action to the game state and return the new state.
 */
export function applyAction(state: GameState, action: Action, settings: TreeBuilderSettings): GameState {
  const currentPlayer = state.currentPlayer;
  const remainingChips = state.stacks[currentPlayer];

  // Deep copy stacks
  const newState: GameState = {
    ...state,
    stacks: [...state.stacks] as [number, number],
    board: [...state.board],
    lastAction: action.kind,
  };

  switch (action.kind) {
    case 'CHECK':
      // Both players have now checked if lastToAct was the other player
      newState.lastToAct = currentPlayer;
      newState.raiseCount = 0; // Reset raise count on new betting round concept
      break;

    case 'BET': {
      const betSize = action.size ?? 0.5;
      const betAmount = Math.min(
        Math.floor(state.pot * betSize),
        remainingChips
      );
      const actualBet = Math.max(betAmount, state.minimumBet);
      newState.stacks[currentPlayer] -= actualBet;
      newState.pot += actualBet;
      newState.currentBet = actualBet;
      newState.lastToAct = currentPlayer;
      newState.raiseCount = 0;
      break;
    }

    case 'RAISE': {
      const raiseSize = action.size ?? 1.0;
      let raiseAmount: number;
      if (state.currentBet === 0) {
        // No bet facing yet — treat as a bet (use pot-size multiplier)
        raiseAmount = Math.max(
          Math.floor(state.pot * raiseSize),
          state.minimumBet
        );
      } else {
        raiseAmount = Math.min(
          Math.floor(state.currentBet * (1 + raiseSize)),
          remainingChips + state.currentBet
        );
      }
      const amountToAdd = Math.max(raiseAmount - state.currentBet, 0);
      newState.stacks[currentPlayer] -= amountToAdd;
      newState.pot += amountToAdd;
      newState.currentBet = raiseAmount;
      newState.lastToAct = currentPlayer;
      newState.raiseCount = state.raiseCount + 1;
      break;
    }

    case 'CALL': {
      const callAmount = Math.min(state.currentBet, remainingChips);
      newState.stacks[currentPlayer] -= callAmount;
      newState.pot += callAmount;
      newState.currentBet = 0; // Betting round closed
      newState.raiseCount = 0;
      break;
    }

    case 'FOLD':
      // Terminal state — no further actions
      // Mark the current player as folded by zeroing their stack contribution this round
      newState.lastAction = 'FOLD';
      break;
  }

  // Check for all-in
  if (newState.stacks[currentPlayer] <= 0) {
    newState.isAllIn = true;
    newState.stacks[currentPlayer] = 0;
  }

  // Switch player (unless terminal fold)
  if (action.kind !== 'FOLD') {
    newState.currentPlayer = (currentPlayer === 0 ? 1 : 0) as 0 | 1;
  }

  return newState;
}

/**
 * Check if the current state is terminal (hand ended).
 *
 * Terminal conditions:
 * 1. A player folded — pot awarded to the other player
 * 2. Both players all-in with no more streets — showdown at current equity
 * 3. Betting round complete on the river (both players acted, no bet pending)
 * 4. Both players checked through all streets with no more cards
 */
function isTerminalState(state: GameState): boolean {
  // Condition 1: Fold
  if (state.lastAction === 'FOLD') {
    return true;
  }

  // Condition 2: Both all-in, no more streets to deal
  const bothAllIn = state.stacks[0] <= 0 && state.stacks[1] <= 0;
  if (bothAllIn) {
    // On river, or if no more community cards to come — it's a showdown
    if (state.street === 'river') {
      return true;
    }
    // If all-in before river, we still deal remaining cards (handled by chance nodes)
    // Terminal only if we're past all streets
    return false;
  }

  // Condition 3: River betting round completed
  if (state.street === 'river') {
    // Betting complete when: both players acted and no outstanding bet
    const bettingComplete =
      state.currentBet === 0 &&
      state.lastAction !== undefined &&
      (state.lastAction === 'CHECK' || state.lastAction === 'CALL');
    if (bettingComplete) {
      return true;
    }
  }

  // Condition 4: Check-through on all remaining streets (no more cards)
  // This is caught by the river check above, plus the child builder logic
  // For non-river, check if both players have acted with no bet
  if (state.currentBet === 0 && state.lastAction === 'CHECK') {
    // Both players checked on this street — need next street (chance node)
    // Not terminal here; the chance node builder handles this in buildChildNode
    return false;
  }

  return false;
}

/**
 * Compute terminal payoffs based on game outcome.
 *
 * - Fold: non-folding player wins the pot (zero-sum)
 * - Showdown: equity-based payoff (placeholder — CFR traversal refines with hand sampling)
 */
function computeTerminalPayoff(state: GameState): [number, number] {
  const pot = state.pot;

  // Fold: last player who didn't fold wins the pot
  if (state.lastAction === 'FOLD') {
    // The player who folded loses; the other wins
    const folder = state.currentPlayer; // currentPlayer is the one who just folded
    if (folder === 0) {
      return [-pot, pot]; // Hero folded → villain wins pot
    } else {
      return [pot, -pot]; // Villain folded → hero wins pot
    }
  }

  // Showdown: equity-based (placeholder for hand evaluation)
  // The CFR traversal will override with actual hand equity during sampling.
  // Return zero-sum split based on pot — this gets refined during training.
  return [0, 0]; // Placeholder: actual values computed during CFR with hand sampling
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
  minimumBet: number;
  raiseCount: number;
  lastAction?: 'CHECK' | 'BET' | 'FOLD' | 'CALL' | 'RAISE';
  isAllIn: boolean;
}

/** Maximum number of raises allowed per street (default 3). */
const MAX_RAISES_PER_STREET = 3;
