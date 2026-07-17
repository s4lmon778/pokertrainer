import { describe, it, expect } from 'vitest';
import { 
  getLegalActions, 
  applyAction, 
  getTreeStats,
  type GameState
} from './game-tree';

describe('getLegalActions', () => {
  it('allows check when no current bet', () => {
    const state: GameState = {
      board: [],
      street: 'flop',
      pot: 2,
      stacks: [100, 100],
      currentPlayer: 0,
      lastToAct: 0,
      currentBet: 0,
      minimumBet: 2,
      raiseCount: 0,
      isAllIn: false,
    };
    const actions = getLegalActions(state, {
      range1: { numHands: 10 },
      range2: { numHands: 10 },
      inPositionPlayer: 0,
      initialBoard: [],
      initialStreet: 'flop',
      startingStack: 100,
      startingPot: 2,
      minimumBet: 2,
      allInThreshold: 0.67,
    });
    
    const hasCheck = actions.some(a => a.kind === 'CHECK');
    expect(hasCheck).toBe(true);
  });

  it('allows fold and call when facing bet', () => {
    const state: GameState = {
      board: [],
      street: 'flop',
      pot: 10,
      stacks: [50, 100],
      currentPlayer: 1,
      lastToAct: 0,
      currentBet: 5,
      minimumBet: 2,
      raiseCount: 0,
      isAllIn: false,
    };
    const actions = getLegalActions(state, {
      range1: { numHands: 10 },
      range2: { numHands: 10 },
      inPositionPlayer: 0,
      initialBoard: [],
      initialStreet: 'flop',
      startingStack: 100,
      startingPot: 2,
      minimumBet: 2,
      allInThreshold: 0.67,
    });
    
    const hasFold = actions.some(a => a.kind === 'FOLD');
    const hasCall = actions.some(a => a.kind === 'CALL');
    expect(hasFold).toBe(true);
    expect(hasCall).toBe(true);
  });
});

describe('applyAction', () => {
  it('updates lastToAct on check', () => {
    const state: GameState = {
      board: [],
      street: 'flop',
      pot: 2,
      stacks: [100, 100],
      currentPlayer: 0,
      lastToAct: 0,
      currentBet: 0,
      minimumBet: 2,
      raiseCount: 0,
      isAllIn: false,
    };
    const newState = applyAction(state, { kind: 'CHECK' }, {
      range1: { numHands: 10 },
      range2: { numHands: 10 },
      inPositionPlayer: 0,
      initialBoard: [],
      initialStreet: 'flop',
      startingStack: 100,
      startingPot: 2,
      minimumBet: 2,
      allInThreshold: 0.67,
    });
    
    expect(newState.lastToAct).toBe(0);
  });

  it('deducts stack on bet', () => {
    const state: GameState = {
      board: [],
      street: 'flop',
      pot: 10,
      stacks: [100, 100],
      currentPlayer: 0,
      lastToAct: 0,
      currentBet: 0,
      minimumBet: 2,
      raiseCount: 0,
      isAllIn: false,
    };
    const newState = applyAction(state, { kind: 'BET', size: 0.5 }, {
      range1: { numHands: 10 },
      range2: { numHands: 10 },
      inPositionPlayer: 0,
      initialBoard: [],
      initialStreet: 'flop',
      startingStack: 100,
      startingPot: 2,
      minimumBet: 2,
      allInThreshold: 0.67,
    });
    
    expect(newState.stacks[0]).toBeLessThan(100);
    expect(newState.pot).toBeGreaterThan(10);
  });

  it('switches player after action', () => {
    const state: GameState = {
      board: [],
      street: 'flop',
      pot: 2,
      stacks: [100, 100],
      currentPlayer: 0,
      lastToAct: 0,
      currentBet: 0,
      minimumBet: 2,
      raiseCount: 0,
      isAllIn: false,
    };
    const newState = applyAction(state, { kind: 'CHECK' }, {
      range1: { numHands: 10 },
      range2: { numHands: 10 },
      inPositionPlayer: 0,
      initialBoard: [],
      initialStreet: 'flop',
      startingStack: 100,
      startingPot: 2,
      minimumBet: 2,
      allInThreshold: 0.67,
    });
    
    expect(newState.currentPlayer).toBe(1);
  });
});

describe('getTreeStats', () => {
  it('reports correct range sizes', () => {
    const stats = getTreeStats({} as any, {
      range1: { numHands: 500 },
      range2: { numHands: 300 },
      inPositionPlayer: 0,
      initialBoard: [],
      initialStreet: 'flop',
      startingStack: 100,
      startingPot: 2,
      minimumBet: 2,
      allInThreshold: 0.67,
    });
    
    expect(stats.p1NumHands).toBe(500);
    expect(stats.p2NumHands).toBe(300);
  });
});
