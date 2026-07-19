/**
 * GTO Solver Core Types
 *
 * Type definitions for the Discounted CFR poker solver.
 * Mirrors shark-2.0's node structure but adapted for TypeScript/browser execution.
 */
// Bet sizing config with preflop support
export const BET_SIZING = {
    preflop: { bets: [0.5, 1.0], raises: [1.0] },
    flop: { bets: [0.5, 1.0], raises: [1.0] },
    turn: { bets: [0.33, 0.66, 1.0], raises: [0.5, 1.0] },
    river: { bets: [0.33, 0.66, 1.0], raises: [0.5, 1.0] },
};
//# sourceMappingURL=types.js.map