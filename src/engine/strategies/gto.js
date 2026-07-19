/**
 * GTO Baseline Strategy
 *
 * Makes decisions using hand tier evaluation, position awareness,
 * and pot odds. Serves as the reference point for all other strategies.
 *
 * Autonomous mode: reactionTime is calculated based on decision complexity
 * so the input simulator can pace human-like timing.
 */
import { getPreflopHandTier, shouldOpenHand, calculateTrainingBetSize } from '../trainingBot';
export const gtoStrategy = {
    id: 'gto',
    name: 'GTO Baseline',
    description: 'Game Theory Optimal baseline play using hand tiers, position, and pot odds.',
    minSkillLevel: 40,
    maxSkillLevel: 100,
    decide(state, player, config, _observations) {
        const { hand, position, chips } = player;
        const { currentPhase, currentBet, pot } = state;
        // Preflop decision
        if (currentPhase === 'preflop') {
            return gtoPreflopDecision(state, player, config, hand, currentBet, pot);
        }
        // Postflop decision
        return gtoPostflopDecision(state, player, config, hand, chips, pot, currentBet);
    },
};
/**
 * Make a preflop decision using hand tier evaluation and pot odds.
 */
function gtoPreflopDecision(state, player, config, hand, currentBet, potSize) {
    if (!hand || hand.length < 2) {
        return { action: 'fold', confidence: 0.9, reasoning: 'No cards', reactionTime: 0.5, isBluff: false };
    }
    const tier = getPreflopHandTier(hand);
    const shouldPlay = shouldOpenHand(hand, player.position, state.players.length, config);
    // Facing a bet — call or fold based on tier and pot odds
    if (currentBet > player.bet) {
        const amountToCall = currentBet - player.bet;
        const potOdds = amountToCall / (potSize + amountToCall * 2);
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
            pot: potSize,
            playerChips: player.chips,
            currentBet: currentBet || 2,
            handStrength: tier / 10,
            positionNormalized: player.position / Math.max(1, state.players.length - 1),
            opponentCount: state.players.filter(p => p.chips > 0).length,
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
/**
 * Make a postflop decision using pot odds and aggression parameters.
 */
function gtoPostflopDecision(state, player, config, hand, chips, potSize, currentBet) {
    if (!hand || hand.length < 2) {
        return { action: 'fold', confidence: 0.95, reasoning: 'No hand', reactionTime: 0.3, isBluff: false };
    }
    const aggression = config.aggression * (config.skillLevel / 100);
    // Facing a bet
    if (currentBet > player.bet) {
        const amountToCall = currentBet - player.bet;
        const potOdds = amountToCall / (potSize + amountToCall * 2);
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
            positionNormalized: player.position / Math.max(1, state.players.length - 1),
            opponentCount: state.players.filter(p => p.chips > 0).length,
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
//# sourceMappingURL=gto.js.map