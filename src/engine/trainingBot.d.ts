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
import type { Card, GameState, Player } from '../types/card';
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
export type SkillLevel = number;
/**
 * Complete configuration for the Training Bot.
 *
 * All parameters are independently adjustable to create
 * any desired playing style from beginner to solver-level.
 *
 * @remarks Persists to localStorage via saveConfig/saveConfigToStorage/loadConfigFromStorage
 */
export interface TrainingBotConfig {
    /** Overall skill level (1-100) */
    skillLevel: number;
    /** Strategy mode (see StrategyMode) */
    strategyMode: StrategyMode;
    /** How often the bot chooses to bet/raise vs check/call (0-1) */
    aggression: number;
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
    /** How many hands the bot plays preflop (0-1). 0.2 = very tight, 0.8 = very loose */
    startingHandRange: number;
    /** Preflop open sizing multiplier (1.0 = standard, 2.0 = huge opens) */
    preflopOpenSize: number;
    /** 3-bet frequency (0-1) */
    threeBetFrequency: number;
    /** 4-bet frequency (0-1) */
    fourBetFrequency: number;
    /** Continuation bet frequency when preflop aggressor (0-1) */
    continuationBetFrequency: number;
    /** Float frequency (call on flop to bluff on turn) (0-1) */
    floatFrequency: number;
    /** Check-raise frequency (0-1) */
    checkRaiseFrequency: number;
    /** Willingness to go all-in (0-1). 0 = never, 1 = always when favored */
    riskTolerance: number;
    /** Variance tolerance — how comfortable with downswings (affects tilt) */
    varianceTolerance: number;
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
    /** How many bad beats before entering tilt */
    tiltThreshold: number;
    /** How aggressive the bot gets when tilted */
    tiltAggressionMultiplier: number;
    /** How much tilt reduces decision quality */
    tiltQualityReduction: number;
    /** How quickly the bot recovers from tilt */
    tiltRecoveryRate: number;
    /** How much position influences hand selection (0-1) */
    positionAwareness: number;
    /** How much position influences bet sizing (0-1) */
    positionBetSizing: number;
    /** How quickly the bot adapts to opponent patterns */
    adaptationSpeed: number;
    /** Number of hands before the bot starts adapting */
    observationHands: number;
    /** What stats to track about opponents */
    trackedStats: OpponentStat[];
    /** GTO deviation allowance (0 = perfect GTO, 1 = no GTO constraints) */
    gtoDeviation: number;
    /** Confidence threshold for deviating from GTO */
    gtoDeviationThreshold: number;
}
/**
 * Statistics to track about each opponent for adaptive play.
 */
export type OpponentStat = 'vtap' | 'pfr' | 'foldToCbet' | 'foldTo3bet' | 'stealFreq' | 'bluffFreq' | 'aggFreq' | 'avgBetSize' | 'showdownFreq';
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
    evDifference: number;
    confidence: number;
}
/**
 * Default Training Bot configuration.
 * Balanced settings suitable for general poker training.
 */
export declare const DEFAULT_TRAINING_CONFIG: TrainingBotConfig;
/**
 * Preset configurations for common playing styles.
 *
 * TODO: Load these from external JSON for hot-swappable presets
 */
export declare const TRAINING_PRESETS: Record<string, Partial<TrainingBotConfig>>;
/**
 * Serialize TrainingBotConfig to JSON string.
 * Used by localStorage persistence and future desktop app file I/O.
 */
export declare function saveConfig(config: TrainingBotConfig): string;
/**
 * Deserialize JSON string to TrainingBotConfig.
 * Throws if JSON is invalid or missing required fields.
 */
export declare function loadConfig(json: string): TrainingBotConfig;
/**
 * Save config to localStorage under the 'trainingBotConfig' key.
 */
export declare function saveConfigToStorage(config: TrainingBotConfig): void;
/**
 * Load config from localStorage. Returns DEFAULT if nothing saved.
 */
export declare function loadConfigFromStorage(): TrainingBotConfig;
/**
 * Save a custom preset to localStorage.
 */
export declare function savePreset(name: string, config: TrainingBotConfig): void;
/**
 * Load a custom preset by name. Returns null if not found.
 */
export declare function loadPreset(name: string): TrainingBotConfig | null;
/**
 * List all saved custom preset names.
 */
export declare function listPresets(): string[];
/**
 * Delete a custom preset.
 */
export declare function deletePreset(name: string): void;
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
    decide(state: GameState, player: Player, config: TrainingBotConfig, observations?: Map<string, OpponentObservation>): BotDecision;
}
/**
 * Registry of all available strategies.
 * New strategies are registered here to be discoverable.
 */
export declare class StrategyRegistry {
    private static strategies;
    /**
     * Register a new strategy.
     * Called by strategy modules during initialization.
     */
    static register(strategy: Strategy): void;
    /**
     * Get a strategy by ID.
     */
    static get(id: string): Strategy | undefined;
    /**
     * Get all registered strategies.
     */
    static getAll(): Strategy[];
    /**
     * Get strategies suitable for a given skill level.
     */
    static getForSkillLevel(skillLevel: number): Strategy[];
}
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
/**
 * Calculate hand strength tier preflop.
 * Used by all strategies for hand evaluation.
 *
 * @returns Tier 1-10 where 10 = premium (AA), 1 = junk (72o)
 */
export declare function getPreflopHandTier(holeCards: Card[]): number;
/**
 * Get the appropriate preflop hand opening range based on position
 * and the bot's startingHandRange configuration.
 *
 * @param position Index of player (0 = SB, last = BTN)
 * @param totalPlayers Total number of players at the table
 * @param config Training bot configuration
 * @returns True if the bot should open with this hand
 */
export declare function shouldOpenHand(holeCards: Card[], position: number, totalPlayers: number, config: TrainingBotConfig): boolean;
/**
 * Calculate position multiplier for hand strength and sizing.
 */
export declare function getPositionMultiplier(position: number, totalPlayers: number): number;
/**
 * Calculate bet size based on street, position, hand strength, and config.
 *
 * TODO: Replace with GTO-derived sizing tables when solver integration is added
 */
export declare function calculateTrainingBetSize(params: {
    street: string;
    pot: number;
    playerChips: number;
    currentBet: number;
    handStrength: number;
    positionNormalized: number;
    opponentCount: number;
    aggression: number;
    config: TrainingBotConfig;
}): number;
/**
 * Generate a unique hand ID.
 */
export declare function generateHandId(): string;
/**
 * Create default opponent observation data.
 */
export declare function createEmptyObservation(): OpponentObservation;
/**
 * Update opponent observations with a new hand action.
 *
 * TODO: This is a simplified version. Full implementation will
 * track all actions across all streets for accurate stats.
 */
export declare function updateOpponentObservation(observer: OpponentObservation, action: string, street: string, wasAggressor: boolean, potBefore: number, betAmount: number): OpponentObservation;
/**
 * Re-export botDecision from botEngine for backward compatibility.
 * The Training Bot engine will gradually replace this with the
 * new strategy-based system.
 */
export { botDecision, createBotSettings, createOpponentSettings, type BotPersonality, type BotSettings } from '../utils/botEngine';
//# sourceMappingURL=trainingBot.d.ts.map