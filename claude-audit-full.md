# PokerTrainer — Full Component Audit & Optimization

## Context
PokerTrainer at `C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer`.
Build: Clean. Tests: 250/250 passing. No unused imports.

## Architecture
```
packages/
├── engine/        — @pokertrainer/engine (standalone npm package)
└── desktop/       — @pokertrainer/desktop (Tauri v2 app)
src/
├── components/    — React UI components
├── engine/        — Training Bot engine, strategies, GTO solver
├── store/         — Zustand stores
├── types/         — TypeScript types
├── utils/         — Utility functions
└── main.tsx       — Entry point
```

## Your Task — Comprehensive Audit

Use these skills to reduce token usage and improve code quality:
- `karpathy-guidelines` — Minimal, surgical changes only
- `simplify-code` — Remove dead code, consolidate duplicates
- `requesting-code-review` — Review all components for issues
- `testing` — Run tests after each change

### 1. Review All Components for Issues

Check every component in `src/components/` for:
- Dead/unreachable code
- Unnecessary re-renders (memoization opportunities)
- Accessibility issues (missing ARIA labels, keyboard nav)
- Performance bottlenecks (expensive computations in render)
- Code duplication (DRY violations)
- TypeScript strictness issues

### 2. Review Engine Modules

Check `src/engine/` for:
- Unused exports
- Inconsistent error handling
- Missing JSDoc comments
- Performance optimizations (memoize expensive functions)

### 3. Review Desktop App

Check `packages/desktop/` for:
- Missing Tailwind content configuration
- Unused imports in React components
- Proper Tauri command integration
- Build warnings

### 4. Fix Any Issues Found

Apply fixes surgically:
- Remove dead code
- Add memoization where beneficial
- Fix accessibility issues
- Consolidate duplicates
- Improve error handling

## Constraints
- **DO NOT rewrite working code** — only fix what's broken or suboptimal
- **Keep changes minimal** — every changed line must trace to a specific issue
- **Verify after each fix** — run `npm run build` and `npx vitest run`
- **No speculative features** — focus on quality, not new functionality

## Success Criteria
1. All 250 tests still pass
2. Build passes with zero errors/warnings
3. No unused code or imports
4. All components have proper accessibility attributes
5. Performance-critical paths are memoized
6. Desktop app builds cleanly
