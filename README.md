<p align="center">
  <img src="https://img.shields.io/badge/status-active-success" alt="Active">
  <img src="https://img.shields.io/github/v/release/s4lmon778/pokertrainer?label=version" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript" alt="TS 6">
  <img src="https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri" alt="Tauri 2">
</p>

# PokerTrainer ♠️♥️♣️♦️

**Autonomous poker training & analysis platform** — play against configurable AI opponents, analyse hands with a GTO solver, and run autonomous training sessions on real poker sites via the desktop app.

## ✨ Features

### 🃏 Interactive Poker Table
Realistic Texas Hold'em with multi-way pots, side pots, chip stacks, and full betting controls (fold/check/call/raise/all-in with keyboard shortcuts).

### 🤖 AI Opponents
4 distinct bot archetypes with configurable aggression, bluffing, and mistake rates:
- **TAG** (Tight-Aggressive) — Classic winning style
- **LAG** (Loose-Aggressive) — High-variance pressure
- **Nit** — Premium hands only, fold everything else
- **Balanced** — Mixed strategy with human-like imperfections

### 🧮 GTO Solver
Discounted Counterfactual Regret Minimization (DCFR) engine computing Nash equilibrium strategies. PioSolver-compatible output with interactive strategy charts.

### 🎯 Training Bot (Desktop)
Standalone autonomous bot engine that plays on real poker sites via screen capture and input simulation. Strategy presets:
- **GTO** — Game Theory Optimal baseline
- **Exploitative** — Adapts to opponent tendencies
- **Adaptive** — Blends GTO + exploitation by sample size

### 📊 Strategy Charts
Color-coded hand matrices showing action frequencies (fold/check/bet/raise) for any board texture.

### 📈 Stats Dashboard
Win rate, ROI, position stats, hand strength categories, bluff performance, bankroll history — all tracked across sessions.

### 🛡️ Coaching & Analysis
Context-aware poker tips, risk overlay with real-time EV/pot odds, hand history with CSV/PGN export, mistake detection.

### 🏗️ Desktop Automation (Windows)
The included desktop app captures screen output from any poker client, reads cards via template-matching OCR, and simulates mouse/keyboard input with human-like motion curves — enabling fully autonomous play.

## 📦 Download

**[⬇️ Download Latest Release](https://github.com/s4lmon778/pokertrainer/releases/latest)**

| Asset | Format |
|-------|--------|
| `PokerBot-*-Setup.exe` | Windows installer (NSIS) |
| `PokerBot-*-en-US.msi` | Windows MSI package |

**Requirements:** Windows 10/11 (64-bit), no Rust toolchain needed.

## 🚀 Quick Start

### Web App
```bash
npm install
npm run dev       # → http://localhost:5173
npm run build     # Production build
npx vitest run    # Run 250+ tests
```

### Desktop Bot (Development)
```bash
cd packages/desktop
npm install
npm run tauri dev       # Dev mode with hot reload
npm run tauri build     # Production installer
```

## 🏗️ Project Structure

```
pokertrainer/
├── packages/
│   ├── engine/              # Core poker engine (npm workspace)
│   │   ├── gto-solver/      # DCFR solver (types, game tree, equity)
│   │   └── strategies/      # Bot strategies (GTO, exploitative, adaptive)
│   └── desktop/             # Tauri desktop app
│       └── src-tauri/       # Rust backend (screen capture, input sim)
├── src/                     # Web app (web-ui package)
│   ├── components/          # React components
│   │   ├── PokerTable.tsx
│   │   ├── GTOSolver.tsx
│   │   ├── StrategyChart.tsx
│   │   └── TrainingBotSettings.tsx
│   ├── store/               # Zustand state management
│   └── utils/               # Utilities
├── docs/                    # Documentation
└── README.md               ← you are here
```

## 🧪 Testing

```bash
npx vitest run              # All 250+ tests
npx vitest run src/utils/botEngine.test.ts  # Single file
npx vitest                  # Watch mode
npm run build               # Verify clean build
```

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript 6 + Vite (Rolldown) |
| **Styling** | Tailwind CSS 3.4 with custom poker theme |
| **State** | Zustand 5 (localStorage persistence) |
| **Charts** | Recharts + Lucide React icons |
| **Desktop** | Tauri 2 (Rust backend) |
| **Testing** | Vitest 4 (250+ tests) |
| **CI/CD** | GitHub Actions → GitHub Pages |

## 📖 Documentation

- [Training Bot Architecture](docs/TRAINING_BOT.md) — Strategy system, presets, configuration
- [GTO Solver Implementation](docs/GTO_SOLVER_IMPLEMENTATION.md) — DCFR algorithm, game tree, API
- [Desktop App Blueprint](docs/DESKTOP_APP_BLUEPRINT.md) — Screen capture, input simulation, multi-table
- [Changelog](CHANGELOG.md) — Version history

## 🤝 Contributing

PRs welcome. See the [docs](docs/) for architecture guides.

## 🧠 Credits

- [shark-2.0](https://github.com/24parida/shark-2.0) — Original C++ DCFR solver architecture
- PioSolver — Strategy chart visualization inspiration

## 📄 License

MIT
