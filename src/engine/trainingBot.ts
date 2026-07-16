/**
 * Training Bot Engine — Core Module
 * 
 * This module provides the foundational poker AI engine for the Training Bot.
 * It is designed to be platform-agnostic: the same logic runs in both the
 * web application AND the future standalone desktop Training Bot.
 * 
 * ## Architecture
 * 
 * ```
 * Training Bot Engine (this module)
 * ├── Strategy Layer     — GTO/exploitative decision making
 * ├── Simulation Layer   — Equity calculation, range analysis
 * ├── Humanization Layer — Reaction times, tells, tilt
 * └── Configuration      — Personality presets, adjustable parameters
 * ```
 * 
 * ## Future Desktop Integration Points
 * 
 * The standalone Training Bot will reuse this engine and add:
 * - Screen capture / computer vision (card recognition)
 * - Mouse/keyboard control for automated play
 * - Multi-table support (parallel engine instances)
 * - Session recording and hand history analysis
 * - Solver integration (GTO reference comparisons)
 * - Coaching mode (mistake detection + explanations)
 * 
 * ## Extending the Engine
 * 
 * To add new capabilities:
 * 1. Add new parameters to `TrainingBotConfig` interface
 * 2. Create a new strategy module in `src/engine/strategies/`
 * 3. Register the strategy in `StrategyRegistry`
 * 4. Add UI controls in `src/components/TrainingBotSettings.tsx`
 * 5. Export new types from this module for the desktop app to consume
 * 
 * @module training-bot-engine
 */

import type { Card, GameState, Player, Suit, Rank } from '../types/card';
import { cardRankValue, isSuited, isConnected } from '../utils/deck';
import { evaluateHand } from '../utils/handEvaluator';

// ═══════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════

/**
 * Strategy mode determines how the bot approaches decision-making.
 * 
 * - `gto`: Game Theory Optimal — unexploitable baseline play
 * - `exploitative`: Adapts to observed opponent tendencies
 * - `mixed`: Blends GTO with exploitation based on sample size
 * - `learning`: Gradually shifts from GTO to exploitative with more data
 */
export type StrategyMode = 'gto' | 'exploitative' | 'mixed' | 'learning';

/**
 * Skill level determines overall decision quality.
 * 1 = beginner (many mistakes), 50 = solid recreational, 100 = solver-level
 */
export type SkillLevel = number; // 1-100

/**
 * Complete configuration for the Training Bot.
 * 
 * All parameters are independently adjustable to create
 * any desired playing style from beginner to solver-level.
 * 
 * @remarks Persists to localStorage via saveConfig/saveConfigToStorage/loadConfigFromStorage
 */
export interface TrainingBotConfig {
  // ── Skill & Strategy ──
  /** Overall skill level (1-100) */
  skillLevel: number;
  /** Strategy mode (see StrategyMode) */
  strategyMode: StrategyMode;
  
  // ── Aggression ──
  /** How often the bot chooses to bet/raise vs check/call (0-1) */
  aggression: number;
  
  // ── Bluffing ──
  /** Base bluff frequency (0-1). Higher = more bluffs. */
  bluffFrequency: number;
  /** Bluff on rivers specifically (0-1). Often different from overall bluff freq. */
  bluffRiverFrequency: number;
  /** Bluff on flops specifically (0-1) */
  bluffFlopFrequency: number;
  /** Bluff on turns specifically (0-1) */
  bluffTurnFrequency: number;
  /** Whether to bluff-catch (call with weak hands expecting bluffs) */
  bluffCatchFrequency: number;
  
  // ── Tight/Loose ──
  /** How many hands the bot plays preflop (0-1). 0.2 = very tight, 0.8 = very loose */
  startingHandRange: number;
  /** Preflop open sizing multiplier (1.0 = standard, 2.0 = huge opens) */
  preflopOpenSize: number;
  /** 3-bet frequency (0-1) */
  threeBetFrequency: number;
  /** 4-bet frequency (0-1) */
  fourBetFrequency: number;
  
  // ── Postflop ──
  /** Continuation bet frequency when preflop aggressor (0-1) */
  continuationBetFrequency: number;
  /** Float frequency (call on flop to bluff on turn) (0-1) */
  floatFrequency: number;
  /** Check-raise frequency (0-1) */
  checkRaiseFrequency: number;
  
  // ── Risk Tolerance ──
  /** Willingness to go all-in (0-1). 0 = never, 1 = always when favored */
  riskTolerance: number;
  /** Variance tolerance — how comfortable with downswings (affects tilt) */
  varianceTolerance: number;
  
  // ── Humanization ──
  /** Minimum reaction time in ms */
  reactionTimeMin: number;
  /** Maximum reaction time in ms */
  reactionTimeMax: number;
  /** Randomization factor — how much the bot varies otherwise identical decisions */
  randomization: number;
  /** Frequency of "tells" (timing tells, bet sizing tells) */
  tellFrequency: number;
  /** Whether to simulate "thinking" pauses on complex decisions */
  simulateThinking: boolean;
  
  // ── Tilt ──
  /** How many bad beats before entering tilt */
  tiltThreshold: number;
  /** How aggressive the bot gets when tilted */
  tiltAggressionMultiplier: number;
  /** How much tilt reduces decision quality */
  tiltQualityReduction: number;
  /** How quickly the bot recovers from tilt */
  tiltRecoveryRate: number;
  
  // ── Position Awareness ──
  /** How much position influences hand selection (0-1) */
  positionAwareness: number;
  /** How much position influences bet sizing (0-1) */
  positionBetSizing: number;
  
  // ── Opponent Adaptation ──
  /** How quickly the bot adapts to opponent patterns */
  adaptationSpeed: number;
  /** Number of hands before the bot starts adapting */
  observationHands: number;
  /** What stats to track about opponents */
  trackedStats: OpponentStat[];
  
  // ── Solver Integration (Future) ──
  /** GTO deviation allowance (0 = perfect GTO, 1 = no GTO constraints) */
  gtoDeviation: number;
  /** Confidence threshold for deviating from GTO */
  gtoDeviationThreshold: number;
}

/**
 * Statistics to track about each opponent for adaptive play.
 */
export type OpponentStat = 
  | 'vtap'        // Voluntarily Put Money In Pot
  | 'pfr'         // Pre-flop Raise
  | 'foldToCbet'  // Fold to Continuation Bet
  | 'foldTo3bet'  // Fold to 3-bet
  | 'stealFreq'   // Steal frequency from late position
  | 'bluffFreq'   // Overall bluff frequency
  | 'aggFreq'     // Aggression factor (raises / total bets)
  | 'avgBetSize'  // Average bet size as fraction of pot
  | 'showdownFreq'; // How often they go to showdown

/**
 * Stored observation data about an opponent.
 */
export interface OpponentObservation {
  handsObserved: number;
  vtap: number;
  pfr: number;
  foldToCbet: number;
  foldTo3bet: number;
  stealFreq: number;
  bluffFreq: number;
  aggFreq: number;
  avgBetSize: number;
  showdownFreq: number;
}

/**
 * A recorded hand history entry for analysis and replay.
 */
export interface HandHistory {
  handId: string;
  timestamp: number;
  stake: string;
  hero: string;
  heroPosition: number;
  heroHoleCards: Card[];
  communityCards: Card[];
  potSize: number;
  result: 'won' | 'lost' | 'pushed';
  amountWon: number;
  actions: HandAction[];
  mistakes: HandMistake[];
  gtoComparison?: GtoComparison;
}

/**
 * A single action in a hand history.
 */
export interface HandAction {
  player: string;
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  amount: number;
  street: string;
  timestamp: number;
}

/**
 * A mistake detected during hand play.
 */
export interface HandMistake {
  player: string;
  action: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  expectedAction?: string;
  gtoEquity?: number;
  actualEquity?: number;
}

/**
 * Comparison to GTO optimal play for a specific decision point.
 */
export interface GtoComparison {
  actionTaken: string;
  gtoRecommended: string;
  evDifference: number; // -0.05 means 5bb worse than GTO
  confidence: number;
}

// ═══════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════

/**
 * Default Training Bot configuration.
 * Balanced settings suitable for general poker training.
 */
export const DEFAULT_TRAINING_CONFIG: TrainingBotConfig = {
  // Skill & Strategy
  skillLevel: 50,
  strategyMode: 'mixed',
  
  // Aggression
  aggression: 0.55,
  
  // Bluffing
  bluffFrequency: 0.12,
  bluffRiverFrequency: 0.18,
  bluffFlopFrequency: 0.08,
  bluffTurnFrequency: 0.14,
  bluffCatchFrequency: 0.15,
  
  // Tight/Loose
  startingHandRange: 0.35,
  preflopOpenSize: 2.5,
  threeBetFrequency: 0.08,
  fourBetFrequency: 0.03,
  
  // Postflop
  continuationBetFrequency: 0.60,
  floatFrequency: 0.20,
  checkRaiseFrequency: 0.08,
  
  // Risk
  riskTolerance: 0.40,
  varianceTolerance: 0.50,
  
  // Humanization
  reactionTimeMin: 800,
  reactionTimeMax: 3000,
  randomization: 0.10,
  tellFrequency: 0.05,
  simulateThinking: true,
  
  // Tilt
  tiltThreshold: 5,
  tiltAggressionMultiplier: 1.5,
  tiltQualityReduction: 0.30,
  tiltRecoveryRate: 0.15,
  
  // Position
  positionAwareness: 0.70,
  positionBetSizing: 0.50,
  
  // Adaptation
  adaptationSpeed: 0.30,
  observationHands: 30,
  trackedStats: ['vtap', 'pfr', 'foldToCbet', 'aggFreq', 'bluffFreq'],
  
  // Solver Integration
  gtoDeviation: 0.10,
  gtoDeviationThreshold: 0.15,
};

/**
 * Preset configurations for common playing styles.
 * 
 * TODO: Load these from external JSON for hot-swappable presets
 */
export const TRAINING_PRESETS: Record<string, Partial<TrainingBotConfig>> = {
  'beginner': {
    skillLevel: 15,
    aggression: 0.20,
    bluffFrequency: 0.03,
    startingHandRange: 0.15,
    reactionTimeMin: 2000,
    reactionTimeMax: 5000,
    randomization: 0.40,
  },
  'intermediate': {
    skillLevel: 45,
    aggression: 0.45,
    bluffFrequency: 0.10,
    startingHandRange: 0.30,
    reactionTimeMin: 1000,
    reactionTimeMax: 3000,
    randomization: 0.15,
  },
  'aggressive': {
    skillLevel: 60,
    aggression: 0.80,
    bluffFrequency: 0.20,
    threeBetFrequency: 0.15,
    continuationBetFrequency: 0.75,
    riskTolerance: 0.70,
  },
  'tight': {
    skillLevel: 55,
    aggression: 0.25,
    bluffFrequency: 0.05,
    startingHandRange: 0.12,
    continuationBetFrequency: 0.30,
    riskTolerance: 0.15,
  },
  'gto': {
    skillLevel: 95,
    strategyMode: 'gto',
    gtoDeviation: 0.02,
    aggression: 0.50,
    bluffFrequency: 0.15,
    randomization: 0.02,
  },
  'exploitative': {
    skillLevel: 75,
    strategyMode: 'exploitative',
    adaptationSpeed: 0.70,
    aggression: 0.65,
    bluffFrequency: 0.18,
    bluffCatchFrequency: 0.25,
  },
  'nitty': {
    skillLevel: 30,
    aggression: 0.10,
    bluffFrequency: 0.01,
    startingHandRange: 0.08,
    continuationBetFrequency: 0.15,
    riskTolerance: 0.05,
  },
  'maniac': {
    skillLevel: 25,
    aggression: 0.95,
    bluffFrequency: 0.35,
    startingHandRange: 0.60,
    threeBetFrequency: 0.25,
    riskTolerance: 0.90,
    tiltThreshold: 2,
  },
};

// ═══════════════════════════════════════════════════════════
// CONFIG PERSISTENCE
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// EXTERNAL PRESET MANAGEMENT
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// STRATEGY REGISTRY
// ═══════════════════════════════════════════════════════════

/**
 * Strategy interface that all decision engines must implement.
 * 
 * TODO: Each strategy will be a separate module in src/engine/strategies/
 * TODO: Strategies will be dynamically loaded for tree-shaking
 */
export interface Strategy {
  /** Unique identifier for this strategy */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this strategy does */
  description: string;
  /** Minimum skill level required */
  minSkillLevel: number;
  /** Maximum skill level cap */
  maxSkillLevel: number;
  
  /**
   * Make a decision for the given player state.
   * @returns Decision with reasoning and confidence
   */
  decide(
    state: GameState,
    player: Player,
    config: TrainingBotConfig,
    observations?: Map<string, OpponentObservation>,
  ): BotDecision;
}

/**
 * Registry of all available strategies.
 * New strategies are registered here to be discoverable.
 */
export class StrategyRegistry {
  private static strategies: Map<string, Strategy> = new Map();
  
  /**
   * Register a new strategy.
   * Called by strategy modules during initialization.
   */
  static register(strategy: Strategy): void {
    this.strategies.set(strategy.id, strategy);
  }
  
  /**
   * Get a strategy by ID.
   */
  static get(id: string): Strategy | undefined {
    return this.strategies.get(id);
  }
  
  /**
   * Get all registered strategies.
   */
  static getAll(): Strategy[] {
    return Array.from(this.strategies.values());
  }
  
  /**
   * Get strategies suitable for a given skill level.
   */
  static getForSkillLevel(skillLevel: number): Strategy[] {
    return Array.from(this.strategies.values())
      .filter(s => skillLevel >= s.minSkillLevel && skillLevel <= s.maxSkillLevel);
  }
}

// ═══════════════════════════════════════════════════════════
// BOT DECISION TYPE
// ═══════════════════════════════════════════════════════════

/**
 * A single decision returned by the bot engine.
 */
export interface BotDecision {
  /** The chosen action */
  action: 'fold' | 'check' | 'call' | 'raise';
  /** Raise amount (only set when action is 'raise') */
  amount?: number;
  /** Confidence in the decision (0–1) */
  confidence: number;
  /** Human-readable explanation */
  reasoning: string;
  /** Simulated reaction time in seconds */
  reactionTime: number;
  /** Whether this is a bluff */
  isBluff: boolean;
  /** Expected value of this decision (in bb) */
  ev?: number;
  /** GTO comparison if available */
  gtoComparison?: GtoComparison;
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Calculate hand strength tier preflop.
 * Used by all strategies for hand evaluation.
 * 
 * @returns Tier 1-10 where 10 = premium (AA), 1 = junk (72o)
 */
export function getPreflopHandTier(holeCards: Card[]): number {
  if (holeCards.length < 2) return 0;
  
  const v1 = cardRankValue(holeCards[0].rank);
  const v2 = cardRankValue(holeCards[1].rank);
  const high = Math.max(v1, v2);
  const low = Math.min(v1, v2);
  const suited = isSuited(holeCards);
  const pair = v1 === v2;
  const gap = high - low;
  
  if (pair) {
    if (high >= 12) return 10;  // QQ+
    if (high >= 10) return 9;   // TT-JJ
    if (high >= 8) return 7;    // 88-99
    if (high >= 6) return 5;    // 66-77
    return 3;                    // 22-55
  }
  
  let tier = 0;
  if (high === 14 && low >= 11) tier = suited ? 9 : 8;
  if (high === 14 && low === 10) tier = suited ? 7 : 6;
  if (high === 13 && low >= 11) tier = suited ? 8 : 6;
  if (high === 13 && low === 10) tier = suited ? 6 : 5;
  if (high === 12 && low === 11) tier = suited ? 6 : 5;
  if (high === 12 && low === 10) tier = suited ? 5 : 4;
  
  if (high >= 10 && low >= 9 && tier === 0) tier = suited ? 4 : 3;
  if (high >= 10 && tier === 0) tier = suited ? 3 : 2;
  if (suited && gap <= 2 && high >= 7 && tier < 5) tier = Math.max(tier, 4);
  if (suited && gap <= 3 && high >= 8 && tier < 3) tier = Math.max(tier, 2);
  
  return tier || (suited ? 2 : 1);
}

/**
 * Get the appropriate preflop hand opening range based on position
 * and the bot's startingHandRange configuration.
 * 
 * @param position Index of player (0 = SB, last = BTN)
 * @param totalPlayers Total number of players at the table
 * @param config Training bot configuration
 * @returns True if the bot should open with this hand
 */
export function shouldOpenHand(
  holeCards: Card[],
  position: number,
  totalPlayers: number,
  config: TrainingBotConfig,
): boolean {
  if (holeCards.length < 2) return false;
  
  const tier = getPreflopHandTier(holeCards);
  const posMult = getPositionMultiplier(position, totalPlayers);
  
  // Position affects how wide we can play
  const effectiveRange = config.startingHandRange * posMult;
  
  // Skill level affects hand selection quality
  const skillThreshold = 10 - (config.skillLevel / 100) * 6; // 10 (random) to 4 (tight)
  
  return tier >= skillThreshold * effectiveRange;
}

/**
 * Calculate position multiplier for hand strength and sizing.
 */
export function getPositionMultiplier(
  position: number,
  totalPlayers: number,
): number {
  const relativePos = totalPlayers <= 1 ? 0.5 : position / (totalPlayers - 1);
  if (relativePos >= 0.8) return 1.25;  // BTN
  if (relativePos >= 0.6) return 1.10;  // CO
  if (relativePos >= 0.4) return 1.00;  // MP
  if (relativePos >= 0.2) return 0.90;  // UTG
  return 0.80;                          // SB/BB
}

/**
 * Calculate bet size based on street, position, hand strength, and config.
 * 
 * TODO: Replace with GTO-derived sizing tables when solver integration is added
 */
export function calculateTrainingBetSize(params: {
  street: string;
  pot: number;
  playerChips: number;
  currentBet: number;
  handStrength: number;
  positionNormalized: number;
  opponentCount: number;
  aggression: number;
  config: TrainingBotConfig;
}): number {
  const { street, pot, playerChips, currentBet, handStrength, positionNormalized, opponentCount, aggression, config } = params;
  
  if (street === 'preflop') {
    const baseMultiplier = config.preflopOpenSize * (0.8 + aggression * 0.6);
    const strengthBonus = handStrength > 0.7 ? 0.5 : handStrength > 0.5 ? 0.25 : 0;
    const positionDiscount = positionNormalized > 0.6 ? -0.25 : 0;
    const multiplier = baseMultiplier + strengthBonus + positionDiscount;
    const openSize = currentBet * multiplier;
    const opponentBonus = Math.max(0, (opponentCount - 1) * currentBet * 0.5);
    return Math.min(currentBet + openSize + opponentBonus, playerChips);
  }
  
  let potFraction: number;
  if (handStrength > 0.80) potFraction = 0.65 + aggression * 0.25;
  else if (handStrength > 0.60) potFraction = 0.50 + aggression * 0.20;
  else if (handStrength > 0.40) potFraction = 0.40 + aggression * 0.20;
  else potFraction = 0.33 + aggression * 0.17;
  
  if (positionNormalized > 0.7) potFraction *= 0.85;
  else if (positionNormalized < 0.3) potFraction *= 1.10;
  
  if (opponentCount >= 3) potFraction *= 1.20;
  else if (opponentCount === 2) potFraction *= 1.08;
  
  const spr = pot > 0 ? playerChips / pot : 20;
  if (spr < 2) potFraction = Math.max(potFraction, 0.75);
  else if (spr > 10) potFraction *= 0.90;
  
  if (street === 'turn') potFraction *= 1.10;
  if (street === 'river') potFraction *= 1.25;
  
  const raiseAmount = Math.min(pot * potFraction, playerChips);
  return currentBet + Math.max(raiseAmount, currentBet * 1.5);
}

/**
 * Generate a unique hand ID.
 */
export function generateHandId(): string {
  return `hand_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create default opponent observation data.
 */
export function createEmptyObservation(): OpponentObservation {
  return {
    handsObserved: 0,
    vtap: 0,
    pfr: 0,
    foldToCbet: 0,
    foldTo3bet: 0,
    stealFreq: 0,
    bluffFreq: 0,
    aggFreq: 0,
    avgBetSize: 0,
    showdownFreq: 0,
  };
}

/**
 * Update opponent observations with a new hand action.
 * 
 * TODO: This is a simplified version. Full implementation will
 * track all actions across all streets for accurate stats.
 */
export function updateOpponentObservation(
  observer: OpponentObservation,
  action: string,
  street: string,
  wasAggressor: boolean,
  potBefore: number,
  betAmount: number,
): OpponentObservation {
  observer.handsObserved++;
  
  // Simplified stat updates
  if (wasAggressor) {
    observer.aggFreq += 1 / observer.handsObserved;
  }
  if (betAmount > 0) {
    observer.avgBetSize = (observer.avgBetSize * (observer.handsObserved - 1) + betAmount / Math.max(1, potBefore)) / observer.handsObserved;
  }
  
  return observer;
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

/**
 * Re-export botDecision from botEngine for backward compatibility.
 * The Training Bot engine will gradually replace this with the
 * new strategy-based system.
 */
export { botDecision, createBotSettings, createOpponentSettings, type BotPersonality, type BotSettings } from '../utils/botEngine';
