import type { GameState, Player } from '../types/card';
/**
 * Bot personality archetypes that determine play style.
 *
 * - `tight-aggressive` (TAG): Plays few hands but bets/raises aggressively.
 *   High accuracy, low variance. Preferred for consistent profit.
 * - `loose-aggressive` (LAG): Plays many hands with frequent aggression.
 *   High variance, harder to read. Can win big or lose big.
 * - `tight-passive` (Nit/Rock): Plays very few hands and rarely bets.
 *   Folds often, easy to exploit by aggressive players.
 * - `balanced`: Mix of TAG and LAG — unpredictable, GTO-inspired.
 */
export type BotPersonality = 'tight-aggressive' | 'loose-aggressive' | 'tight-passive' | 'balanced';
/**
 * Session-level opponent action tracking for learning rate adaptation.
 */
export interface OpponentStats {
    /** Total observed opponent actions this session */
    totalActions: number;
    /** Number of folds observed */
    folds: number;
    /** Number of calls observed */
    calls: number;
    /** Number of raises observed */
    raises: number;
}
/**
 * Configuration for bot decision-making behavior.
 *
 * All probability values are in the range 0–1.
 */
export interface BotSettings {
    /** How often the bot chooses bet/raise over check/call (0–1) */
    aggressionFactor: number;
    /** Probability of pure bluff when equity is low (0–1) */
    bluffFrequency: number;
    /** Probability of intentionally misreading hand strength (0–1) */
    mistakeRate: number;
    /** Minimum simulated reaction time in seconds */
    reactionTimeMin: number;
    /** Maximum simulated reaction time in seconds */
    reactionTimeMax: number;
    /** Current personality preset */
    personality: BotPersonality;
    /** Perceived table image that affects how opponents react */
    tableImage: 'rock' | 'tag' | 'loose' | 'maniac' | 'nit';
    /** Number of bad beats before tilt activates */
    tiltThreshold: number;
    /** Current tilt counter — increases with bad beats */
    currentTilt: number;
    /** Tight/loose preflop hand selection (0–1). 0.2=very tight, 0.8=very loose */
    tightLoose: number;
    /** Risk tolerance — willingness to put chips at risk (0–1) */
    riskTolerance: number;
    /** Continuation bet frequency when preflop aggressor (0–1) */
    continuationBetFreq: number;
    /** Check-raise frequency (0–1) */
    checkRaiseFreq: number;
    /** Float frequency — call c-bet to bluff later streets (0–1) */
    floatFreq: number;
    /** Tank frequency — extra thinking time on complex decisions (0–1) */
    tankFreq: number;
    /** Snap action frequency — instant decisions (0–1) */
    snapFreq: number;
    /** Humanization level — randomness injected to mimic humans (0–1) */
    humanizationLevel: number;
    /** Position awareness — how much position influences decisions (0–1) */
    positionAwareness: number;
    /** Stack size awareness — adjusts for effective stack depth (0–1) */
    stackSizeAwareness: number;
    /** Randomization between similar-EV bet sizings (0–1) */
    balanceRandomization: number;
    /** How quickly the bot adapts to observed opponent tendencies (0–1) */
    learningRate: number;
    /** How often the bot folds when facing a preflop raise (0–1) */
    foldToThreeBet: number;
}
/**
 * A single decision returned by the bot engine.
 */
export interface BotDecision {
    /** The chosen action */
    action: 'fold' | 'check' | 'call' | 'raise';
    /** Raise amount (only set when action is 'raise') */
    amount?: number;
    /** Confidence in the decision (0–1, higher = more certain) */
    confidence: number;
    /** Human-readable explanation of the decision */
    reasoning: string;
    /** Simulated reaction time in seconds */
    reactionTime: number;
    /** Whether this is a bluff */
    isBluff: boolean;
}
/**
 * Create bot settings for the training bot based on a personality archetype.
 *
 * Training bots have more extreme settings to make their behavior more
 * distinct and educational — players can learn to identify patterns.
 *
 * Personality presets:
 * | Archetype        | Aggression | Bluff % | Mistake % | Table Image |
 * |------------------|-----------|---------|-----------|-------------|
 * | tight-aggressive | 0.75      | 15%     | 1%        | TAG         |
 * | loose-aggressive | 0.85      | 25%     | 5%        | Maniac      |
 * | tight-passive    | 0.30      | 5%      | 1%        | Nit         |
 * | balanced         | 0.55      | 12%     | 2%        | TAG         |
 */
export declare function createBotSettings(personality: BotPersonality): BotSettings;
/**
 * Create settings for opponent bots (non-training bots at the table).
 *
 * Opponent settings are more moderate than training bot settings — they play
 * closer to GTO and are less predictable by design, simulating real opponents.
 * Mistake rates are slightly higher to reflect human-like play.
 */
export declare function createOpponentSettings(personality: BotPersonality): BotSettings;
export declare function botDecision(state: GameState, player: Player, settings?: BotSettings, opponentStats?: OpponentStats): BotDecision;
//# sourceMappingURL=botEngine.d.ts.map