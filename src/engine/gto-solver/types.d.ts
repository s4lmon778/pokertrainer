/**
 * GTO Solver Core Types
 *
 * Type definitions for the Discounted CFR poker solver.
 * Mirrors shark-2.0's node structure but adapted for TypeScript/browser execution.
 */
export type CardIndex = number;
export type ActionKind = 'CHECK' | 'BET' | 'FOLD' | 'CALL' | 'RAISE';
export interface Action {
    kind: ActionKind;
    size?: number;
}
export type NodeType = 'ACTION' | 'CHANCE' | 'TERMINAL';
export interface ActionNode {
    type: 'ACTION';
    player: 0 | 1;
    actions: Action[];
    children: Node[];
    dcfr?: DCFRModule;
}
export interface ChanceNode {
    type: 'CHANCE';
    children: Node[];
    dealtCard?: CardIndex;
    dealtCards?: CardIndex[];
}
export interface TerminalNode {
    type: 'TERMINAL';
    payoff: [number, number];
    lastToAct: 0 | 1;
    potSize: number;
}
export type Node = ActionNode | ChanceNode | TerminalNode;
export interface DCFRModule {
    updateRegrets(actionUtils: number[], reachProb: number, iteration: number): void;
    getAverageStrategy(): number[];
    getCurrentStrategy(): number[];
    resetCumulativeStrategy(): void;
}
export interface SolverConfig {
    stackSize: number;
    potSize: number;
    minBet: number;
    allInThreshold: number;
    iterations: number;
    minExploitability: number;
    threadCount: number;
    raiseCap: number;
    removeDonkBets: boolean;
}
export declare const BET_SIZING: {
    readonly preflop: {
        readonly bets: readonly [0.5, 1];
        readonly raises: readonly [1];
    };
    readonly flop: {
        readonly bets: readonly [0.5, 1];
        readonly raises: readonly [1];
    };
    readonly turn: {
        readonly bets: readonly [0.33, 0.66, 1];
        readonly raises: readonly [0.5, 1];
    };
    readonly river: {
        readonly bets: readonly [0.33, 0.66, 1];
        readonly raises: readonly [0.5, 1];
    };
};
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
export type Street = 'flop' | 'turn' | 'river';
export type RangeMatrix = boolean[][];
export interface SolveResult {
    root: Node;
    iterations: number;
    exploitability: number;
    strategy: Map<string, number[]>;
    solveTimeMs: number;
}
//# sourceMappingURL=types.d.ts.map