/**
 * Strategy Registry Initializer
 *
 * Registers all available strategies with the StrategyRegistry.
 * This file should be imported once at application startup.
 *
 * To add a new strategy:
 * 1. Create the strategy module in src/engine/strategies/
 * 2. Import and register it here
 * 3. Add it to the TRAINING_BOT_STRATEGIES array
 */
/**
 * All registered training bot strategies.
 * New strategies should be added here.
 */
export declare const TRAINING_BOT_STRATEGIES: readonly [import("../trainingBot").Strategy, import("../trainingBot").Strategy, import("../trainingBot").Strategy];
/**
 * Initialize the strategy registry.
 * Call this once at application startup.
 */
export declare function initializeStrategies(): void;
//# sourceMappingURL=index.d.ts.map