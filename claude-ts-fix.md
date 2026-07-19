# Fix TypeScript Errors & Polish Desktop App Builder

## Context
PokerTrainer at `C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer`.
Build: FAILING. Tests: 250/250 passing.

## TypeScript Errors to Fix:
1. `src/utils/desktopAppBuilder.ts` — imports wrong path, uses `Deno` (not available in browser)
2. `src/engine/gto-solver/game-tree.test.ts` — `range1` not in `TreeBuilderSettings`
3. `src/engine/gto-solver/game-tree.ts` — `evaluateHandRank` not exported from `equity`
4. `src/engine/gto-solver/index.ts` — double export of `SolveResult`
5. `src/engine/gto-solver/solver.ts` — `evaluateShowdown` not exported from `equity`

## Tasks:

### 1. Fix desktopAppBuilder.ts
- Remove `Deno` usage (not available in browser)
- Replace with `fetch` API for file system checks
- Simplify `checkTauriInstalled()` to return placeholder
- Simplify `buildDesktopApp()` to show instructions instead of running cargo

### 2. Fix GTO solver TypeScript errors
- Check what's actually exported from `equity.ts`
- Fix imports in `game-tree.ts` and `solver.ts`
- Fix double export in `index.ts`
- Fix test file `game-tree.test.ts` — use correct property names

### 3. Polish DesktopAppBuilder component
- Make it actually useful in the browser
- Add clear instructions for building the Tauri app
- Add link to GitHub Releases page
- Show prerequisites checklist

## Constraints
- **Karpathy Guidelines**: Minimal changes, surgical fixes only
- **No speculative features**: Fix what's broken
- **Build must pass**: `npm run build` and `npx tsc --noEmit` must succeed
- **Tests must pass**: 250/250 tests still passing

## Success Criteria
1. `npm run build` passes clean
2. `npx tsc --noEmit` passes clean
3. `npx vitest run` — 250/250 tests pass
4. DesktopAppBuilder component renders without errors
5. No unused imports or dead code
