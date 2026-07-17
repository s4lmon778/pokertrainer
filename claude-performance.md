# Performance Optimization Plan — PokerTrainer

Project: C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer
Stack: React 19, Zustand, Tailwind CSS, Recharts, lucide-react

## Current State Analysis
The app feels laggy. Likely causes:
1. **Inline arrow functions in JSX** — creates new function refs every render, breaking memoization
2. **Large components without memoization** — PokerTable (8 memo), SolverPage (2 memo), SettingsPanel (9 memo)
3. **useEffect-heavy components** — CoachTips (10 effects), GameHistory (2 effects) with complex deps
4. **Zustand store without selective selectors** — full store re-renders components
5. **No React.lazy for heavy components** — StatsDashboard (141KB gzipped) loads eagerly
6. **Inline objects in JSX** — style objects, config objects recreated each render
7. **Missing React.memo on frequently-rendered components** — PlayerControls, BotSeat, CardDisplay

## Optimization Strategy (Priority Order)

### Phase 1: Critical (Immediate impact)
1. **Extract inline arrow functions** — move all `onClick={() => ...}` handlers to useCallback or stable function refs
2. **Memoize all components** — wrap every component in React.memo with proper prop comparisons
3. **Lazy-load heavy components** — StatsDashboard, SolverPage, RulesPage via React.lazy + Suspense
4. **Stabilize Zustand selectors** — ensure every component uses specific selectors, not full store

### Phase 2: Medium (Rendering optimization)
5. **Memoize computed values** — wrap expensive calculations in useMemo (hand evaluation, stats computation, range filtering)
6. **Remove unnecessary re-renders** — use `shouldComponentUpdate` logic via React.memo + stable refs
7. **Optimize PokerTable** — it's the most-rendered component (every frame during game). Memoize BotSeat, CardDisplay, PlayerBadge sub-components
8. **Batch Zustand updates** — combine related state changes into single `set()` calls

### Phase 3: Fine-tuning
9. **Virtualize long lists** — GameHistory pagination already done, but ensure list rendering is efficient
10. **Reduce useEffect frequency** — CoachTips has 10 effects, consolidate where possible
11. **Code-split by route** — separate game tab, stats tab, solver tab, settings tab bundles
12. **Profile and verify** — measure before/after with React Profiler

## Constraints
- Karpathy guidelines: surgical changes, minimum code, match existing style
- DeepSeek CC: avoid ternary narrowing traps on discriminated unions
- react-state-patterns: use Zustand selectors, stabilize useEffect deps, avoid inline arrows
- caveman: compressed output, no verbose explanations
- NO em-dashes anywhere
- Build must pass: npm run build && npx tsc --noEmit

## Files to modify (priority order):
1. src/components/PokerTable.tsx — most critical, renders every frame
2. src/components/PlayerControls.tsx — inline arrows, needs memo
3. src/components/CoachTips.tsx — 10 useEffects, consolidate
4. src/components/StatsDashboard.tsx — 141KB, lazy-load
5. src/pages/SolverPage.tsx — lazy-load, memoize sub-components
6. src/components/SettingsPanel.tsx — memoize, extract callbacks
7. src/components/GameHistory.tsx — memoize, stabilize callbacks
8. src/App.tsx — lazy-load heavy components, extract inline handlers
9. src/store/gameStore.ts — batch updates, add selectors
10. src/components/RangeSelector.tsx — memoize matrix rendering

## Verification
After each phase: `npm run build && npx tsc --noEmit`
Final: verify all pages load, all interactions work, no regressions.
