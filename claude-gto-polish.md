# PokerTrainer DeepSeek CC Round 11 — GTO Solver Polish & Bug Fixes

## Context
PokerTrainer is a React 19 + TypeScript poker training app with a GTO solver, Training Bot engine, and strategy visualization. We're using DeepSeek CC (Claude Code via DeepSeek proxy) with Karpathy guidelines for surgical, minimal improvements.

## Current State
- Build: Clean
- Tests: 250/250 passing (13 test files)
- Last commits: GTO solver UI, strategy charts, README, bot engine preflop fix
- Working directory: `C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer`

## Your Task
Review the GTO solver implementation and fix any bugs, improve code quality, and ensure everything is production-ready. Focus on:

1. **GTO Solver Core** (`src/engine/gto-solver/`):
   - Check for TypeScript errors, unused imports, dead code
   - Verify the DCFR algorithm implementation matches the plan
   - Ensure equity calculator is correct
   - Fix any game tree building issues

2. **GTO Solver UI** (`src/components/GTOSolver.tsx`, `StrategyChart.tsx`):
   - Check for React best practices
   - Verify the solver actually works end-to-end
   - Fix any rendering issues

3. **Integration**:
   - Ensure the GTO solver integrates properly with the Training Bot strategies
   - Check that the Rules page displays the solver correctly

## Constraints
- **Karpathy Guidelines**: Minimal changes, surgical fixes only
- **No speculative features**: Fix what's broken, don't add new features
- **Verify after each change**: Run `npm run build` and `npx vitest run`
- **TypeScript ternary narrowing**: Extract comparisons into boolean consts before ternaries
- **Bash escaping**: Use `$(cat prompt.md)` not inline prompts with special chars

## Success Criteria
- `npm run build` passes clean
- `npx vitest run` passes all 250 tests
- No TypeScript errors or warnings
- GTO solver UI renders correctly
- Code is clean, well-documented, and production-ready

## Commands
```bash
# Build
npm run build

# Tests
npx vitest run

# Check for TS errors
npx tsc --noEmit
```

## Notes
- The GTO solver uses Discounted CFR (DCFR) algorithm
- Strategy charts are Pio-style color-coded hand matrices
- Training Bot has 3 strategies: GTO, Exploitative, Adaptive
- All components are already integrated into the app
