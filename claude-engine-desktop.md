# Training Bot — Engine Package & Tauri Desktop Scaffolding

## Context
PokerTrainer at `C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer`.
Build: clean. Tests: 250/250 passing.

DeepSeek CC Round 12 just added the Download/Import UI to TrainingBotSettings. Now we need the engine package and desktop scaffolding.

## Your Tasks

### 1. Build the engine package
`packages/engine/` exists with package.json and tsconfig.json. Create the barrel export:
- `packages/engine/src/index.ts` — re-exports everything from pokertrainer src
- Must export: gto-solver types/functions, trainingBot types/functions, strategies, utils (handEvaluator, botEngine, equity, deck, sidePot), types
- Run `cd packages/engine && npm install && npm run build` — should produce dist/ with .js and .d.ts files

### 2. Create Tauri desktop scaffolding
Create `packages/desktop/` with minimal Tauri project:
- `packages/desktop/package.json` — Tauri React project
- `packages/desktop/src-tauri/Cargo.toml` — Rust dependencies (tauri, tauri-plugin-shell)
- `packages/desktop/src-tauri/build.rs` — Tauri build script
- `packages/desktop/src-tauri/tauri.conf.json` — Tauri config
- `packages/desktop/src-tauri/src/main.rs` — Rust entry point
- `packages/desktop/src/main.tsx` — React entry point (imports @pokertrainer/engine)
- `packages/desktop/src/App.tsx` — Simple app showing TrainingBotSettings

### 3. Create desktop module stubs
Create stub interfaces for future implementation:
- `packages/desktop/src/desktop/screenCapture.ts` — stub for screen capture module
- `packages/desktop/src/desktop/inputSimulator.ts` — stub for mouse/keyboard control
- `packages/desktop/src/desktop/multiTable.ts` — stub for multi-table orchestrator

### 4. Add download-config feature to engine package
The engine package should export a `downloadConfig` function that works standalone (no React dependency).

## Constraints
- **Karpathy Guidelines**: Surgical changes only. Don't rewrite working code.
- **Minimal**: Build the structure, don't implement full features yet.
- **TypeScript ternary narrowing**: Extract comparisons into boolean consts before ternaries.
- **Build must pass** after every change.

## Success Criteria
1. `packages/engine` builds cleanly with `npm run build`
2. `packages/desktop` Tauri project structure exists and compiles
3. Desktop stubs are properly typed interfaces
4. Root project still builds and all 250 tests pass
