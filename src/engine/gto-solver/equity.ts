/**
 * Hand Equity Calculator
 * 
 * Computes hand equity for terminal node payoffs using monte carlo sampling.
 * Integrates with the existing handEvaluator.ts for hand strength evaluation.
 */

import { evaluateHand } from '../../utils/handEvaluator';
import type { Card } from '../../types/card';
import type { CardIndex } from './types';

// Card encoding helpers (0-51 standard poker encoding)
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
const SUITS = ['c', 'd', 'h', 's'] as const;

/**
 * Convert card index (0-51) to Card object.
 */
export function cardIndexToCard(card: number): Card {
  const rankIdx = card % 13;
  const suitIdx = Math.floor(card / 13);
  
  return {
    suit: SUITS[suitIdx] as Card['suit'],
    rank: RANKS[rankIdx] as Card['rank'],
    id: `${RANKS[rankIdx]}${SUITS[suitIdx]}`,
  };
}

/**
 * Convert card index to readable string.
 */
export function cardIndexToString(card: number): string {
  const rank = card % 13;
  const suit = Math.floor(card / 13);
  return `${RANKS[rank]}${SUITS[suit]}`;
}

/**
 * Convert readable format to card index.
 */
export function stringToCardIndex(str: string): number {
  const rankStr = str.slice(0, -1) as typeof RANKS[number];
  const suitStr = str.slice(-1) as typeof SUITS[number];
  const rankIdx = RANKS.indexOf(rankStr);
  const suitIdx = SUITS.indexOf(suitStr);
  return suitIdx * 13 + rankIdx;
}

/**
 * Get all possible hands for a player given board and remaining cards.
 * Uses monte carlo sampling for efficiency.
 */
export function sampleOpponentHands(
  board: number[],
  ownHand: number[],
  sampleSize: number = 1000
): number[][] {
  const available = getAvailableCards(board, ownHand);
  const hands: number[][] = [];
  
  for (let i = 0; i < sampleSize; i++) {
    const hand = drawTwoCards(available);
    hands.push(hand);
  }
  
  return hands;
}

/**
 * Get cards not on board and not in own hand.
 */
function getAvailableCards(board: number[], ownHand: number[]): number[] {
  const used = new Set([...board, ...ownHand]);
  const available: number[] = [];
  
  for (let i = 0; i < 52; i++) {
    if (!used.has(i)) {
      available.push(i);
    }
  }
  
  return available;
}

/**
 * Draw two random cards from available pool.
 */
function drawTwoCards(available: number[]): number[] {
  const cards = [...available];
  const hand: number[] = [];
  
  for (let i = 0; i < 2; i++) {
    const idx = Math.floor(Math.random() * cards.length);
    hand.push(cards.splice(idx, 1)[0]);
  }
  
  return hand;
}

/**
 * Compute hand equity for a given board and hero hand.
 * Samples opponent hands and computes win/tie percentages.
 */
export function computeHandEquity(
  board: number[],
  heroHand: number[],
  sampleSize: number = 1000
): { winRate: number; tieRate: number; equity: number } {
  let wins = 0;
  let ties = 0;
  
  for (let i = 0; i < sampleSize; i++) {
    const villainHand = drawTwoCards(getAvailableCards(board, heroHand));
    
    const heroCards = heroHand.map(cardIndexToCard);
    const villainCards = villainHand.map(cardIndexToCard);
    const communityCards = board.map(cardIndexToCard);
    
    const heroRank = evaluateHand(heroCards, communityCards);
    const villainRank = evaluateHand(villainCards, communityCards);
    
    if (heroRank.score > villainRank.score) wins++;
    else if (heroRank.score === villainRank.score) ties++;
  }
  
  const winRate = wins / sampleSize;
  const tieRate = ties / sampleSize;
  const equity = winRate + tieRate / 2;
  
  return { winRate, tieRate, equity };
}

/**
 * Compute terminal payoff for a showdown.
 * Returns [hero_payoff, villain_payoff] in chips.
 */
export function computeShowdownPayoff(
  board: number[],
  heroHand: number[],
  villainHand: number[],
  potSize: number
): [number, number] {
  const heroCards = heroHand.map(cardIndexToCard);
  const villainCards = villainHand.map(cardIndexToCard);
  const communityCards = board.map(cardIndexToCard);
  
  const heroRank = evaluateHand(heroCards, communityCards);
  const villainRank = evaluateHand(villainCards, communityCards);
  
  if (heroRank.score > villainRank.score) {
    return [potSize, -potSize];
  } else if (villainRank.score > heroRank.score) {
    return [-potSize, potSize];
  } else {
    return [0, 0]; // Split pot
  }
}

/**
 * Estimate equity for a hand against a range.
 * Used during solving to approximate terminal values.
 */
export function estimateEquityAgainstRange(
  hand: number[],
  board: number[],
  range: boolean[], // 1326-element range array
  samples: number = 500
): number {
  let totalEquity = 0;
  
  // Sample hands from range
  for (let i = 0; i < samples; i++) {
    const villainHand = sampleFromRange(range, board, hand);
    if (villainHand) {
      const equity = computeHeadToHeadEquity(hand, villainHand, board);
      totalEquity += equity;
    }
  }
  
  return totalEquity / samples;
}

/**
 * Sample a hand from a range matrix.
 */
function sampleFromRange(range: boolean[], board: number[], heroHand: number[]): number[] | null {
  // Simplified - real implementation would properly sample from 1326 matrix
  const available = getAvailableCards(board, heroHand);
  return drawTwoCards(available);
}

/**
 * Compute head-to-head equity between two hands.
 */
function computeHeadToHeadEquity(heroHand: number[], villainHand: number[], board: number[]): number {
  const heroCards = heroHand.map(cardIndexToCard);
  const villainCards = villainHand.map(cardIndexToCard);
  const communityCards = board.map(cardIndexToCard);
  
  const heroRank = evaluateHand(heroCards, communityCards);
  const villainRank = evaluateHand(villainCards, communityCards);
  
  if (heroRank.score > villainRank.score) return 1;
  if (heroRank.score < villainRank.score) return 0;
  return 0.5;
}
