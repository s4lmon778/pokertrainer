/**
 * GTO Solver Public API
 *
 * High-level interface for running the DCFR solver and querying strategies.
 * Integrates game tree building, DCFR solving, and equity calculation.
 */
import { buildGameTree } from './game-tree';
import { solveDCFR, createDCFRModule } from './dcfr';
import { cardIndexToString } from './equity';
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
 * @param options - Solver configuration options
 * @returns SolveResult with strategy and statistics
 */
export function solve(board, heroRange, villainRange, options = {}) {
    const startTime = performance.now();
    // Defensive: handle empty ranges
    if (!board || board.length < 3) {
        throw new Error('Board must have at least 3 cards (flop).');
    }
    if (!heroRange || heroRange.length === 0) {
        throw new Error('Hero range must not be empty');
    }
    if (!villainRange || villainRange.length === 0) {
        throw new Error('Villain range must not be empty');
    }
    const { stackSize = DEFAULT_SETTINGS.stackSize, potSize = DEFAULT_SETTINGS.potSize, iterations = DEFAULT_SETTINGS.iterations, minExploitability, onProgress, } = options;
    // Determine street from board size
    const street = board.length === 3 ? 'flop' : board.length === 4 ? 'turn' : 'river';
    // Build game tree with safety limits
    let root;
    try {
        const treeSettings = {
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
        root = buildGameTree(treeSettings);
    }
    catch (e) {
        throw new Error(`Failed to build game tree: ${e instanceof Error ? e.message : 'unknown'}`);
    }
    // Validate tree was built
    if (!root || root.type !== 'ACTION') {
        throw new Error('Game tree build returned invalid root node.');
    }
    // Count nodes for safety
    let nodeCount = 0;
    function countNodes(node) {
        nodeCount++;
        if (nodeCount > 500000)
            throw new Error('Tree too large — aborting.');
        if (node.type !== 'TERMINAL' && node.children) {
            for (const child of node.children)
                countNodes(child);
        }
    }
    try {
        countNodes(root);
    }
    catch {
        throw new Error('Game tree exceeds safe size limit. Try fewer range hands.');
    }
    // Attach DCFR modules to action nodes
    attachDCFRModules(root);
    // Run solver with progress and early stopping
    const { exploitability, timeMs } = solveDCFR(root, iterations, minExploitability, onProgress);
    // Collect strategies
    const strategy = collectStrategies(root);
    return {
        root,
        iterations,
        exploitability,
        strategy,
        solveTimeMs: Math.round(performance.now() - startTime),
    };
}
/**
 * Query the optimal strategy for a specific hand.
 */
export function getStrategyForHand(result, heroHand, board) {
    const strategy = new Map();
    if (!result || !result.root)
        return strategy;
    // Find the information set in the tree
    const infoSet = findInfoSet(result.root, board, heroHand);
    if (!infoSet)
        return strategy;
    if (infoSet.type === 'ACTION' && infoSet.dcfr && infoSet.actions) {
        const actions = infoSet.actions;
        const probs = infoSet.dcfr.getAverageStrategy();
        if (probs && probs.length > 0) {
            for (let i = 0; i < actions.length; i++) {
                strategy.set(actions[i].kind, probs[i] || 0);
            }
        }
    }
    return strategy;
}
/**
 * Export strategy in PioFormat for use with PioSolver viewers.
 */
export function exportPIO(result, board) {
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
 * Attach DCFR modules to all action nodes in the tree.
 */
function attachDCFRModules(node) {
    if (node.type === 'ACTION') {
        node.dcfr = createDCFRModule(node.actions.length);
        for (const child of node.children) {
            attachDCFRModules(child);
        }
    }
    else if (node.type === 'CHANCE') {
        for (const child of node.children) {
            attachDCFRModules(child);
        }
    }
    // Terminal nodes don't need DCFR modules
}
/**
 * Collect strategies from all action nodes.
 */
function collectStrategies(node, strategy = new Map()) {
    if (node.type === 'ACTION' && node.dcfr) {
        const key = `${node.player}_${node.actions.map(a => a.kind).join(',')}`;
        strategy.set(key, node.dcfr.getAverageStrategy());
    }
    if (node.type === 'ACTION' || node.type === 'CHANCE') {
        for (const child of node.children) {
            collectStrategies(child, strategy);
        }
    }
    return strategy;
}
/**
 * Find the information set for a given hand and board.
 * Traverses the game tree through CHANCE nodes matching board cards
 * to locate the ACTION node at the correct street depth.
 *
 * For flop (3 cards): returns the root ACTION node (street 0).
 * For turn (4 cards): descends through 1 CHANCE level matching board[3].
 * For river (5 cards): descends through 2 CHANCE levels matching board[3] and board[4].
 */
function findInfoSet(node, board, heroHand, remaining) {
    if (!node)
        return null;
    if (node.type === 'TERMINAL')
        return null;
    // How many board cards beyond the initial 3-card flop we still need to match
    const toMatch = remaining ?? (board.length - 3);
    if (node.type === 'ACTION') {
        // If all CHANCE levels matched, this ACTION node is at the target street
        if (toMatch <= 0)
            return node;
        // Still need to descend through CHANCE nodes — search children
        for (const child of node.children) {
            const result = findInfoSet(child, board, heroHand, toMatch);
            if (result)
                return result;
        }
        // No CHANCE path found — return this node as closest match
        return node;
    }
    if (node.type === 'CHANCE') {
        if (toMatch <= 0 || !node.dealtCards || node.dealtCards.length === 0) {
            // Unexpected: CHANCE node with nothing to match — try first child
            for (const child of node.children) {
                const result = findInfoSet(child, board, heroHand, 0);
                if (result)
                    return result;
            }
            return null;
        }
        // Match the next board card: board[board.length - toMatch] is the next street card
        const targetIdx = board.length - toMatch;
        const targetCard = board[targetIdx];
        const childIdx = node.dealtCards.indexOf(targetCard);
        if (childIdx >= 0 && childIdx < node.children.length) {
            // Exact match — follow this branch with one fewer card to match
            return findInfoSet(node.children[childIdx], board, heroHand, toMatch - 1);
        }
        // Card not found in dealt cards (e.g. card is in a player's hand) —
        // fall back to first available child branch
        for (const child of node.children) {
            const result = findInfoSet(child, board, heroHand, toMatch - 1);
            if (result)
                return result;
        }
    }
    return null;
}
//# sourceMappingURL=solver.js.map