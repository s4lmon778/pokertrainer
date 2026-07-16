# GTO Solver Deep Audit & Improvement

## Project Context

PokerTrainer at `C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer`. We just built a GTO (Game Theory Optimal) solver based on shark-2.0's DCFR algorithm. It's functional but needs serious improvement through iterative refinement.

## What Exists

- `src/engine/gto-solver/` — 6 files (~1,200 lines)
  - `types.ts` — Core types (Node, Action, DCFRModule, etc.)
  - `game-tree.ts` — Game tree builder with action/chance/terminal nodes
  - `dcfr.ts` — Discounted CFR solver with regret matching
  - `equity.ts` — Hand equity calculator
  - `solver.ts` — Public API (solve, getStrategyForHand, exportPIO)
  - `worker.ts` — Web Worker for background computation
- `src/components/GTOSolver.tsx` — React UI component
- `src/components/RangeSelector.tsx` — Range selection matrix
- `src/components/RulesPage.tsx` — Integrated with GTOSolver

## Build Status
- `npm run build` — passes clean
- `npx tsc --noEmit` — passes clean
- Tests: 221/221 passing (but NO tests for GTO solver itself!)

## Global Constraints
- **NO new npm dependencies**
- **Every new public function needs JSDoc**
- **TypeScript ternary narrowing trap**: When a ternary on a discriminated union doesn't exhaustively cover all members, later `!==` comparisons fail with TS2367. Fix: extract comparisons into boolean consts BEFORE the ternary, or use exhaustive switch statements.
- **Windows terminal uses git-bash** — POSIX syntax, `cd "/c/Users/..."` paths
- **No unused imports or variables**

## Critical Issues to Fix

### 1. **ZERO tests for GTO solver**
The entire solver engine has no test coverage. Write comprehensive tests for:
- `dcfr.ts`: DCFRImpl, regretMatching, precomputeDiscounts, encodeSignedSlice, decodeWithDiscount
- `game-tree.ts`: buildGameTree, getLegalActions, applyAction, getTreeStats
- `equity.ts`: cardIndexToString, stringToCardIndex, computeHandEquity
- `solver.ts`: solve, getStrategyForHand, exportPIO
- Target: 30+ new tests, all passing

### 2. **Game tree builder is incomplete**
- `isTerminalState()` always returns `false` — needs real logic for fold detection, all-in, betting round completion
- `computeTerminalPayoff()` returns simplified half-pot — needs real hand evaluation integration
- `applyAction()` doesn't properly handle folding (should immediately create terminal node)
- `getLegalActions()` doesn't respect raise caps or all-in thresholds
- Missing: pot tracking across multiple betting rounds, side pot handling

### 3. **DCFR algorithm has bugs**
- `cfrTraversal()` uses `any` types everywhere — needs proper type narrowing
- `computeExploitability()` returns hardcoded `0.1` — needs real best-response computation
- `updateRegrets()` doesn't properly discount — the formula should use `gamma` not `alpha` for regret accumulation
- Missing: proper counterfactual value computation (should consider opponent's strategy, not just own)
- The `reachProb` parameter in `updateRegrets` isn't used correctly — should be counterfactual reach probability

### 4. **Solver API is incomplete**
- `findInfoSet()` returns `null` — needs real tree traversal to find matching information set
- `exportPIO()` outputs placeholder text — needs real strategy serialization
- `getStrategyForHand()` doesn't handle the case where `findInfoSet` returns null gracefully
- No memoization — rebuilding tree and solving from scratch every time

### 5. **Performance issues**
- Game tree is rebuilt on every solve — should cache trees by board/street
- No early stopping when exploitability target is reached
- Equity calculation uses 1000 samples by default — too slow for interactive use, should be configurable (100-500)
- Web Worker doesn't actually use parallelism — runs synchronously

### 6. **Type safety problems**
- `dcfr.ts` line 168: `node: any` — should use proper Node type with discriminated union
- `solver.ts` line 254: `root: any` — same issue
- Multiple places use `as 0 | 1` casts instead of proper typing
- `GameState` interface has `minimumBet?: number` (optional) but it's used without null checks

## What to Do — Step by Step

### Round 1: Fix Core Algorithms & Add Tests
1. Fix `isTerminalState()` — implement proper terminal detection (fold, all-in, betting complete)
2. Fix `computeTerminalPayoff()` — integrate with equity.ts for real hand evaluation
3. Fix `applyAction()` — handle fold immediately, track bets properly
4. Fix DCFR `updateRegrets()` — use correct discount factor (gamma for regret, alpha for strategy)
5. Fix `computeExploitability()` — implement real best-response computation
6. Write 20+ tests covering all fixes
7. Verify: `npm run build` && `npx tsc --noEmit` && `npx vitest run`

### Round 2: Type Safety & Solver API
1. Replace all `any` types in `dcfr.ts` with proper discriminated union narrowing
2. Implement `findInfoSet()` — traverse tree to find matching information set for hand/board
3. Implement `exportPIO()` — serialize strategies to PIO-compatible format
4. Add memoization to `solve()` — cache trees by board+street
5. Fix ternary narrowing issues (extract comparisons before ternaries)
6. Write 10+ tests for solver API
7. Verify: build + tests

### Round 3: Performance & Polish
1. Add early stopping when exploitability < minExploitability
2. Make equity sampling configurable (100/250/500/1000)
3. Cache game trees by (board, street, stackSize, potSize)
4. Fix Web Worker to actually use parallelism (spawn multiple workers for different board cards)
5. Add progress callbacks to solver API
6. Clean up unused imports/variables
7. Verify: build + tests + performance check

### Round 4: Final Verification
1. Run full test suite — target 250+ tests passing
2. Check for all TS6133/TS6196 unused variable warnings
3. Verify all public functions have JSDoc
4. Check git diff — only modified files should be gto-solver/ and related components
5. Write final report

## Success Criteria
- ✅ Build passes clean (`npm run build` && `npx tsc --noEmit`)
- ✅ All existing 221 tests pass + 30+ new GTO solver tests
- ✅ No `any` types in solver core (except for external integrations)
- ✅ Real terminal state detection and payoff computation
- ✅ Working exploitability calculation (< 1.0 bb for 100 iterations)
- ✅ PioFormat export produces valid output
- ✅ Info set lookup works for queried hands
- ✅ No unused imports, variables, or dead code
- ✅ All public functions have JSDoc
- ✅ Performance: solve completes in < 5s for 100 iterations on flop

## Important Notes
- Follow Karpathy guidelines: simplicity first, surgical changes, verify after each round
- Don't add features beyond what's listed — this is improvement, not expansion
- If a fix requires touching files outside `src/engine/gto-solver/`, note it and get approval
- Every change must be verified with build + tests before moving to next step
