# PokerTrainer — Deep Continuous Improvement Round 15

## Context
PokerTrainer at `C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer`.
Build: clean. Tests: 250/250 passing.

Just fixed: CoachTips z-index (90→100) so tips appear above other UI.

## Your Task — Systematic Code Quality Improvements

Use these skills: `karpathy-guidelines`, `simplify-code`, `requesting-code-review`.

### 1. Performance — Memoize Expensive Operations
Check `src/store/gameStore.ts` for expensive computations that run on every state change. Add `useMemo`/`useCallback` where appropriate.

### 2. Code Quality — Remove Dead Code
Scan all components for:
- Unused state variables
- Dead branches in conditionals
- Orphaned imports
- Console.log statements

### 3. Accessibility — Add ARIA Labels
Ensure all interactive elements have proper `aria-label` or `aria-describedby` attributes.

### 4. Desktop App — Fix Tailwind Config
`packages/desktop/` has a Tailwind content warning. Fix the `tailwind.config.js` to include proper content sources.

### 5. Engine Package — Clean Up Build Artifacts
Ensure `packages/engine/dist/` only contains the barrel export, not the full src tree.

## Constraints
- **Karpathy Guidelines**: Minimal changes. Every changed line must trace to a specific issue.
- **No speculative features**: Fix what's broken or suboptimal. Don't add new features.
- **TypeScript ternary narrowing**: Extract comparisons into boolean consts before ternaries.
- **Build must pass** after every change.

## Success Criteria
1. `npm run build` passes clean
2. `npx vitest run` — 250/250 tests pass
3. No unused imports or dead code
4. Desktop Tailwind config fixed
5. Engine package dist is clean
