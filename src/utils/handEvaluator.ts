import type { Card, HandEvaluation } from '../types/card';
import { cardRankValue } from './deck';

export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandEvaluation {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) {
    return { strength: 'high-card', score: 0, cards: holeCards, description: 'High Card' };
  }

  const combinations = getCombinations(allCards, 5);
  let bestEval: HandEvaluation | null = null;

  for (const combo of combinations) {
    const evalResult = evaluate5Card(combo);
    if (!bestEval || evalResult.score > bestEval.score) {
      bestEval = evalResult;
    }
  }

  return bestEval || { strength: 'high-card', score: 0, cards: holeCards, description: 'High Card' };
}

function evaluate5Card(cards: Card[]): HandEvaluation {
  const values = cards.map(c => cardRankValue(c.rank)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const rankCounts: Record<number, number> = {};
  for (const v of values) rankCounts[v] = (rankCounts[v] || 0) + 1;
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const isFlush = suits.every(s => s === suits[0]);
  const sortedValues = [...values].sort((a, b) => a - b);
  const isStraight = sortedValues.every((v, i) => i === 0 || v === sortedValues[i - 1] + 1) ||
    (sortedValues[0] === 2 && sortedValues[1] === 3 && sortedValues[2] === 4 && sortedValues[3] === 5 && sortedValues[4] === 14);

  const straightHigh = isStraight ? (
    sortedValues[0] === 2 && sortedValues[4] === 14 ? 5 : sortedValues[4]
  ) : 0;

  if (isFlush && isStraight && straightHigh === 14) {
    return { strength: 'royal-flush', score: 9000000 + straightHigh, cards, description: 'Royal Flush' };
  }
  if (isFlush && isStraight) {
    return { strength: 'straight-flush', score: 8000000 + straightHigh, cards, description: 'Straight Flush' };
  }
  if (counts[0] === 4) {
    const quadVal = parseInt(Object.keys(rankCounts).find(k => rankCounts[parseInt(k)] === 4) || '0');
    const kicker = parseInt(Object.keys(rankCounts).find(k => rankCounts[parseInt(k)] === 1) || '0');
    return { strength: 'four-of-a-kind', score: 7000000 + quadVal * 1000 + kicker, cards, description: 'Four of a Kind' };
  }
  if (counts[0] === 3 && counts[1] === 2) {
    const tripVal = parseInt(Object.keys(rankCounts).find(k => rankCounts[parseInt(k)] === 3) || '0');
    const pairVal = parseInt(Object.keys(rankCounts).find(k => rankCounts[parseInt(k)] === 2) || '0');
    return { strength: 'full-house', score: 6000000 + tripVal * 1000 + pairVal, cards, description: 'Full House' };
  }
  if (isFlush) {
    return { strength: 'flush', score: 5000000 + values.reduce((s, v, i) => s + v * Math.pow(15, 4 - i), 0), cards, description: 'Flush' };
  }
  if (isStraight) {
    return { strength: 'straight', score: 4000000 + straightHigh, cards, description: 'Straight' };
  }
  if (counts[0] === 3) {
    const tripVal = parseInt(Object.keys(rankCounts).find(k => rankCounts[parseInt(k)] === 3) || '0');
    const kickers = Object.keys(rankCounts)
      .filter(k => rankCounts[parseInt(k)] === 1)
      .map(k => parseInt(k))
      .sort((a, b) => b - a);
    const kicker1 = kickers[0] || 0;
    const kicker2 = kickers[1] || 0;
    return { strength: 'three-of-a-kind', score: 3000000 + tripVal * 10000 + kicker1 * 100 + kicker2, cards, description: 'Three of a Kind' };
  }
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = Object.entries(rankCounts)
      .filter(([, v]) => v === 2)
      .map(([k]) => parseInt(k))
      .sort((a, b) => b - a);
    return { strength: 'two-pair', score: 2000000 + pairs[0] * 100 + pairs[1], cards, description: 'Two Pair' };
  }
  if (counts[0] === 2) {
    const pairVal = parseInt(Object.keys(rankCounts).find(k => rankCounts[parseInt(k)] === 2) || '0');
    const kickers = Object.keys(rankCounts)
      .filter(k => rankCounts[parseInt(k)] === 1)
      .map(k => parseInt(k))
      .sort((a, b) => b - a);
    const kicker1 = kickers[0] || 0;
    const kicker2 = kickers[1] || 0;
    const kicker3 = kickers[2] || 0;
    return { strength: 'pair', score: 1000000 + pairVal * 100000 + kicker1 * 1000 + kicker2 * 10 + kicker3, cards, description: 'Pair' };
  }
  return { strength: 'high-card', score: values.reduce((s, v, i) => s + v * Math.pow(15, 4 - i), 0), cards, description: 'High Card' };
}

function getCombinations(arr: Card[], k: number): Card[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = getCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}
