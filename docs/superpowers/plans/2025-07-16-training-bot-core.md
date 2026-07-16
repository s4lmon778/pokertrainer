# Training Bot Engine — Phase 1: Core Completion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Training Bot engine core — persistence, strategy system, decision quality, and test coverage. The engine must be platform-agnostic so it can later be detached and run autonomously on real poker sites.

**Dual-mode architecture:**
- **Training mode (now):** Human plays at the table, bots are opponents for practice
- **Autonomous mode (future):** Bot takes over, plays real online poker, looks human, wins long-term

This means the engine must produce **decisions with timing, not just actions** — every decision needs a `reactionTime` that can be fed to the future input simulator.

**Tech Stack:** TypeScript 5.x, Vitest (for tests), zero external dependencies.

## Global Constraints

- No new npm dependencies — engine must be zero-dependency for easy extraction to desktop app
- All types must be exportable for the desktop app
- Existing `gameStore.ts` integration must remain compatible
- Build must pass `npm run build` and `tsc --noEmit` after every commit
- Use `as Suit` / `as Rank` type assertions (not `as const`) — TypeScript ternary narrowing strips string literal types
- Files that change together stay together; split by responsibility
- Every new public function needs JSDoc
- Preserve backward compatibility with existing `botEngine.ts` exports
- **Every bot decision must include `reactionTime` — this is how the future desktop app knows how long to wait before acting**

## File Map

| File | Responsibility |
|------|---------------|
| `src/engine/trainingBot.ts` | Core types, config, presets, StrategyRegistry, utilities, persistence |
| `src/engine/strategies/gto.ts` | GTO baseline strategy (stub → real) |
| `src/engine/strategies/exploitative.ts` | Exploitative strategy (stub → real) |
| `src/engine/strategies/adaptive.ts` | GTO→exploitation blending |
| `src/engine/strategies/index.ts` | Registry initializer |
| `src/engine/trainingBot.test.ts` | Unit tests for engine |
| `src/engine/strategies/gto.test.ts` | Unit tests for GTO strategy |
| `src/engine/strategies/exploitative.test.ts` | Unit tests for exploitative strategy |
| `src/components/TrainingBotSettings.tsx` | UI settings panel (custom presets) |
| `src/store/gameStore.ts` | Store integration (minor tweaks) |

---

## Task 1: Config Persistence (save/load JSON)

**Files:**
- Modify: `src/engine/trainingBot.ts` (+25 lines)

**Interfaces:**
- Consumes: `TrainingBotConfig` interface (already defined)
- Produces: `saveConfig(config) → string`, `loadConfig(json) → TrainingBotConfig`, `saveConfigToStorage(config) → void`, `loadConfigFromStorage() → TrainingBotConfig`

- [ ] **Step 1: Add config persistence functions to trainingBot.ts**

Add these functions after `TRAINING_PRESETS` (around line 384):

```typescript
// ── Persistence ──

/**
 * Serialize TrainingBotConfig to JSON string.
 * Used by localStorage persistence and future desktop app file I/O.
 */
export function saveConfig(config: TrainingBotConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Deserialize JSON string to TrainingBotConfig.
 * Throws if JSON is invalid or missing required fields.
 */
export function loadConfig(json: string): TrainingBotConfig {
  const parsed = JSON.parse(json);
  const required = Object.keys(DEFAULT_TRAINING_CONFIG);
  for (const key of required) {
    if (!(key in parsed)) {
      throw new Error(`Missing required config field: ${key}`);
    }
  }
  return { ...DEFAULT_TRAINING_CONFIG, ...parsed };
}

/**
 * Save config to localStorage under the 'trainingBotConfig' key.
 */
export function saveConfigToStorage(config: TrainingBotConfig): void {
  try {
    localStorage.setItem('trainingBotConfig', saveConfig(config));
  } catch {
    // localStorage unavailable (SSR, private mode) — silently fall back
  }
}

/**
 * Load config from localStorage. Returns DEFAULT if nothing saved.
 */
export function loadConfigFromStorage(): TrainingBotConfig {
  try {
    const stored = localStorage.getItem('trainingBotConfig');
    if (!stored) return DEFAULT_TRAINING_CONFIG;
    return loadConfig(stored);
  } catch {
    return DEFAULT_TRAINING_CONFIG;
  }
}
```

Also update the JSDoc on `TrainingBotConfig` (around line 65) to remove the TODO about persistence — replace with:
```
* @remarks Persists to localStorage via saveConfig/saveConfigToStorage/loadConfigFromStorage
```

- [ ] **Step 2: Run build to verify no type errors**
Run: `cd "/c/Users/cheuk/OneDrive/Desktop/AI-Development/Projects/pokertrainer" && npm run build`
Expected: Clean build

- [ ] **Step 3: Commit**
```bash
git add src/engine/trainingBot.ts
git commit -m "feat: add config persistence (save/load JSON + localStorage)"
```

---

## Task 2: External Preset Save/Load/Delete

**Files:**
- Modify: `src/engine/trainingBot.ts` (+40 lines)

**Interfaces:**
- Consumes: `saveConfig`, `loadConfig` from Task 1
- Produces: `savePreset(name, config) → void`, `loadPreset(name) → TrainingBotConfig | null`, `deletePreset(name) → void`, `listPresets() → string[]`

- [ ] **Step 1: Add preset management functions after the persistence functions**

```typescript
const PRESET_STORAGE_KEY = 'trainingBotPresets';

/**
 * Save a custom preset to localStorage.
 */
export function savePreset(name: string, config: TrainingBotConfig): void {
  try {
    const presets = loadPresetMap();
    presets[name] = config;
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // localStorage unavailable
  }
}

/**
 * Load a custom preset by name. Returns null if not found.
 */
export function loadPreset(name: string): TrainingBotConfig | null {
  const presets = loadPresetMap();
  return presets[name] ?? null;
}

/**
 * List all saved custom preset names.
 */
export function listPresets(): string[] {
  return Object.keys(loadPresetMap());
}

/**
 * Delete a custom preset.
 */
export function deletePreset(name: string): void {
  try {
    const presets = loadPresetMap();
    delete presets[name];
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // localStorage unavailable
  }
}

/**
 * Internal: load the preset map from localStorage.
 */
function loadPresetMap(): Record<string, TrainingBotConfig> {
  try {
    const stored = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch {
    return {};
  }
}
```

- [ ] **Step 2: Run build to verify**
Run: `cd "/c/Users/cheuk/OneDrive/Desktop/AI-Development/Projects/pokertrainer" && npm run build`
Expected: Clean build

- [ ] **Step 3: Commit**
```bash
git add src/engine/trainingBot.ts
git commit -m "feat: add external preset save/load/delete management"
```

---

## Task 3: Real GTO Strategy Implementation

**Files:**
- Modify: `src/engine/strategies/gto.ts` (+80 lines)
- Create: `src/engine/strategies/gto.test.ts`

**Interfaces:**
- Consumes: `Strategy`, `TrainingBotConfig`, `BotDecision`, `GameState`, `Player`, `getPreflopHandTier`, `shouldOpenHand`, `calculateTrainingBetSize` from trainingBot.ts
- Produces: Working GTO strategy that makes realistic decisions with reaction times

**Key for autonomous mode:** Every decision includes `reactionTime` in seconds. The future desktop input simulator will use this to determine how long to "think" before acting.

- [ ] **Step 1: Replace the stub gto.ts with a real implementation**

Current gto.ts is a stub that always returns call. Replace the entire file with:

```typescript
/**
 * GTO Baseline Strategy
 * 
 * Makes decisions using hand tier evaluation, position awareness,
 * and pot odds. Serves as the reference point for all other strategies.
 * 
 * Autonomous mode: reactionTime is calculated based on decision complexity
 * so the input simulator can pace human-like timing.
 */

import type { Strategy, TrainingBotConfig, BotDecision, GameState, Player, Card } from '../../types/card';
import { getPreflopHandTier, shouldOpenHand, calculateTrainingBetSize } from '../trainingBot';

export const gtoStrategy: Strategy = {
  id: 'gto',
  name: 'GTO Baseline',
  description: 'Game Theory Optimal baseline play using hand tiers, position, and pot odds.',
  minSkillLevel: 40,
  maxSkillLevel: 100,
  
  decide(
    state: GameState,
    player: Player,
    config: TrainingBotConfig,
  ): BotDecision {
    const { hand, position, currentBet, potSize, chips } = player;
    const { phase, players } = state;
    
    // Preflop decision
    if (phase === 'preflop') {
      return gtoPreflopDecision(state, player, config, hand, players);
    }
    
    // Postflop decision
    return gtoPostflopDecision(state, player, config, hand, chips, potSize, currentBet, players);
  },
};

function gtoPreflopDecision(
  state: GameState,
  player: Player,
  config: TrainingBotConfig,
  hand: Card[],
  players: Player[],
): BotDecision {
  if (!hand || hand.length < 2) {
    return { action: 'fold', confidence: 0.9, reasoning: 'No cards', reactionTime: 0.5, isBluff: false };
  }
  
  const tier = getPreflopHandTier(hand);
  const shouldPlay = shouldOpenHand(hand, player.position, players.length, config);
  
  // Facing a bet — call or fold based on tier and pot odds
  if (player.currentBet > 0) {
    const potOdds = player.currentBet / (player.potSize + player.currentBet * 2);
    const callThreshold = 0.4 - (tier / 10) * 0.3;
    
    if (tier >= 5 || potOdds < callThreshold) {
      return {
        action: 'call',
        confidence: 0.7 + tier * 0.03,
        reasoning: `Tier ${tier}, pot odds ${potOdds.toFixed(2)} favorable`,
        reactionTime: 0.8 + (1 - tier / 10) * 0.5,
        isBluff: false,
      };
    }
    return { action: 'fold', confidence: 0.75, reasoning: `Tier ${tier}, pot odds unfavorable`, reactionTime: 0.6, isBluff: false };
  }
  
  // Open raise
  if (shouldPlay) {
    const aggression = config.aggression * (config.skillLevel / 100);
    const betSize = calculateTrainingBetSize({
      street: 'preflop',
      pot: player.potSize,
      playerChips: player.chips,
      currentBet: player.currentBet || 2,
      handStrength: tier / 10,
      positionNormalized: player.position / Math.max(1, players.length - 1),
      opponentCount: players.filter(p => p.chips > 0).length,
      aggression,
      config,
    });
    
    return {
      action: 'raise',
      amount: betSize,
      confidence: 0.7 + tier * 0.03,
      reasoning: `Open raise with tier ${tier} hand`,
      reactionTime: 1.0 + (1 - tier / 10) * 0.5,
      isBluff: false,
    };
  }
  
  return { action: 'fold', confidence: 0.8, reasoning: 'Hand too weak', reactionTime: 0.5, isBluff: false };
}

function gtoPostflopDecision(
  state: GameState,
  player: Player,
  config: TrainingBotConfig,
  hand: Card[],
  chips: number,
  potSize: number,
  currentBet: number,
  players: Player[],
): BotDecision {
  if (!hand || hand.length < 2) {
    return { action: 'fold', confidence: 0.95, reasoning: 'No hand', reactionTime: 0.3, isBluff: false };
  }
  
  const aggression = config.aggression * (config.skillLevel / 100);
  
  // Facing a bet
  if (currentBet > 0) {
    const potOdds = currentBet / (potSize + currentBet * 2);
    
    if (potOdds < 0.3 && aggression > 0.5) {
      return {
        action: 'call',
        confidence: 0.65,
        reasoning: `Good pot odds (${potOdds.toFixed(2)})`,
        reactionTime: 1.2,
        isBluff: false,
      };
    }
    if (potOdds < 0.5) {
      return { action: 'call', confidence: 0.55, reasoning: 'Marginal pot odds', reactionTime: 1.0, isBluff: false };
    }
    return { action: 'fold', confidence: 0.7, reasoning: `Poor pot odds (${potOdds.toFixed(2)})`, reactionTime: 0.7, isBluff: false };
  }
  
  // Check or bet
  const shouldBet = Math.random() < aggression * 0.4;
  
  if (shouldBet) {
    const betSize = calculateTrainingBetSize({
      street: 'postflop',
      pot: potSize,
      playerChips: chips,
      currentBet: potSize,
      handStrength: 0.5 + Math.random() * 0.3,
      positionNormalized: player.position / Math.max(1, players.length - 1),
      opponentCount: players.filter(p => p.chips > 0).length,
      aggression,
      config,
    });
    
    return {
      action: 'raise',
      amount: Math.min(betSize, chips),
      confidence: 0.6,
      reasoning: 'Continuation bet',
      reactionTime: 1.5,
      isBluff: false,
    };
  }
  
  return { action: 'check', confidence: 0.8, reasoning: 'Check (passive)', reactionTime: 0.8, isBluff: false };
}
```

- [ ] **Step 2: Write tests for GTO strategy**

Create `src/engine/strategies/gto.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { gtoStrategy } from './gto';
import { DEFAULT_TRAINING_CONFIG } from '../trainingBot';
import type { GameState, Player, Card, Suit, Rank } from '../../types/card';

function makeCard(suit: string, rank: string): Card {
  return { suit: suit as Suit, rank: rank as Rank, id: suit + rank };
}

function makePlayer(hand: Card[], position = 0, chips = 1000, currentBet = 0, potSize = 100): Player {
  return {
    id: 'test', name: 'Test', hand, position, chips,
    currentBet, potSize, folded: false, isBot: true,
  };
}

function makeState(phase: 'preflop' | 'flop' | 'turn' | 'river' = 'preflop', oppIds: string[] = []): GameState {
  return {
    phase,
    players: oppIds.map((id, i) => ({
      id, name: `Opp${i}`, hand: [], position: i, chips: 1000,
      currentBet: 0, potSize: 100, folded: false, isBot: true,
    })) as Player[],
    currentPlayerIndex: 0,
    deck: [],
    communityCards: [],
    potSize: 100,
    sidePots: [],
  };
}

describe('gtoStrategy', () => {
  it('should fold weak preflop hands (72o)', () => {
    const hand = [makeCard('spades', '7'), makeCard('clubs', '2')];
    const player = makePlayer(hand, 0);
    const state = makeState('preflop');
    const decision = gtoStrategy.decide(state, player, DEFAULT_TRAINING_CONFIG);
    expect(decision.action).toBe('fold');
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.reactionTime).toBeGreaterThan(0);
  });

  it('should play strong preflop hands (AA)', () => {
    const hand = [makeCard('spades', 'A'), makeCard('hearts', 'A')];
    const player = makePlayer(hand, 3);
    const state = makeState('preflop');
    const decision = gtoStrategy.decide(state, player, DEFAULT_TRAINING_CONFIG);
    expect(decision.action).not.toBe('fold');
    expect(decision.confidence).toBeGreaterThan(0.5);
    expect(decision.reactionTime).toBeGreaterThan(0);
  });

  it('should call with good pot odds', () => {
    const hand = [makeCard('spades', 'K'), makeCard('spades', 'Q')];
    const player = makePlayer(hand, 2, 1000, 0, 100);
    // Simulate facing a small bet (good pot odds)
    const playerWithBet = { ...player, currentBet: 10, potSize: 100 };
    const state = makeState('flop', ['opp1']);
    const decision = gtoStrategy.decide(state, playerWithBet as Player, DEFAULT_TRAINING_CONFIG);
    expect(decision.action).toBe('call');
  });

  it('should have valid strategy metadata', () => {
    expect(gtoStrategy.id).toBe('gto');
    expect(gtoStrategy.name).toBeDefined();
    expect(gtoStrategy.minSkillLevel).toBeGreaterThanOrEqual(0);
    expect(gtoStrategy.maxSkillLevel).toBeLessThanOrEqual(100);
  });

  it('should always include reactionTime for autonomous mode', () => {
    const hand = [makeCard('hearts', 'A'), makeCard('diamonds', 'A')];
    const player = makePlayer(hand, 0);
    const state = makeState('preflop');
    const decision = gtoStrategy.decide(state, player, DEFAULT_TRAINING_CONFIG);
    expect(decision.reactionTime).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run tests**
Run: `cd "/c/Users/cheuk/OneDrive/Desktop/AI-Development/Projects/pokertrainer" && npx vitest run src/engine/strategies/gto.test.ts`
Expected: 5/5 passing

- [ ] **Step 4: Run full build**
Run: `cd "/c/Users/cheuk/OneDrive/Desktop/AI-Development/Projects/pokertrainer" && npm run build && npx tsc --noEmit`
Expected: Clean build

- [ ] **Step 5: Commit**
```bash
git add src/engine/strategies/gto.ts src/engine/strategies/gto.test.ts
git commit -m "feat: implement real GTO strategy with preflop/postflop decisions and reaction times"
```

---

## Task 4: Real Exploitative Strategy

**Files:**
- Modify: `src/engine/strategies/exploitative.ts` (+70 lines)
- Create: `src/engine/strategies/exploitative.test.ts`

**Interfaces:**
- Consumes: `Strategy`, `TrainingBotConfig`, `BotDecision`, `OpponentObservation`, `gtoStrategy`
- Produces: Exploitative strategy that adjusts based on opponent stats

- [ ] **Step 1: Replace stub exploitative.ts with real implementation**

```typescript
/**
 * Exploitative Strategy
 * 
 * Adjusts play based on observed opponent tendencies:
 * - Folds too much to cbets → bluff more
 * - Too tight → value bet wider
 * - Bluffs a lot → call wider (bluff catch)
 * - Passive → bet for value
 * 
 * Falls back to GTO when insufficient data.
 */

import type { Strategy, TrainingBotConfig, BotDecision, OpponentObservation } from '../trainingBot';
import { gtoStrategy } from './gto';
import type { GameState, Player } from '../../types/card';

export const exploitativeStrategy: Strategy = {
  id: 'exploitative',
  name: 'Exploitative',
  description: 'Adjusts play based on observed opponent tendencies.',
  minSkillLevel: 30,
  maxSkillLevel: 100,
  
  decide(
    state: GameState,
    player: Player,
    config: TrainingBotConfig,
    observations?: Map<string, OpponentObservation>,
  ): BotDecision {
    const gtoDecision = gtoStrategy.decide(state, player, config);
    
    if (!observations || observations.size === 0) {
      return gtoDecision;
    }
    
    // Find the most relevant observation
    const opponents = state.players.filter(p => !p.folded && p.id !== player.id);
    let bestObs: OpponentObservation | null = null;
    
    for (const opp of opponents) {
      const obs = observations.get(opp.id);
      if (obs && (!bestObs || obs.handsObserved > bestObs.handsObserved)) {
        bestObs = obs;
      }
    }
    
    if (!bestObs || bestObs.handsObserved < config.observationHands) {
      return gtoDecision;
    }
    
    return applyExploitativeAdjustments(gtoDecision, bestObs, config, player, state);
  },
};

function applyExploitativeAdjustments(
  baseDecision: BotDecision,
  obs: OpponentObservation,
  config: TrainingBotConfig,
  player: Player,
  state: GameState,
): BotDecision {
  const adjustments: string[] = [];
  
  // Opponent folds too much to cbets → bluff more
  if (obs.foldToCbet > 0.7 && baseDecision.action === 'raise') {
    adjustments.push('opponent folds to cbets heavily');
    return {
      ...baseDecision,
      isBluff: true,
      confidence: Math.min(0.9, baseDecision.confidence + 0.15),
      reasoning: `${baseDecision.reasoning} — ${adjustments.join(', ')}`,
    };
  }
  
  // Opponent is too tight (low VTA) → value bet wider
  if (obs.vtap < 0.15 && baseDecision.action === 'check') {
    adjustments.push('opponent is very tight');
    return {
      ...baseDecision,
      action: 'raise',
      amount: baseDecision.amount ?? player.potSize * 0.5,
      isBluff: false,
      confidence: 0.7,
      reasoning: `Value bet vs tight opponent — ${adjustments.join(', ')}`,
      reactionTime: baseDecision.reactionTime * 0.9,
    };
  }
  
  // Opponent bluffs a lot → call wider (bluff catch)
  if (obs.bluffFreq > 0.2 && baseDecision.action === 'fold') {
    adjustments.push('opponent bluffs frequently');
    return {
      ...baseDecision,
      action: 'call',
      confidence: 0.6,
      reasoning: `Bluff catch — ${adjustments.join(', ')}`,
      isBluff: false,
      reactionTime: baseDecision.reactionTime * 1.2,
    };
  }
  
  // Opponent is passive (low aggression) → bet for value
  if (obs.aggFreq < 0.3 && baseDecision.action === 'check') {
    adjustments.push('opponent is passive');
    return {
      ...baseDecision,
      action: 'raise',
      amount: player.potSize * 0.6,
      confidence: 0.75,
      reasoning: `Value bet vs passive — ${adjustments.join(', ')}`,
      isBluff: false,
      reactionTime: baseDecision.reactionTime * 0.85,
    };
  }
  
  return baseDecision;
}
```

- [ ] **Step 2: Write tests**

Create `src/engine/strategies/exploitative.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { exploitativeStrategy } from './exploitative';
import { DEFAULT_TRAINING_CONFIG, createEmptyObservation } from '../trainingBot';
import type { GameState, Player, Card, Suit, Rank } from '../../types/card';

function makeCard(suit: string, rank: string): Card {
  return { suit: suit as Suit, rank: rank as Rank, id: suit + rank };
}

function makePlayer(hand: Card[], position = 0, chips = 1000, potSize = 100): Player {
  return {
    id: 'test', name: 'Test', hand, position, chips,
    currentBet: 0, potSize, folded: false, isBot: true,
  };
}

function makeState(phase: 'flop' | 'turn' | 'river' = 'flop', oppIds: string[] = []): GameState {
  return {
    phase,
    players: oppIds.map((id, i) => ({
      id, name: `Opp${i}`, hand: [], position: i, chips: 1000,
      currentBet: 0, potSize: 100, folded: false, isBot: true,
    })) as Player[],
    currentPlayerIndex: 0,
    deck: [],
    communityCards: [],
    potSize: 100,
    sidePots: [],
  };
}

describe('exploitativeStrategy', () => {
  it('should fall back to GTO with no observations', () => {
    const hand = [makeCard('hearts', 'A'), makeCard('diamonds', 'K')];
    const player = makePlayer(hand);
    const state = makeState('flop');
    const decision = exploitativeStrategy.decide(state, player, DEFAULT_TRAINING_CONFIG);
    expect(decision).toBeDefined();
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.reactionTime).toBeGreaterThan(0);
  });

  it('should have valid strategy metadata', () => {
    expect(exploitativeStrategy.id).toBe('exploitative');
    expect(exploitativeStrategy.minSkillLevel).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 3: Run tests**
Run: `cd "/c/Users/cheuk/OneDrive/Desktop/AI-Development/Projects/pokertrainer" && npx vitest run src/engine/strategies/exploitative.test.ts`
Expected: 2/2 passing

- [ ] **Step 4: Run full build**
Run: `cd "/c/Users/cheuk/OneDrive/Desktop/AI-Development/Projects/pokertrainer" && npm run build && npx tsc --noEmit`
Expected: Clean build

- [ ] **Step 5: Commit**
```bash
git add src/engine/strategies/exploitative.ts src/engine/strategies/exploitative.test.ts
git commit -m "feat: implement real exploitative strategy with opponent adjustments"
```

---

## Task 5: Real Adaptive Strategy

**Files:**
- Modify: `src/engine/strategies/adaptive.ts` (+20 lines)

**Interfaces:**
- Consumes: `gtoStrategy`, `exploitativeStrategy` from their modules
- Produces: Adaptive strategy that blends GTO + exploitation based on sample size

- [ ] **Step 1: Replace stub adaptive.ts with real implementation**

```typescript
/**
 * Adaptive Strategy
 * 
 * Blends GTO baseline with exploitation based on sample size.
 * Starts GTO when insufficient data, gradually shifts to exploitative.
 */

import type { Strategy, TrainingBotConfig, OpponentObservation, BotDecision } from '../trainingBot';
import { gtoStrategy } from './gto';
import { exploitativeStrategy } from './exploitative';
import type { GameState, Player } from '../../types/card';

export const adaptiveStrategy: Strategy = {
  id: 'adaptive',
  name: 'Adaptive (GTO→Exploitative)',
  description: 'Blends GTO baseline with exploitation based on sample size.',
  minSkillLevel: 30,
  maxSkillLevel: 100,
  
  decide(
    state: GameState,
    player: Player,
    config: TrainingBotConfig,
    observations?: Map<string, OpponentObservation>,
  ): BotDecision {
    let totalHandsObserved = 0;
    for (const obs of observations?.values() || []) {
      totalHandsObserved += obs.handsObserved;
    }
    
    const handsNeeded = config.observationHands;
    const blendRatio = Math.min(1, totalHandsObserved / handsNeeded);
    
    const gtoDecision = gtoStrategy.decide(state, player, config);
    const expDecision = exploitativeStrategy.decide(state, player, config, observations);
    
    const finalConfidence = gtoDecision.confidence * (1 - blendRatio) + expDecision.confidence * blendRatio;
    
    return {
      ...expDecision,
      confidence: finalConfidence,
      reasoning: `${blendRatio > 0.5 ? 'Exploitative-leaning' : 'GTO-leaning'} — ${totalHandsObserved}/${handsNeeded} hands (${(blendRatio * 100).toFixed(0)}% blended)`,
    };
  },
};
```

- [ ] **Step 2: Run build**
Run: `cd "/c/Users/cheuk/OneDrive/Desktop/AI-Development/Projects/pokertrainer" && npm run build && npx tsc --noEmit`
Expected: Clean build

- [ ] **Step 3: Commit**
```bash
git add src/engine/strategies/adaptive.ts
git commit -m "feat: implement real adaptive strategy with GTO-exploitation blending"
```

---

## Task 6: Strategy Registry + Engine Tests

**Files:**
- Modify: `src/engine/strategies/index.ts`
- Create: `src/engine/trainingBot.test.ts`

**Interfaces:**
- Consumes: All strategies from their modules
- Produces: Verified registry with all strategies registered

- [ ] **Step 1: Update strategies/index.ts**

```typescript
import { StrategyRegistry } from '../trainingBot';
import { gtoStrategy } from './gto';
import { exploitativeStrategy } from './exploitative';
import { adaptiveStrategy } from './adaptive';

export const TRAINING_BOT_STRATEGIES = [
  gtoStrategy,
  exploitativeStrategy,
  adaptiveStrategy,
] as const;

export function initializeStrategies(): void {
  for (const strategy of TRAINING_BOT_STRATEGIES) {
    StrategyRegistry.register(strategy);
  }
}

// Auto-initialize on import
initializeStrategies();
```

- [ ] **Step 2: Write engine tests**

Create `src/engine/trainingBot.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TRAINING_CONFIG,
  TRAINING_PRESETS,
  saveConfig,
  loadConfig,
  savePreset,
  loadPreset,
  deletePreset,
  listPresets,
  getPreflopHandTier,
  shouldOpenHand,
  getPositionMultiplier,
  generateHandId,
  createEmptyObservation,
} from './trainingBot';
import type { Card, Suit, Rank } from '../types/card';

function makeCard(suit: string, rank: string): Card {
  return { suit: suit as Suit, rank: rank as Rank, id: suit + rank };
}

describe('DEFAULT_TRAINING_CONFIG', () => {
  it('should have skillLevel 50', () => expect(DEFAULT_TRAINING_CONFIG.skillLevel).toBe(50));
  it('should have strategyMode mixed', () => expect(DEFAULT_TRAINING_CONFIG.strategyMode).toBe('mixed'));
  it('should have aggression 0.55', () => expect(DEFAULT_TRAINING_CONFIG.aggression).toBe(0.55));
  it('should have bluffFrequency 0.12', () => expect(DEFAULT_TRAINING_CONFIG.bluffFrequency).toBe(0.12));
  it('should have startingHandRange 0.35', () => expect(DEFAULT_TRAINING_CONFIG.startingHandRange).toBe(0.35));
});

describe('TRAINING_PRESETS', () => {
  it('should have 8 presets', () => expect(Object.keys(TRAINING_PRESETS).length).toBe(8));
  it('should have beginner preset', () => expect(TRAINING_PRESETS.beginner).toBeDefined());
  it('should have gto preset with skill 95', () => expect(TRAINING_PRESETS.gto?.skillLevel).toBe(95));
  it('should have maniac preset with high aggression', () => expect(TRAINING_PRESETS.maniac?.aggression).toBe(0.95));
  it('should have nitty preset with low aggression', () => expect(TRAINING_PRESETS.nitty?.aggression).toBe(0.10));
});

describe('saveConfig / loadConfig', () => {
  it('should serialize and deserialize config', () => {
    const json = saveConfig(DEFAULT_TRAINING_CONFIG);
    const loaded = loadConfig(json);
    expect(loaded.skillLevel).toBe(50);
    expect(loaded.aggression).toBe(0.55);
  });

  it('should merge partial configs', () => {
    const modified = { ...DEFAULT_TRAINING_CONFIG, skillLevel: 80, aggression: 0.9 };
    const json = saveConfig(modified);
    const loaded = loadConfig(json);
    expect(loaded.skillLevel).toBe(80);
    expect(loaded.aggression).toBe(0.9);
  });

  it('should throw on invalid JSON', () => {
    expect(() => loadConfig('not json')).toThrow();
  });

  it('should throw on missing required fields', () => {
    expect(() => loadConfig('{}')).toThrow('Missing required config field');
  });
});

describe('getPreflopHandTier', () => {
  it('should rate AA as tier 10', () => {
    expect(getPreflopHandTier([makeCard('spades', 'A'), makeCard('hearts', 'A')])).toBe(10);
  });
  
  it('should rate 72o as tier 1', () => {
    expect(getPreflopHandTier([makeCard('spades', '7'), makeCard('clubs', '2')])).toBe(1);
  });
  
  it('should rate suited connectors higher than offsuit', () => {
    const suited = [makeCard('spades', 'K'), makeCard('spades', 'Q')];
    const offsuit = [makeCard('spades', 'K'), makeCard('clubs', 'Q')];
    expect(getPreflopHandTier(suited)).toBeGreaterThan(getPreflopHandTier(offsuit));
  });
});

describe('getPositionMultiplier', () => {
  it('should give BTN highest multiplier', () => {
    expect(getPositionMultiplier(8, 9)).toBe(1.25);
  });
  
  it('should give SB lowest multiplier', () => {
    expect(getPositionMultiplier(0, 9)).toBe(0.8);
  });
});

describe('generateHandId', () => {
  it('should produce unique IDs', () => {
    const id1 = generateHandId();
    const id2 = generateHandId();
    expect(id1).not.toBe(id2);
  });
  
  it('should have hand_ prefix', () => {
    expect(generateHandId()).toMatch(/^hand_/);
  });
});

describe('createEmptyObservation', () => {
  it('should return observation with all zeros', () => {
    const obs = createEmptyObservation();
    expect(obs.handsObserved).toBe(0);
    expect(obs.vtap).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests**
Run: `cd "/c/Users/cheuk/OneDrive/Desktop/AI-Development/Projects/pokertrainer" && npx vitest run src/engine/trainingBot.test.ts`
Expected: All tests passing

- [ ] **Step 4: Run full build**
Run: `cd "/c/Users/cheuk/OneDrive/Desktop/AI-Development/Projects/pokertrainer" && npm run build && npx tsc --noEmit`
Expected: Clean build

- [ ] **Step 5: Commit**
```bash
git add src/engine/strategies/index.ts src/engine/trainingBot.test.ts
git commit -m "test: add engine tests + strategy registry auto-initialization"
```

---

## Task 7: TrainingBotSettings UI Enhancement

**Files:**
- Modify: `src/components/TrainingBotSettings.tsx` (+50 lines)

**Interfaces:**
- Consumes: `savePreset`, `loadPreset`, `deletePreset`, `listPresets`, `saveConfig` from trainingBot
- Produces: Settings panel with custom preset management

- [ ] **Step 1: Add custom preset imports and state**

Add imports after existing ones:
```typescript
import { savePreset, loadPreset, deletePreset, listPresets } from '../engine/trainingBot';
import { Sparkles } from 'lucide-react';
```

Add state after existing state:
```typescript
const [customPresets, setCustomPresets] = useState<string[]>([]);
const [newPresetName, setNewPresetName] = useState('');
const [showSavePreset, setShowSavePreset] = useState(false);

useEffect(() => {
  setCustomPresets(listPresets());
}, []);
```

Add handlers:
```typescript
const handleSavePreset = useCallback(() => {
  if (!newPresetName.trim()) return;
  savePreset(newPresetName, localConfig);
  setCustomPresets(listPresets());
  setNewPresetName('');
  setShowSavePreset(false);
}, [newPresetName, localConfig]);

const handleLoadPreset = useCallback((name: string) => {
  const preset = loadPreset(name);
  if (preset) {
    setLocalConfig(preset);
    setPreset(name);
  }
}, []);

const handleDeletePreset = useCallback((name: string) => {
  deletePreset(name);
  setCustomPresets(listPresets());
  if (preset === name) setPreset('balanced');
}, [preset]);
```

Add UI after the built-in presets grid (before the tabs):
```tsx
{/* Custom Presets */}
{customPresets.length > 0 && (
  <div className="space-y-2">
    <label className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Saved Presets</label>
    <div className="flex flex-wrap gap-2">
      {customPresets.map(name => (
        <div key={name} className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1">
          <button onClick={() => handleLoadPreset(name)} className="text-xs text-gold hover:underline">
            {name}
          </button>
          <button onClick={() => handleDeletePreset(name)} className="text-xs text-red-400 hover:text-red-300 ml-1" title="Delete">×</button>
        </div>
      ))}
    </div>
  </div>
)}

{showSavePreset && (
  <div className="flex items-center gap-2">
    <input
      type="text"
      value={newPresetName}
      onChange={e => setNewPresetName(e.target.value)}
      placeholder="Preset name..."
      className="input-field flex-1 text-sm"
      onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
    />
    <button onClick={handleSavePreset} className="btn-secondary text-sm">Save</button>
    <button onClick={() => setShowSavePreset(false)} className="btn-secondary text-sm">Cancel</button>
  </div>
)}
```

Add "Save as Preset" button next to existing Save button in header:
```tsx
<button onClick={() => setShowSavePreset(true)} className="btn-secondary flex items-center gap-2">
  <Sparkles size={16} />
  Save as Preset
</button>
```

- [ ] **Step 2: Run build**
Run: `cd "/c/Users/cheuk/OneDrive/Desktop/AI-Development/Projects/pokertrainer" && npm run build && npx tsc --noEmit`
Expected: Clean build

- [ ] **Step 3: Commit**
```bash
git add src/components/TrainingBotSettings.tsx
git commit -m "feat: add custom preset save/load/delete to Training Bot settings UI"
```

---

## Task 8: Final Verification + Cleanup

- [ ] **Step 1: Run full test suite**
Run: `cd "/c/Users/cheuk/OneDrive/Desktop/AI-Development/Projects/pokertrainer" && npx vitest run`
Expected: All tests passing

- [ ] **Step 2: Run full build**
Run: `cd "/c/Users/cheuk/OneDrive/Desktop/AI-Development/Projects/pokertrainer" && npm run build && npx tsc --noEmit`
Expected: Clean build, no errors

- [ ] **Step 3: Remove remaining TODOs in engine code**
Run: `grep -rn "TODO" src/engine/`
Remove any TODOs that are now addressed (persistence, presets, strategy modules)

- [ ] **Step 4: Final commit**
```bash
git add -A
git commit -m "chore: final verification, cleanup, remove addressed TODOs

- Verified all tests pass
- Verified clean build
- Removed completed TODOs from engine code
- Training Bot engine ready for desktop extraction"
```

---

## Success Criteria

- [ ] All 8 tasks complete
- [ ] `npm run build` passes clean
- [ ] `npx tsc --noEmit` passes clean
- [ ] All unit tests pass
- [ ] Config persistence works (save/load JSON + localStorage)
- [ ] Custom preset management works in UI (save, load, delete)
- [ ] All 3 strategies (GTO, Exploitative, Adaptive) make real decisions
- [ ] Every decision includes `reactionTime` for autonomous mode
- [ ] Strategy Registry auto-initializes on import
- [ ] No remaining TODOs in engine code about persistence/presets/strategies
