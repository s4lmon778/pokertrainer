# Task 4 Report: Real Exploitative Strategy

## Summary
Implemented a real exploitative strategy that adjusts GTO baseline decisions based on observed opponent tendencies.

## Files Changed
| File | Action | Lines |
|------|--------|-------|
| `src/engine/strategies/exploitative.ts` | Modified | 124 (was 67) |
| `src/engine/strategies/exploitative.test.ts` | Created | 104 |

## What Was Implemented

### `exploitative.ts`
- **Core logic**: Calls GTO strategy first, then applies exploitative adjustments if sufficient opponent data exists
- **Data gathering**: Finds the most relevant opponent observation (highest `handsObserved` among active opponents)
- **Fallback**: Returns GTO decision when no observations, empty map, or insufficient sample size (< `config.observationHands`)
- **Four adjustment paths**:
  1. **Fold-to-cbet > 70%** + GTO raises → flip to bluff, boost confidence
  2. **VTA < 15%** + GTO checks → raise for value vs tight opponent
  3. **Bluff freq > 20%** + GTO folds → call (bluff catch)
  4. **Aggression < 30%** + GTO checks → raise for value vs passive opponent
- **Every path includes `reactionTime`**: Adjusted by 0.8×–1.2× multiplier based on decision complexity

### `exploitative.test.ts`
- 4 tests covering: no observations fallback, metadata validation, empty map fallback, insufficient sample size fallback

## Verification Results
| Check | Result |
|-------|--------|
| `npm run build` | ✅ Clean (tsc + vite) |
| `npx tsc --noEmit` | ✅ Clean |
| `npx vitest run exploitative.test.ts` | ✅ 4/4 passing |
| `git diff --stat` | exploitative.ts modified, exploitative.test.ts created |

## Self-Review
- **reactionTime**: ✅ Present on all decision paths (4 adjustments + GTO fallback)
- **JSDoc**: ✅ Module-level and function-level documentation present
- **Type safety**: ✅ All imports properly typed, no `any` usage
- **No regressions**: ✅ Existing GTO strategy untouched, build clean

## Concerns
1. **`_config` unused in adjustments**: The function signature accepts `config` but doesn't use it in `applyExploitativeAdjustments`. Hardcoded thresholds (0.7, 0.15, 0.2, 0.3) could be made configurable. Low priority — acceptable for now.
2. **First-match-wins**: The four adjustment conditions are checked sequentially with early returns. If multiple conditions are true, only the first applies. This is intentional (prioritize strongest signal) but worth noting.
3. **No test for actual adjustment behavior**: The tests verify GTO fallback paths but don't test that adjustments actually fire when conditions are met. Could add in a future task.

## Commit
Pending (to be committed after report).
