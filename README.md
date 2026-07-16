# PokerTrainer 🎰

> **Texas Hold'em Poker Training Simulator** — Practice against AI opponents, train your custom bot, and track detailed statistics.

![Version](https://img.shields.io/badge/version-1.0.0-gold)
![React](https://img.shields.io/badge/react-19.2-blue)
![TypeScript](https://img.shields.io/badge/typescript-6.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎯 Overview

PokerTrainer is a single-page Texas Hold'em simulator built for poker practice and AI bot training. Play against configurable AI opponents, configure your own training bot ("T-Bot") with custom aggression, bluffing, and accuracy settings, then analyze your performance with detailed statistics and charts.

**No real money. No sign-up. All data stored locally in your browser.**

---

## ✨ Features

### 🃏 Full Poker Engine
- Texas Hold'em with proper betting rounds (preflop → flop → turn → river)
- Blind posting, dealer rotation, and position tracking
- Side pot calculation for multi-way all-in scenarios
- Complete hand evaluation (all 10 hand categories with tie-breaking)
- Win probability and equity estimation

### 🤖 AI Opponents & Training Bot
- **4 opponent personalities:** Tight-Aggressive, Loose-Aggressive, Tight-Passive, Balanced
- **Configurable T-Bot:** Adjust aggression, bluff frequency, decision accuracy, and reaction time
- Realistic bot behavior with tilt mechanics, bet sizing heuristics, and mistake simulation
- **Auto-play mode:** Watch your T-Bot play hands automatically

### 📊 Statistics & Analytics
- Win rate, ROI, and bankroll history tracking
- Per-position stats (SB, BB, UTG, MP, CO, BTN)
- Hand strength category analysis
- Bluff success rate tracking
- Decision accuracy vs bot recommendations
- Interactive charts via Recharts

### 🎨 Premium UI
- Dark poker-themed design system with custom animations
- Interactive poker table with chip fly and card deal animations
- Real-time risk overlay with win probability and pot odds
- Fully responsive — works on desktop and mobile
- Keyboard shortcuts for all actions (F/C/X/R/A)
- Skip navigation and ARIA labels for accessibility

### 💾 Data Management
- Automatic localStorage persistence via Zustand
- Export full game data as JSON
- Import and restore from backup files
- Periodic auto-backup snapshots
- Settings export/import for sharing configurations

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ 
- npm 9+

### Install & Run

```bash
# Clone the repository
git clone https://github.com/s4lmon778/pokertrainer.git
cd pokertrainer

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **http://localhost:5173** in your browser.

### Build for Production

```bash
npm run build
npm run preview  # Preview the production build
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **F** | Fold |
| **C** | Call / Check |
| **X** | Check (when no bet to call) |
| **R** | Raise (2× current bet) |
| **A** | All-In |
| **Esc** | Cancel / Deselect |

Shortcuts work when it's your turn and no text input is focused.

---

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── PokerTable.tsx       # Main table visual
│   ├── PlayerControls.tsx   # Action buttons
│   ├── RiskOverlay.tsx      # Equity/pot odds sidebar
│   ├── SettingsPanel.tsx    # Game & bot configuration
│   ├── StatsDashboard.tsx   # Analytics & charts
│   ├── GameHistory.tsx      # Hand history table
│   ├── CoachTips.tsx        # Strategy tips system
│   ├── ErrorBoundary.tsx    # Error recovery
│   ├── RulesPage.tsx        # Poker rules reference
│   └── AboutPage.tsx        # App info
├── store/
│   └── gameStore.ts         # Zustand state management
├── utils/
│   ├── botEngine.ts         # AI decision engine
│   ├── handEvaluator.ts     # Hand ranking
│   ├── equity.ts            # Win probability
│   ├── sidePot.ts           # Side pot calculation
│   ├── deck.ts              # Card/deck utilities
│   ├── analytics.ts         # Event tracking
│   ├── monitoring.ts        # Error/performance monitoring
│   ├── backup.ts            # Data export/import
│   ├── sanitize.ts          # XSS protection
│   └── chipDenominations.ts # Chip formatting
├── i18n/
│   └── translations.ts      # Multi-language support
├── hooks/                   # Custom React hooks
└── types/
    └── card.ts              # TypeScript type definitions
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

**143 tests** across 7 test files covering all utility modules.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| [React 19](https://react.dev) | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Vite 8](https://vite.dev) | Build tool |
| [Zustand](https://zustand.docs.pmnd.rs/) | State management |
| [Tailwind CSS](https://tailwindcss.com) | Styling |
| [Recharts](https://recharts.org) | Data visualization |
| [Lucide React](https://lucide.dev) | Icons |
| [Vitest](https://vitest.dev) | Testing |
| [Oxlint](https://oxc.rs) | Linting |

---

## 🚢 Deployment

### GitHub Pages

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys to GitHub Pages on pushes to `master`.

### Manual Deployment

```bash
# Build with GitHub Pages base path
VITE_PAGES_BASE=true npm run build

# Deploy the dist/ directory to your hosting provider
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

---

## 📊 Monitoring

PokerTrainer includes built-in monitoring for production use:

- **Error tracking:** Automatic exception capture with breadcrumb context
- **Performance metrics:** Core Web Vitals (LCP, CLS) and custom timing
- **Analytics:** Privacy-respecting event tracking with opt-in consent
- **Crash recovery:** Automatic page reload after repeated crashes

To enable production monitoring, configure your error/analytics endpoints in `src/utils/monitoring.ts`.

---

## 🔒 Privacy & Security

- **All data is local:** Game data, statistics, and settings are stored in your browser's localStorage
- **No tracking by default:** Analytics are opt-in only
- **No PII collected:** No personally identifiable information is ever sent anywhere
- **Input sanitization:** All user inputs are sanitized against XSS
- **No backend:** The app runs entirely in your browser

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Ensure build passes (`npm run build`)
6. Commit using conventional commits
7. Push and open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## 📝 License

MIT License — see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

- Poker hand evaluation logic inspired by standard poker ranking algorithms
- Bot personality archetypes based on common poker player classifications
- UI design system influenced by modern poker platforms and dark-themed dashboards

---

**Made with ♠️♥️♣️♦️ for poker enthusiasts and AI/ML practitioners.**
