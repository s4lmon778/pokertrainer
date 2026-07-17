# PokerTrainer

Interactive poker training application with GTO solver, bot AI, and strategy visualization.

## Features

- **Poker Table**: Realistic Texas Hold'em with multi-way pots, side pots, and chip stacks
- **Bot AI**: 4 personality archetypes (TAG, LAG, Nit, Balanced) with configurable aggression, bluffing, and mistake rates
- **GTO Solver**: Discounted CFR solver with Pio-style strategy charts
- **Training Bot**: Autonomous bot engine with strategy presets (GTO, Exploitative, Adaptive)
- **Strategy Charts**: Color-coded hand matrices showing action frequencies
- **Game History**: Detailed hand logs with human accuracy tracking
- **Stats Dashboard**: Win rate, ROI, position stats, hand strength tracking

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **State**: Zustand
- **Charts**: Recharts
- **Icons**: Lucide React
- **Testing**: Vitest

## Getting Started

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run tests
npx vitest run
```

## Project Structure

```
src/
├── components/     # React components
│   ├── GTOSolver.tsx       # GTO solver UI
│   ├── PokerTable.tsx      # Main table visualization
│   ├── StrategyChart.tsx   # Pio-style hand matrices
│   ├── TrainingBotSettings.tsx  # Bot configuration UI
│   └── ...
├── engine/         # Core game logic
│   ├── gto-solver/         # GTO solver (DCFR, equity, game tree)
│   ├── strategies/         # Bot strategies (GTO, exploitative, adaptive)
│   └── trainingBot.ts      # Training bot engine
├── store/          # State management
│   └── gameStore.ts        # Zustand store
├── utils/          # Utilities
│   ├── botEngine.ts        # Bot decision engine
│   ├── handEvaluator.ts    # Hand strength evaluation
│   ├── sidePot.ts          # Side pot calculation
│   └── equity.ts           # Equity calculations
└── types/          # TypeScript types
    └── card.ts             # Card, Player, GameState types
```

## GTO Solver

The GTO solver uses Discounted Counterfactual Regret Minimization (DCFR) to compute Nash equilibrium strategies.

### Usage

```typescript
import { solve, getStrategyForHand } from './engine/gto-solver/solver';

const result = solve(board, heroRange, villainRange, {
  stackSize: 100,
  potSize: 2,
  iterations: 100,
});

const strategy = getStrategyForHand(result, heroHand, board);
```

### Components

- `GTOSolver`: Interactive solver with range selectors
- `StrategyChart`: Color-coded hand frequency matrix
- `MultiActionChart`: Side-by-side action comparison

## Training Bot

The Training Bot is a detachable engine for autonomous poker play.

### Strategies

- **GTO**: Game Theory Optimal baseline strategy
- **Exploitative**: Adapts to opponent tendencies
- **Adaptive**: Learns and adjusts over time

### Configuration

Access via the "Training Bot" tab in the app UI, or programmatically:

```typescript
import { useGameStore } from './store/gameStore';

const updateConfig = useGameStore.getState().updateTrainingBotConfig;
updateConfig({ strategy: 'gto', aggression: 0.7 });
```

## Testing

```bash
# Run all tests
npx vitest run

# Run specific test file
npx vitest run src/utils/botEngine.test.ts

# Watch mode
npx vitest
```

## Credits

Based on concepts from:
- [shark-2.0](https://github.com/24parida/shark-2.0) — C++ CFR solver architecture
- PioSolver — Strategy chart visualization

## License

MIT
