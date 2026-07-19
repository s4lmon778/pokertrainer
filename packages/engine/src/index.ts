/**
 * @pokertrainer/engine — Core Poker Engine
 *
 * Standalone package containing:
 * - GTO Solver (DCFRCFR-based)
 * - Training Bot engine (strategies, config, presets)
 * - Hand evaluator
 * - Bot decision engine
 * - Equity calculator
 * - Deck utilities
 * - Side pot calculator
 * - Config export/import
 *
 * Usage:
 * ```typescript
 * import { solve, getStrategyForHand } from '@pokertrainer/engine/gto-solver';
 * import { DEFAULT_TRAINING_CONFIG, StrategyRegistry } from '@pokertrainer/engine/training-bot';
 * import { evaluateHand } from '@pokertrainer/engine/hand-evaluator';
 * ```
 */

// ── GTO Solver ──
export * from '../../../src/engine/gto-solver/index';
export type {
  CardIndex,
  SolveResult,
  DCFRModule,
  SolverConfig,
  Action,
  Node,
  ActionNode,
  ChanceNode,
  TerminalNode,
  Street,
} from '../../../src/engine/gto-solver/types';

// ── Training Bot ──
export * from '../../../src/engine/trainingBot';
export type {
  TrainingBotConfig,
  StrategyMode,
  SkillLevel,
  OpponentStat,
  OpponentObservation,
  HandHistory,
  HandAction,
  HandMistake,
  GtoComparison,
  BotDecision,
  Strategy,
} from '../../../src/engine/trainingBot';

// ── Strategies ──
export * from '../../../src/engine/strategies/index';

// ── Core Utilities ──
export { evaluateHand } from '../../../src/utils/handEvaluator';
export {
  botDecision,
  createBotSettings,
  createOpponentSettings,
} from '../../../src/utils/botEngine';
export type {
  BotSettings,
  BotPersonality,
  OpponentStats,
} from '../../../src/utils/botEngine';
export { calculateSidePots } from '../../../src/utils/sidePot';
export { computeEquity, computeActionWinRates, winRateTextClass } from '../../../src/utils/equity';
export { createDeck, shuffleDeck, cardRankValue, isSuited, isConnected } from '../../../src/utils/deck';

// ── Config Export / Import ──
export { downloadConfig, importConfig, exportConfigJson, parseConfigJson, configSummary } from '../../../src/utils/configExport';

// ── Types ──
export type {
  Card,
  Suit,
  Rank,
  Player,
  GameState as PokerGameState,
  GamePhase,
  HandEvaluation as HandEvaluatorResult,
} from '../../../src/types/card';
