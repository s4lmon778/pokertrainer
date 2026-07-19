import { evaluateHand } from './handEvaluator';
/**
 * Compute preflop raw equity (0-1) from hole cards using heuristics.
 * Used when community cards haven't been dealt yet and full hand evaluation
 * returns score 0 for fewer than 5 cards.
 */
export function computePreflopEquity(holeCards, opponentCount) {
    if (holeCards.length < 2)
        return 0.25;
    const rankValues = holeCards.map(c => rankToValue(c.rank));
    const high = Math.max(...rankValues);
    const low = Math.min(...rankValues);
    const isPair = high === low;
    const suited = holeCards[0].suit === holeCards[1].suit;
    const gap = high - low;
    let equity = 0.35;
    if (isPair) {
        equity = 0.45 + (high / 14) * 0.15;
    }
    else {
        equity = 0.25 + ((high + low) / 28) * 0.25;
        if (suited)
            equity += 0.04;
        if (gap <= 2)
            equity += 0.03;
        if (high >= 13)
            equity += 0.03;
    }
    const opponentPenalty = opponentCount > 1 ? Math.min(0.35, (opponentCount - 1) * 0.11) : 0;
    return Math.min(0.95, Math.max(0.05, equity * (1 - opponentPenalty)));
}
/**
 * Compute win probability (0-1) for a player given current game state.
 */
export function computeEquity(player, communityCards, currentPhase, activeOpponents) {
    if (player.hand.length < 2)
        return 0;
    let rawEquity;
    if (communityCards.length === 0) {
        rawEquity = computePreflopEquity(player.hand, activeOpponents);
    }
    else {
        const handEval = evaluateHand(player.hand, communityCards);
        const strengthPct = Math.min(100, Math.max(0, (handEval.score / 9500000) * 100));
        const opponentPenalty = activeOpponents > 1 ? Math.min(0.35, (activeOpponents - 1) * 0.11) : 0;
        rawEquity = Math.min(0.95, Math.max(0.05, (strengthPct / 100) * (1 - opponentPenalty)));
    }
    const phaseMultiplier = { preflop: 0.75, flop: 0.88, turn: 0.94, river: 1.0 };
    return rawEquity * (phaseMultiplier[currentPhase] || 0.75);
}
export function computeActionWinRates(player, communityCards, currentPhase, currentBet, pot, activeOpponents = 0) {
    const phaseEquity = computeEquity(player, communityCards, currentPhase, activeOpponents);
    const toCall = currentBet - player.bet;
    const potSize = Math.max(1, pot);
    const betRatio = toCall > 0 ? toCall / (potSize + toCall) : 0;
    const foldEquityBonus = toCall > 0 ? Math.min(12, betRatio * 30) : 0;
    return {
        fold: 0,
        checkCall: phaseEquity * 100,
        raise: Math.min(95, phaseEquity * 100 + foldEquityBonus),
        allIn: Math.min(95, phaseEquity * 100 + foldEquityBonus * 3),
    };
}
/** Shared color classifier for win rate percentages */
export function winRateColor(pct) {
    if (pct >= 55)
        return 'green';
    if (pct >= 30)
        return 'yellow';
    return 'red';
}
/** Tailwind classes for win rate text color */
export function winRateTextClass(pct) {
    const c = winRateColor(pct);
    return c === 'green' ? 'text-accent-green' : c === 'yellow' ? 'text-accent-yellow' : 'text-accent-red';
}
/** Tailwind classes for win rate background/border */
export function winRateBgClass(pct) {
    const c = winRateColor(pct);
    return c === 'green'
        ? 'bg-accent-green/15 border-accent-green/30'
        : c === 'yellow'
            ? 'bg-accent-yellow/15 border-accent-yellow/30'
            : 'bg-accent-red/15 border-accent-red/30';
}
/** Map card rank string to numeric value (A=14, K=13, etc.) */
function rankToValue(rank) {
    if (rank === 'A')
        return 14;
    if (rank === 'K')
        return 13;
    if (rank === 'Q')
        return 12;
    if (rank === 'J')
        return 11;
    return parseInt(rank);
}
//# sourceMappingURL=equity.js.map