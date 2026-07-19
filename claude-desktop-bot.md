# Training Bot — Desktop App Preparation & Download Feature

## Context
PokerTrainer at `C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer`. React 19 + TypeScript + Vite + Zustand + Tailwind CSS.

We just added config export/download to TrainingBotSettings.tsx. Now we need to prepare the engine for the standalone desktop app and ensure the download feature works.

## Your Tasks (use Karpathy guidelines — surgical, minimal changes)

### 1. Fix the TrainingBotSettings download/import UI
The imports were just added to TrainingBotSettings.tsx but the UI buttons and handlers are NOT implemented yet. Add:
- A "Download Config" button that calls `downloadConfig(localConfig)` 
- An "Import Config" button with a hidden file input that calls `importConfig(file)`
- A "Copy to Clipboard" button that copies the JSON config
- A "View Summary" that shows `configSummary(localConfig)`
- These should be in a new "Export" section at the top of the settings panel
- Use the imported icons: Download, Upload, FileJson, Package

### 2. Create the standalone engine package
`packages/engine/` already has package.json and tsconfig.json. Create the barrel export:
- `packages/engine/src/index.ts` — re-exports everything from the pokertrainer src
- Make sure it exports: gto-solver, trainingBot, strategies, utils (handEvaluator, botEngine, equity, deck, sidePot), types
- Build it: `cd packages/engine && npm run build` — should produce dist/ with .js and .d.ts files

### 3. Add Tauri desktop app scaffolding
Create a minimal Tauri project structure that can eventually wrap the engine:
- `packages/desktop/` directory
- `packages/desktop/package.json` — Tauri project config
- `packages/desktop/src-tauri/` — Tauri Rust backend config
- The desktop app should:
  - Import `@pokertrainer/engine` as a dependency
  - Have a simple React frontend that loads the TrainingBotSettings UI
  - Include screen capture and input simulation stubs (for future implementation)
  - Support building for Windows (.exe), macOS (.dmg), Linux (.AppImage)

### 4. Add desktop-specific modules (stubs for now)
Create these files with proper interfaces:
- `packages/desktop/src-tauri/src/screen_capture.rs` — Rust module for screen capture (stub)
- `packages/desktop/src-tauri/src/input_simulator.rs` — Rust module for mouse/keyboard control (stub)
- `packages/desktop/src/lib.rs` — Tauri command definitions
- These should compile but not be fully implemented — just the structure

### 5. Verify everything works
- `npm run build` in root project passes
- `npx vitest run` — all 250 tests pass
- `cd packages/engine && npm run build` — engine package builds cleanly
- No TypeScript errors anywhere

## Constraints
- **Karpathy Guidelines**: Minimal changes, surgical fixes only. Don't rewrite things that work.
- **No speculative features**: Build the download UI, engine package, and Tauri scaffolding. Don't implement full screen capture or OCR yet.
- **TypeScript ternary narrowing**: Extract comparisons into boolean consts before ternaries
- **Build must pass** after every change

## Success Criteria
1. TrainingBotSettings has working Download/Import/Export buttons
2. `@pokertrainer/engine` package builds and exports all types/functions
3. Tauri desktop project structure exists and compiles (even if stubs)
4. All 250 tests still pass
5. Root build passes clean
