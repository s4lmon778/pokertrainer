# GTO Solver Round 2 — Tests & Remaining Issues

## Context
Claude Code Round 1 completed. Build passes clean, 221/221 tests pass. 6 files modified with significant improvements to core algorithms and type safety.

## What Needs to Be Done Now

### 1. Write Comprehensive Tests for GTO Solver
The entire GTO solver has ZERO test coverage. Write tests for:

**dcfr.ts:**
- `regretMatching()` — test uniform distribution, non-uniform, all-negative
- `encodeSignedSlice()` / `decodeWithDiscount()` — test roundtrip accuracy
- `DCFRImpl.updateRegrets()` — test discount factor application
- `DCFRImpl.getCurrentStrategy()` — test convergence over iterations

**game-tree.ts:**
- `buildGameTree()` — test tree structure, node counts
- `getLegalActions()` — test fold/check/bet/raise scenarios
- `applyAction()` — test state transitions for each action type
- `getTreeStats()` — test node counting accuracy

**equity.ts:**
- `cardIndexToString()` / `stringToCardIndex()` — test roundtrip
- `computeHandEquity()` — test known positions (AA vs random)

**solver.ts:**
- `solve()` — test basic solve completes without error
- `getStrategyForHand()` — test returns strategy map
- `exportPIO()` — test format is PIO-compatible

**Target: 30+ new tests**

### 2. Fix Remaining Issues from Round 1
- `computeExploitability()` still returns placeholder — implement real best-response
- Web Worker doesn't use real parallelism — fix or mark as TODO
- Performance: add caching for game trees (memoize by board+street+stack)
- Early stopping when exploitability < threshold
- Check for unused imports/variables (TS6133, TS6196)
- Verify all public functions have JSDoc

### 3. Verify Everything
- `npm run build` — must pass
- `npx tsc --noEmit` — must pass (check for TS6133 warnings)
- `npx vitest run` — all 221+ tests must pass
- `git diff --stat` — only gto-solver/, components, and test files changed

## Constraints
- NO new npm dependencies
- Every new public function needs JSDoc
- TypeScript ternary narrowing trap: extract comparisons before ternaries
- Windows git-bash: POSIX syntax, LF→CRLF warnings are harmless

## Success Criteria
- ✅ 30+ new tests for GTO solver, all passing
- ✅ Total tests: 250+
- ✅ No `any` types in solver core
- ✅ Real exploitability calculation (< 1.0 bb for 100 iterations)
- ✅ pioFormat export produces valid output
- ✅ No unused imports/variables
- ✅ All public functions have JSDoc
- ✅ Build passes clean
