# Task: Optimize PokerTrainer — fix remaining issues and improve performance

Project: C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer
Stack: React 19, TypeScript, Zustand, Tailwind CSS, Recharts, lucide-react

## What was already fixed (DO NOT REPEAT):
- SolverPage: node count safety limit (500k), try/catch around tree build
- solver.ts: collectStrategies recursion fixed, findInfoSet traversal improved, getStrategyForHand null checks
- game-tree.ts: RAISE action when currentBet is 0 (was computing 0)
- Persist: gameState removed from localStorage persistence
- CoachTips: switched from gameState subscription to gamePhase/handNumber/isPlaying primitives
- PlayerBadge: role badge moved to top-right, cards moved inside panel
- GameHistory: pagination (50 rows/page, prev/next arrows, smart ellipsis)
- SolverPage: expanded "How to Use" section, inline descriptions on all components
- Bot engine: integer enforcement, auto-refill, 10 new config parameters
- Auto-play: stat isolation for human vs T-Bot

## REMAINING ISSUES TO FIX:

### 1. Solver Page — Results not meaningful
The `findInfoSet` function is a simplified stub that returns the first ACTION node. It doesn't actually match the hero's hand to the right information set in the tree. The solver runs but returns generic strategy, not hand-specific strategy.

**Fix**: The solver builds a tree from the flop/turn/river state. The `findInfoSet` should traverse CHANCE nodes to find the branch matching the board, then return the ACTION node at that leaf. Currently it skips non-matching chance branches and returns null. Fix the traversal so it properly finds the right ACTION node.

### 2. Landing Page — "bugging"
Check the `LandingPage` component in App.tsx. The condition for showing it is:
```
{activeTab === 'play' && !isPlaying && !gameState && (
```
After removing gameState from persist, this should be fine. But verify no other rendering issues exist.

### 3. Performance — Overall optimization
The app is described as "laggy". Focus areas:

#### A. Lazy-load heavy components
- StatsDashboard (~142KB) — already Suspense-wrapped but not lazy-loaded
- SolverPage (~33KB) — same
- RulesPage (~13KB) — same
- AboutPage (~3KB) — same

Use React.lazy() + Suspense for all route-level components.

#### B. Reduce re-render frequency
- PokerTable renders on every game state change. Already uses React.memo and selectors. Check if sub-components need more granular selectors.
- PlayerControls renders on every state change. Check if it needs memoization.
- RiskOverlay renders on every state change. Check if it needs memoization.

#### C. Optimize the game loop
- The `useEffect` for bot actions (lines 90-157 in App.tsx) runs on every `gameState?.currentPlayerIndex` change. It schedules setTimeouts for each bot action. This creates many timers.
- Consider batching bot actions or using requestAnimationFrame instead of setTimeout.

#### D. Recharts optimization
- StatsDashboard uses Recharts for charts. Recharts re-renders the entire chart on every data change.
- Use `memo` on chart components, or switch to simpler SVG rendering for static data.

### 4. Code Quality
- Remove any `// TODO` comments that are now resolved
- Ensure all components have `displayName`
- Check for any unused imports
- Verify TypeScript strict mode compliance

## FILES TO MODIFY:
1. `src/App.tsx` — Add React.lazy for route components, optimize landing page condition
2. `src/components/PlayerControls.tsx` — Add React.memo, optimize selectors
3. `src/components/RiskOverlay.tsx` — Add React.memo, optimize selectors
4. `src/components/PokerTable.tsx` — Review selector granularity
5. `src/engine/gto-solver/solver.ts` — Fix findInfoSet traversal
6. `src/pages/SolverPage.tsx` — Verify no crashes, optimize re-renders
7. `src/components/StatsDashboard.tsx` — Lazy-load, optimize Recharts

## CONSTRAINTS:
- Karpathy guidelines: surgical changes, minimum code, match existing style
- Build MUST pass: `npm run build && npx tsc --noEmit`
- No breaking changes to existing API or UI behavior
- Keep the dark theme design consistent

## DELIVERY:
- After making changes, run `npm run build` and `npx tsc --noEmit`
- Report what was changed and why
- Report build output (module count, bundle sizes)