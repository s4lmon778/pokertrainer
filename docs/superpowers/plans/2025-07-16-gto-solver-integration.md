# GTO Solver Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan.
> **For human partners:** This plan describes the work to be done. Do not execute it — it is a reference for understanding the scope.

## Overview

This plan describes integrating a **GTO (Game Theory Optimal) solver** into the PokerTrainer app, inspired by the [shark-2.0](https://github.com/24parida/shark-2.0) C++ poker solver. The solver will:

1. **Compute Nash equilibrium strategies** for heads-up No-Limit Hold'em using Discounted CFR (Counterfactual Regret Minimization)
2. **Display Pio-style strategy charts** on the Rules page showing optimal frequencies for each action (check, bet, fold, raise)
3. **Power the existing TrainingBot strategies** with real solver-computed baselines
4. **Be fully client-side** — runs in the browser with Web Workers for performance

## Architecture

The solver will be a **TypeScript port** of shark-2.0's DCFR algorithm, adapted for browser execution:

```
src/engine/gto-solver/
├── types.ts           — Solver type definitions (nodes, actions, strategies)
├── game-tree.ts       — Game tree builder (action nodes, chance nodes, terminal nodes)
├── dcfr.ts            — Discounted CFR solver core
├── regret-matching.ts — Regret matching and strategy computation
├── equity.ts          — Hand equity calculator (integration with existing handEvaluator)
├── solver.ts          — Public API: solve(), getStrategy(), exportPIO()
├── worker.ts          — Web Worker entry point
└── index.ts           — Barrel exports
```

## Key Differences from shark-2.0

| Feature | shark-2.0 (C++) | Our Solver (TypeScript) |
|---------|-----------------|------------------------|
| Language | C++ with TBB parallelism | TypeScript, single-threaded (Web Workers for parallelism) |
| Memory | int16 compression | Float64 arrays (acceptable for browser) |
| Hands | Full 1326 preflop combos | Full 1326 preflop combos |
| Streets | Flop/Turn/River | Flop/Turn/River (preflop deferred) |
| Bet sizing | Street-specific (50%/100% flop, 33%/66%/100% turn/river) | Same |
| Raise cap | 3 raises per street | Same |
| Donk bet removal | Optional | Disabled (full tree) |
| Hand evaluator | HenryRLee/PokerHandEvaluator (C++) | Our existing handEvaluator.ts |
| Output | PIO format strings | JSON + PioFormat export |

## Tasks

### Task 1: Core Types and Game Tree Builder

**Goal:** Define solver types and build the game tree structure.

**Files to create/modify:**
- `src/engine/gto-solver/types.ts` — New file
- `src/engine/gto-solver/game-tree.ts` — New file

**Types:**
```typescript
// Card representation: 0-51 (standard encoding)
type CardIndex = number;

// Action types: CHECK, BET[size], FOLD, CALL, RAISE[size]
interface CheckAction { type: 'CHECK'; }
interface BetAction { type: 'BET'; size: number; // fraction of pot }
interface FoldAction { type: 'FOLD'; }
interface CallAction { type: 'CALL'; }
interface RaiseAction { type: 'RAISE'; size: number; }

type Action = CheckAction | BetAction | FoldAction | CallAction | RaiseAction;

// Node types mirroring shark-2.0
interface ActionNode {
  type: 'ACTION';
  player: 0 | 1; // 0 = hero, 1 = villain
  actions: Action[];
  children: Node[];
  dcfr?: DCFRModule; // Training module
}

interface ChanceNode {
  type: 'CHANCE';
  children: Node[]; // One per possible deal card
  dealtCard?: CardIndex;
}

interface TerminalNode {
  type: 'TERMINAL';
  payoff: [number, number]; // [hero payoff, villain payoff]
  lastToAct: 0 | 1;
  potSize: number;
}

type Node = ActionNode | ChanceNode | TerminalNode;
```

**Game tree construction:**
- Build preflop → flop → turn → river tree
- Preflop: both players have ranges (default: 100% for simplicity)
- Each action node has legal actions based on street bet-sizing config
- Chance nodes deal one card at a time (turn, then river)
- Terminal nodes compute payoffs using hand evaluator

**Bet sizing config (from shark-2.0):**
```typescript
const BET_SIZING = {
  flop:   { bets: [0.5, 1.0], raises: [1.0] },
  turn:   { bets: [0.33, 0.66, 1.0], raises: [0.5, 1.0] },
  river:  { bets: [0.33, 0.66, 1.0], raises: [0.5, 1.0] },
};
```

**Raise cap:** Max 3 raises per street, then force all-in.

**Verification:**
1. Build tree for a simple scenario (e.g., SB vs BB, flop solved)
2. Count nodes: action nodes, chance nodes, terminal nodes
3. Verify tree structure matches expected poker game tree

### Task 2: DCFR Solver Core

**Goal:** Implement Discounted CFR algorithm in TypeScript.

**Files to create/modify:**
- `src/engine/gto-solver/dcfr.ts` — New file
- `src/engine/gto-solver/regret-matching.ts` — New file

**DCFR Algorithm (from shark-2.0 DCFR.hh):**

The discounted CFR algorithm maintains cumulative regrets for each action at each information set. At each iteration:

1. **Regret matching:** Convert negative regrets to 0, normalize to get strategy probabilities
2. **Discount factors:** α, β, γ computed based on iteration count:
   - α = √(t-1) / (√(t-1) + 1) — for regret accumulation
   - β = 0.5 — constant
   - γ = t² / (t+1)² — for strategy averaging
3. **Counterfactual values:** For each player at each information set, compute the expected utility considering opponent's strategy
4. **Reach probabilities:** Track how likely each player is to reach each node

**Key formulas:**
```typescript
// Regret matching strategy
function regretMatching(regrets: number[]): number[] {
  let sumPositive = 0;
  for (const r of regrets) {
    if (r > 0) sumPositive += r;
  }
  if (sumPositive === 0) {
    // Uniform strategy
    return new Array(regrets.length).fill(1 / regrets.length);
  }
  return regrets.map(r => Math.max(0, r) / sumPositive);
}

// Discount factors (shark-2.0 DCFR)
function precomputeDiscounts(t: number) {
  const tAlpha = Math.max(0, t - 1);
  const powAlpha = tAlpha * Math.sqrt(tAlpha);
  const alpha = powAlpha / (powAlpha + 1);
  const beta = 0.5;
  const gamma = (t / (t + 1)) ** 2;
  return { alpha, beta, gamma };
}
```

**CFR traversal:**
```typescript
function cfr(
  node: Node,
  heroReachProb: number,
  villainReachProb: number,
  depth: number,
  iterations: number,
): { util: [number, number]; strategy: number[] } {
  if (node.type === 'TERMINAL') {
    return { util: node.payoff, strategy: [] };
  }
  
  if (node.type === 'CHANCE') {
    // Average over all possible card deals
    let totalUtil = [0, 0];
    for (const child of node.children) {
      const result = cfr(child, heroReachProb, villainReachProb, depth + 1, iterations);
      totalUtil[0] += result.util[0];
      totalUtil[1] += result.util[1];
    }
    return { util: totalUtil, strategy: [] };
  }
  
  if (node.type === 'ACTION') {
    const player = node.player;
    const reachProb = player === 0 ? heroReachProb : villainReachProb;
    
    // Get strategy from DCFR module
    const strategy = node.dcfr?.getAverageStrategy() || uniformStrategy(node.actions.length);
    
    // Compute counterfactual values for each action
    let actionUtils = [];
    for (const child of node.children) {
      const nextHeroProb = player === 0 ? heroReachProb : heroReachProb * strategy[node.children.indexOf(child)];
      const nextVillainProb = player === 1 ? villainReachProb : villainReachProb * strategy[node.children.indexOf(child)];
      const result = cfr(child, nextHeroProb, nextVillainProb, depth + 1, iterations);
      actionUtils.push(result.util[player === 0 ? 0 : 1]);
    }
    
    // Update regrets
    node.dcfr?.updateRegrets(actionUtils, reachProb, iterations);
    
    // Utility is weighted sum of action utilities
    let totalUtil = [0, 0];
    for (let i = 0; i < actionUtils.length; i++) {
      totalUtil[0] += strategy[i] * actionUtils[0];
      totalUtil[1] += strategy[i] * actionUtils[1];
    }
    
    return { util: totalUtil, strategy };
  }
}
```

**Iterative solving:**
```typescript
function solveDCFR(root: Node, iterations: number = 100): void {
  for (let iter = 1; iter <= iterations; iter++) {
    precomputeDiscounts(iter);
    cfr(root, 1.0, 1.0, 0, iter);
  }
}
```

**Verification:**
1. Run solver on a trivial game (e.g., simple matching pennies) — verify Nash eq
2. Run on simplified NLH (no bet sizing, only check/fold) — verify convergence
3. Check that average strategy converges as iterations increase

### Task 3: Hand Equity Calculator

**Goal:** Compute hand equity for terminal node payoffs.

**Files to create/modify:**
- `src/engine/gto-solver/equity.ts` — New file

**Approach:**
- For each terminal node, determine the board cards and hole cards for both players
- Use the existing `handEvaluator.ts` to evaluate hands
- Since we can't enumerate all possible hands at each node efficiently, use **monte Carlo sampling**:
  - Sample 1000 random opponent hand/board combinations consistent with ranges
  - Compute average payoff for each sampled combination

**Integration with existing handEvaluator:**
```typescript
import { evaluateHand } from '../../utils/handEvaluator';

function computeTerminalPayoff(
  board: Card[],
  heroHand: Card[],
  villainHand: Card[],
  potSize: number,
  heroBet: number,
  villainBet: number,
): [number, number] {
  const heroRank = evaluateHand([...heroHand, ...board]);
  const villainRank = evaluateHand([...villainHand, ...board]);
  
  if (heroRank > villainRank) return [(potSize + heroBet + villainBet) / 2, -(potSize + heroBet + villainBet) / 2];
  if (villainRank > heroRank) return [-(potSize + heroBet + villainBet) / 2, (potSize + heroBet + villainBet) / 2];
  return [0, 0]; // Split pot
}
```

**Verification:**
1. Compare equity calculations against known values (AA vs KK pre-flop ≈ 82%/18%)
2. Verify terminal payoffs sum to zero (zero-sum game)

### Task 4: Strategy Query and Export

**Goal:** Provide API for querying solved strategies and exporting in PioFormat.

**Files to create/modify:**
- `src/engine/gto-solver/solver.ts` — New file

**Public API:**
```typescript
interface SolveResult {
  root: Node;
  iterations: number;
  exploitability: number; // Lower is better
  strategy: Map<string, number[]>; // infoSetKey → strategy probabilities
}

function solve(
  board: Card[],
  heroRange: number[][]; // 1326 × 1326 range matrix
  villainRange: number[][];
  stackSize: number;
  potSize: number;
  iterations: number;
  minExploitability: number;
): SolveResult;

function getActionProbabilities(
  result: SolveResult,
  board: Card[],
  heroHand: Card[],
  villainHand: Card[],
  street: 'flop' | 'turn' | 'river';
): Map<string, number>; // action → probability

function exportPIO(result: SolveResult): string; // PioFormat string
```

**PioFormat export (for compatibility with PioSolver viewers):**
```
SB: 100.00%
BB: 100.00%

Board: 8s 7h 3d

Hero:
  AsKs: 0.00% check, 100.00% bet-50%, 0.00% bet-100%
  ...

Villain:
  ...
```

**Verification:**
1. Export solved strategy to PioFormat and verify syntax
2. Query strategy for known hands and verify probabilities make sense

### Task 5: Web Worker Integration

**Goal:** Run solver in background thread to avoid blocking UI.

**Files to create/modify:**
- `src/engine/gto-solver/worker.ts` — New file
- Update `src/engine/gto-solver/solver.ts` — Worker factory

**Worker protocol:**
```typescript
// Main thread → Worker
interface SolveRequest {
  type: 'SOLVE';
  board: Card[];
  heroRange: number[][];
  villainRange: number[][];
  stackSize: number;
  potSize: number;
  iterations: number;
}

// Worker → Main thread
interface SolveProgress {
  type: 'PROGRESS';
  iteration: number;
  total: number;
  exploitability: number;
}

interface SolveComplete {
  type: 'COMPLETE';
  result: SolveResult;
  timeMs: number;
}
```

**Verification:**
1. Solver runs in worker without blocking UI
2. Progress callbacks update UI during solve
3. Worker can be terminated and restarted

### Task 6: Rules Page Solver UI

**Goal:** Display solver results on the Rules page as interactive charts.

**Files to create/modify:**
- `src/components/Rule...[truncated]