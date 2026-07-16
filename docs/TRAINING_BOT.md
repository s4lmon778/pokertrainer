# Training Bot — Architecture & Integration Guide

## Overview

The Training Bot is a configurable poker AI engine designed to serve as the foundation for a standalone downloadable desktop application. The engine is **platform-agnostic** — the same code runs in both the web application and the future desktop app.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Training Bot Engine                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Strategy    │  │ Simulation   │  │ Humanization  │  │
│  │ Layer       │  │ Layer        │  │ Layer         │  │
│  │             │  │              │  │               │  │
│  │ • GTO       │  │ • Equity     │  │ • Reaction    │  │
│  │ • Exploit.  │  │ • Range      │  │   Times       │  │
│  │ • Adaptive  │  │   Analysis   │  │ • Tells       │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Configuration Layer                     │   │
│  │  • 25+ adjustable parameters                      │   │
│  │  • 8 built-in presets                             │   │
│  │  • JSON save/load                                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Data Layer                              │   │
│  │  • Hand History                                   │   │
│  │  • Opponent Observations                          │   │
│  │  • Mistake Detection                              │   │
│  │  • GTO Comparison                                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Current State

### ✅ Implemented
- **Core Engine** (`src/engine/trainingBot.ts`)
  - `TrainingBotConfig` interface with 25+ parameters
  - 8 preset configurations (beginner through maniac)
  - Strategy Registry pattern for pluggable strategies
  - Hand tier evaluation
  - Position-aware hand selection
  - Realistic bet sizing
  - Opponent observation tracking
  
- **Strategies** (`src/engine/strategies/`)
  - `gto.ts` — Game Theory Optimal baseline
  - `exploitative.ts` — Adapts to opponent tendencies
  - `adaptive.ts` — Blends GTO + exploitation based on sample size

- **UI** (`src/components/TrainingBotSettings.tsx`)
  - 7-tab settings panel
  - Real-time slider controls
  - Preset quick-select buttons
  - Save/Reset functionality
  - localStorage persistence

- **Integration**
  - `gameStore.ts` includes `trainingBotConfig` state
  - `updateTrainingBotConfig` action for state updates
  - Backward compatible with existing `botEngine.ts`

### 🚧 Planned (Future)
- Solver integration (PioSolver, GTO+)
- Range-vs-range equity calculations
- Board texture analysis
- CFR (Counterfactual Regret Minimization) tables
- Screen capture / computer vision
- Mouse/keyboard control for automated play
- Multi-table support
- Session recording and replay
- Mistake detection with explanations
- Coaching mode

## Configurable Parameters

### Skill & Strategy
| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `skillLevel` | 1-100 | 50 | Overall decision quality |
| `strategyMode` | gto/exploitative/mixed/learning | mixed | Decision-making approach |
| `gtoDeviation` | 0-1 | 0.10 | How much to deviate from GTO |
| `gtoDeviationThreshold` | 0-1 | 0.15 | Confidence needed to deviate |

### Aggression
| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `aggression` | 0-1 | 0.55 | Bet/raise frequency |
| `continuationBetFrequency` | 0-1 | 0.60 | C-bet when preflop aggressor |
| `threeBetFrequency` | 0-1 | 0.08 | 3-bet preflop frequency |
| `fourBetFrequency` | 0-1 | 0.03 | 4-bet preflop frequency |
| `checkRaiseFrequency` | 0-1 | 0.08 | Check-raise frequency |
| `riskTolerance` | 0-1 | 0.40 | Willingness for risky plays |

### Bluffing
| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `bluffFrequency` | 0-1 | 0.12 | Overall bluff frequency |
| `bluffRiverFrequency` | 0-1 | 0.18 | River-specific bluff freq |
| `bluffFlopFrequency` | 0-1 | 0.08 | Flop-specific bluff freq |
| `bluffTurnFrequency` | 0-1 | 0.14 | Turn-specific bluff freq |
| `bluffCatchFrequency` | 0-1 | 0.15 | Call with weak expecting bluff |
| `floatFrequency` | 0-1 | 0.20 | Call flop to bluff turn |

### Tight/Loose
| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `startingHandRange` | 0-1 | 0.35 | Preflop hand selection width |
| `preflopOpenSize` | 0.5-5 | 2.5 | Open raise multiplier |
| `positionAwareness` | 0-1 | 0.70 | Position influence on selection |
| `positionBetSizing` | 0-1 | 0.50 | Position influence on sizing |

### Humanization
| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `reactionTimeMin` | ms | 800 | Minimum thinking time |
| `reactionTimeMax` | ms | 3000 | Maximum thinking time |
| `randomization` | 0-1 | 0.10 | Decision variation factor |
| `tellFrequency` | 0-1 | 0.05 | Timing/bet tells |
| `simulateThinking` | bool | true | Pauses on complex decisions |

### Tilt
| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `tiltThreshold` | 1-20 | 5 | Bad beats before tilt |
| `tiltAggressionMultiplier` | 1-3 | 1.5 | Tilt aggression boost |
| `tiltQualityReduction` | 0-1 | 0.30 | Decision quality loss |
| `tiltRecoveryRate` | 0-1 | 0.15 | Recovery speed |

### Adaptation
| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `adaptationSpeed` | 0-1 | 0.30 | How fast it learns |
| `observationHands` | 5-200 | 30 | Hands needed to adapt |
| `varianceTolerance` | 0-1 | 0.50 | Comfort with downswings |

## Presets

| Preset | Skill | Aggression | Bluff | Range | Best For |
|--------|-------|-----------|-------|-------|----------|
| `beginner` | 15 | 0.20 | 3% | 15% | Learning basics |
| `intermediate` | 45 | 0.45 | 10% | 30% | General practice |
| `aggressive` | 60 | 0.80 | 20% | 45% | Practice vs tight |
| `tight` | 55 | 0.25 | 5% | 12% | Practice vs loose |
| `gto` | 95 | 0.50 | 15% | 35% | GTO reference |
| `exploitative` | 75 | 0.65 | 18% | 40% | Exploitation practice |
| `nitty` | 30 | 0.10 | 1% | 8% | Extreme tight |
| `maniac` | 25 | 0.95 | 35% | 60% | Practice defense |

## Desktop App Integration Plan

### Phase 1: Engine Sharing (Current)
- ✅ Core engine in `src/engine/`
- ✅ Platform-agnostic types
- ✅ JSON config serialization
- ✅ Strategy Registry pattern

### Phase 2: Desktop Application
- Build standalone Electron/Tauri app
- Share `src/engine/` code via npm package
- Add screen capture module
- Add input simulation module
- Add multi-table orchestration

### Phase 3: Solver Integration
- Integrate with external solver APIs
- Load CFR tables for common boards
- Real-time GTO reference comparisons
- Mistake detection engine

### Phase 4: Coaching Mode
- Hand history analysis
- Decision tree visualization
- EV comparison vs GTO
- Personalized improvement suggestions

## Extending the Engine

### Adding a New Strategy

1. Create `src/engine/strategies/myStrategy.ts`:
```typescript
import type { Strategy, TrainingBotConfig, BotDecision, GameState, Player } from '../trainingBot';

export const myStrategy: Strategy = {
  id: 'my-strategy',
  name: 'My Strategy',
  description: 'Description of what this strategy does',
  minSkillLevel: 50,
  maxSkillLevel: 100,
  
  decide(state: GameState, player: Player, config: TrainingBotConfig): BotDecision {
    // Your decision logic here
    return {
      action: 'call',
      confidence: 0.8,
      reasoning: 'Example reasoning',
      reactionTime: 1.5,
      isBluff: false,
    };
  },
};
```

2. Register in `src/engine/strategies/index.ts`:
```typescript
import { myStrategy } from './myStrategy';

export const TRAINING_BOT_STRATEGIES = [
  gtoStrategy,
  exploitativeStrategy,
  adaptiveStrategy,
  myStrategy,  // ← Add here
] as const;
```

### Adding a New Preset

Add to `TRAINING_PRESETS` in `src/engine/trainingBot.ts`:
```typescript
'my-preset': {
  skillLevel: 60,
  aggression: 0.70,
  bluffFrequency: 0.15,
  // ... other settings
},
```

### Adding New Tracked Stats

Add to `OpponentStat` type in `src/engine/trainingBot.ts`:
```typescript
export type OpponentStat = 
  | 'vtap'
  | 'pfr'
  | 'myNewStat'  // ← Add here
  // ...
```

## File Structure

```
src/
├── engine/
│   ├── trainingBot.ts          # Core engine (types, config, utilities)
│   └── strategies/
│       ├── index.ts            # Registry initializer
│       ├── gto.ts              # GTO baseline strategy
│       ├── exploitative.ts     # Exploitative strategy
│       └── adaptive.ts         # Adaptive blending strategy
├── components/
│   └── TrainingBotSettings.tsx # UI for bot configuration
├── store/
│   └── gameStore.ts            # Zustand store (includes trainingBotConfig)
├── utils/
│   ├── botEngine.ts            # Legacy bot engine (backward compat)
│   ├── deck.ts                 # Card utilities
│   ├── handEvaluator.ts        # Hand evaluation
│   └── sidePot.ts              # Side pot calculation
└── types/
    └── card.ts                 # Card/Player/GameState types
```

## Known Limitations

1. **No solver integration** — Currently uses heuristic-based decisions
2. **No range construction** — Uses simplified hand tier evaluation
3. **No board texture analysis** — Doesn't consider wet/dry boards
4. **Single opponent tracking** — Observations simplified for one opponent
5. **No real-time GTO comparison** — GTO recommendations are stubbed

## License

[Your License Here]
