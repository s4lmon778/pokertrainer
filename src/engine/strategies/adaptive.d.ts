/**
 * Adaptive Strategy
 *
 * Blends GTO baseline with exploitation based on sample size.
 * Starts GTO when insufficient data, gradually shifts to exploitative.
 *
 * Autonomous mode: reactionTime flows through from the exploitative
 * decision, ensuring the input simulator has timing data for every
 * adaptive decision.
 */
import type { Strategy } from '../trainingBot';
/**
 * Adaptive strategy that blends GTO baseline with exploitation
 * based on the number of hands observed against opponents.
 *
 * When total hands observed < config.observationHands, the strategy
 * leans toward GTO play. As more hands are observed, it gradually
 * shifts toward exploitative adjustments.
 */
export declare const adaptiveStrategy: Strategy;
//# sourceMappingURL=adaptive.d.ts.map