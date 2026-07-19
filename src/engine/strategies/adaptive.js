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
import { gtoStrategy } from './gto';
import { exploitativeStrategy } from './exploitative';
/**
 * Adaptive strategy that blends GTO baseline with exploitation
 * based on the number of hands observed against opponents.
 *
 * When total hands observed < config.observationHands, the strategy
 * leans toward GTO play. As more hands are observed, it gradually
 * shifts toward exploitative adjustments.
 */
export const adaptiveStrategy = {
    id: 'adaptive',
    name: 'Adaptive (GTO→Exploitative)',
    description: 'Blends GTO baseline with exploitation based on sample size.',
    minSkillLevel: 30,
    maxSkillLevel: 100,
    decide(state, player, config, observations) {
        // Sum total hands observed across all tracked opponents
        let totalHandsObserved = 0;
        for (const obs of observations?.values() || []) {
            totalHandsObserved += obs.handsObserved;
        }
        const handsNeeded = config.observationHands;
        // blendRatio: 0 = pure GTO, 1 = full exploitation
        const blendRatio = Math.min(1, totalHandsObserved / handsNeeded);
        // Get both decisions
        const gtoDecision = gtoStrategy.decide(state, player, config);
        const expDecision = exploitativeStrategy.decide(state, player, config, observations);
        // Blend confidence: weighted average based on data availability
        const finalConfidence = gtoDecision.confidence * (1 - blendRatio) + expDecision.confidence * blendRatio;
        // Return exploitative decision with blended confidence and reasoning
        // reactionTime flows through from expDecision (which inherits from GTO)
        return {
            ...expDecision,
            confidence: finalConfidence,
            reasoning: `${blendRatio > 0.5 ? 'Exploitative-leaning' : 'GTO-leaning'} — ${totalHandsObserved}/${handsNeeded} hands (${(blendRatio * 100).toFixed(0)}% blended)`,
        };
    },
};
//# sourceMappingURL=adaptive.js.map