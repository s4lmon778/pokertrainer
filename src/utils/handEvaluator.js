import { cardRankValue } from './deck';
export function evaluateHand(holeCards, communityCards) {
    const allCards = [...holeCards, ...communityCards];
    if (allCards.length < 5) {
        return { strength: 'high-card', score: 0, cards: holeCards, description: 'High Card' };
    }
    const combinations = getCombinations(allCards, 5);
    let bestEval = null;
    for (const combo of combinations) {
        const evalResult = evaluate5Card(combo);
        if (!bestEval || evalResult.score > bestEval.score) {
            bestEval = evalResult;
        }
    }
    return bestEval || { strength: 'high-card', score: 0, cards: holeCards, description: 'High Card' };
}
// Rank name lookup
const RANK_NAMES = {
    2: 'Deuces', 3: 'Threes', 4: 'Fours', 5: 'Fives', 6: 'Sixes',
    7: 'Sevens', 8: 'Eights', 9: 'Nines', 10: 'Tens',
    11: 'Jacks', 12: 'Queens', 13: 'Kings', 14: 'Aces',
};
// Score category boundaries — non-overlapping guarantees:
// High Card:       0 –   999,999
// Pair:      1,000,000 – 1,999,999
// Two Pair:  2,000,000 – 2,999,999
// Trips:     3,000,000 – 3,999,999
// Straight:  4,000,000 – 4,999,999
// Flush:     5,000,000 – 5,999,999
// Boat:      6,000,000 – 6,999,999
// Quads:     7,000,000 – 7,999,999
// Str-Flush: 8,000,000 – 8,999,999
// Royal:     9,000,000+
function highCardScore(values) {
    return values.reduce((s, v, i) => s + v * Math.pow(15, 4 - i), 0);
}
function evaluate5Card(cards) {
    const values = cards.map(c => cardRankValue(c.rank)).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);
    const rankCounts = {};
    for (const v of values)
        rankCounts[v] = (rankCounts[v] || 0) + 1;
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const isFlush = suits.every(s => s === suits[0]);
    // Straight check (ascending order)
    const sortedValues = [...values].sort((a, b) => a - b);
    const isWheel = sortedValues[0] === 2 && sortedValues[1] === 3 && sortedValues[2] === 4 && sortedValues[3] === 5 && sortedValues[4] === 14;
    const isStraight = sortedValues.every((v, i) => i === 0 || v === sortedValues[i - 1] + 1) || isWheel;
    const straightHigh = isStraight ? (isWheel ? 5 : sortedValues[4]) : 0;
    // Helper: get all ranks with a given count, sorted descending
    const ranksOf = (count) => Object.entries(rankCounts)
        .filter(([, c]) => c === count)
        .map(([k]) => parseInt(k))
        .sort((a, b) => b - a);
    // --- Royal Flush ---
    if (isFlush && isStraight && straightHigh === 14) {
        return { strength: 'royal-flush', score: 9000000, cards, description: 'Royal Flush' };
    }
    // --- Straight Flush ---
    if (isFlush && isStraight) {
        return { strength: 'straight-flush', score: 8000000 + straightHigh * 100, cards, description: `Straight Flush, ${RANK_NAMES[straightHigh]} high` };
    }
    // --- Four of a Kind ---
    if (counts[0] === 4) {
        const quad = ranksOf(4)[0];
        const kicker = ranksOf(1)[0] || 0;
        return { strength: 'four-of-a-kind', score: 7000000 + (quad - 2) * 1000 + kicker * 20, cards, description: `Quad ${RANK_NAMES[quad]}` };
    }
    // --- Full House ---
    if (counts[0] === 3 && counts[1] >= 2) {
        const trip = ranksOf(3)[0];
        const pair = ranksOf(2)[0] || ranksOf(3)[1] || 0;
        return { strength: 'full-house', score: 6000000 + trip * 1000 + pair * 20, cards, description: `Full House, ${RANK_NAMES[trip]} full of ${RANK_NAMES[pair]}` };
    }
    // --- Flush ---
    if (isFlush) {
        return { strength: 'flush', score: 5000000 + highCardScore(values), cards, description: `Flush, ${RANK_NAMES[values[0]]} high` };
    }
    // --- Straight ---
    if (isStraight) {
        return { strength: 'straight', score: 4000000 + straightHigh * 100, cards, description: `Straight, ${RANK_NAMES[straightHigh]} high` };
    }
    // --- Three of a Kind ---
    if (counts[0] === 3) {
        const trip = ranksOf(3)[0];
        const kickers = ranksOf(1);
        const k1 = kickers[0] || 0;
        const k2 = kickers[1] || 0;
        return { strength: 'three-of-a-kind', score: 3000000 + (trip - 2) * 15000 + k1 * 1000 + k2 * 70, cards, description: `Trip ${RANK_NAMES[trip]}` };
    }
    // --- Two Pair ---
    if (counts[0] === 2 && counts[1] === 2) {
        const pairs = ranksOf(2);
        const kicker = ranksOf(1)[0] || 0;
        return { strength: 'two-pair', score: 2000000 + (pairs[0] - 2) * 1000 + (pairs[1] - 2) * 50 + kicker, cards, description: `Two Pair, ${RANK_NAMES[pairs[0]]} and ${RANK_NAMES[pairs[1]]}` };
    }
    // --- One Pair ---
    if (counts[0] === 2) {
        const pair = ranksOf(2)[0];
        const kickers = ranksOf(1);
        const k1 = kickers[0] || 0;
        const k2 = kickers[1] || 0;
        const k3 = kickers[2] || 0;
        return { strength: 'pair', score: 1000000 + (pair - 2) * 15000 + k1 * 1000 + k2 * 70 + k3 * 5, cards, description: `Pair of ${RANK_NAMES[pair]}` };
    }
    // --- High Card ---
    return { strength: 'high-card', score: highCardScore(values), cards, description: `High Card, ${RANK_NAMES[values[0]]}` };
}
function getCombinations(arr, k) {
    if (k === 0)
        return [[]];
    if (arr.length === 0)
        return [];
    const [first, ...rest] = arr;
    const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
    const withoutFirst = getCombinations(rest, k);
    return [...withFirst, ...withoutFirst];
}
//# sourceMappingURL=handEvaluator.js.map