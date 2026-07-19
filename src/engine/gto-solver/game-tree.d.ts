/**
 * Game Tree Builder
 *
 * Constructs the poker game tree for the GTO solver.
 * Mirrors shark-2.0's GameTree.hh structure.
 */
import type { Node, Action, Street } from './types';
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
export interface TreeBuilderSettings {
    range1: {
        numHands: number;
    };
    range2: {
        numHands: number;
    };
    inPositionPlayer: number;
    initialBoard: number[];
    initialStreet: Street;
    startingStack: number;
    startingPot: number;
    minimumBet: number;
    allInThreshold: number;
    raiseCap?: number;
    removeDonkBets?: boolean;
}
/**
 * Build the complete game tree starting from the given state.
 */
export declare function buildGameTree(settings: TreeBuilderSettings): Node;
/**
 * Get legal actions for the current player in the current state.
 */
export declare function getLegalActions(state: GameState, settings: TreeBuilderSettings): Action[];
/**
 * Apply an action to the game state and return the new state.
 */
export declare function applyAction(state: GameState, action: Action, settings: TreeBuilderSettings): GameState;
/**
 * Get tree statistics for monitoring.
 */
export declare function getTreeStats(node: Node, settings: TreeBuilderSettings): TreeStatistics;
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
//# sourceMappingURL=game-tree.d.ts.map