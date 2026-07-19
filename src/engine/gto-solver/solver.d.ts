/**
 * GTO Solver Public API
 *
 * High-level interface for running the DCFR solver and querying strategies.
 * Integrates game tree building, DCFR solving, and equity calculation.
 */
import type { SolveResult, CardIndex } from './types';
/** Options for the solve function. */
export interface SolveOptions {
    /** Starting stack size in big blinds (default 100). */
    stackSize?: number;
    /** Current pot size in big blinds (default 2). */
    potSize?: number;
    /** Number of DCFR iterations (default 100). */
    iterations?: number;
    /** Stop early if exploitability drops below this threshold. */
    minExploitability?: number;
    /** Called periodically with (iteration, exploitability) during solving. */
    onProgress?: (iteration: number, exploitability: number) => void;
}
/**
 * Solve a poker position using DCFR.
 *
 * @param board - Community cards (3 for flop, 4 for turn, 5 for river)
 * @param heroRange - Hero's range (array of hand indices)
 * @param villainRange - Villain's range (array of hand indices)
 * @param options - Solver configuration options
 * @returns SolveResult with strategy and statistics
 */
export declare function solve(board: CardIndex[], heroRange: number[], villainRange: number[], options?: SolveOptions): SolveResult;
/**
 * Query the optimal strategy for a specific hand.
 */
export declare function getStrategyForHand(result: SolveResult, heroHand: number[], board: CardIndex[]): Map<string, number>;
/**
 * Export strategy in PioFormat for use with PioSolver viewers.
 */
export declare function exportPIO(result: SolveResult, board: CardIndex[]): string;
//# sourceMappingURL=solver.d.ts.map