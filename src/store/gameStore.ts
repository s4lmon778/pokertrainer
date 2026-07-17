import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, Player, GamePhase, Card as CardType, SidePot } from '../types/card';
import { createDeck, shuffleDeck } from '../utils/deck';
import { evaluateHand } from '../utils/handEvaluator';
import { botDecision, type BotSettings, createBotSettings, createOpponentSettings, type BotPersonality, type OpponentStats } from '../utils/botEngine';
import { calculateSidePots } from '../utils/sidePot';
import { DEFAULT_TRAINING_CONFIG, type TrainingBotConfig } from '../engine/trainingBot';

/**
 * TODO: Future Training Bot integration points:
 * - Add `trainingMetrics` to track per-hand EV, decision accuracy, and bluff success rate
 * - Store hand snapshots for post-session replay and analysis
 * - Add bot self-assessment: compare bot decisions vs GTO baseline per street
 * - Track bot learning progress: does decision quality improve over sessions?
 * - Add configurable bot "coaching" mode with real-time decision feedback
 */

interface GameHistoryEntry {
  handNumber: number;
  winner: string;
  winningHand: string;
  potSize: number;
  duration: number;
  startTime: number;
  endTime: number;
  botResult: number;
  bluffs: number;
  mistakes: number;
  humanAccuracy?: number;
  numPlayers: number;
  humanPosition?: string;
  humanHandCategory?: string;
  humanHandDescription?: string;
}

interface Stats {
  totalHands: number;
  totalWon: number;
  totalLost: number;
  biggestWin: number;
  biggestLoss: number;
  avgPotSize: number;
  botSessions: number;
  botWins: number;
  botLosses: number;
  winRate: number;
  roi: number;
  bankrollHistory: number[];
  totalBets: number;
  totalCalls: number;
  totalFolds: number;
  avgDecisionTime: number;
  accuracyByPhase: Record<GamePhase, { correct: number; total: number }>;
  /** Per-position stats: key is position name (UTG, MP, CO, BTN, SB, BB) */
  positionStats: Record<string, { hands: number; wins: number; netProfit: number }>;
  /** Bluff tracking for training bot */
  bluffAttempts: number;
  bluffSuccesses: number;
  /** Hand strength category tracking */
  handStrengthStats: Record<string, { hands: number; wins: number }>;
}

interface TBotStats {
  handsPlayed: number;
  handsWon: number;
  handsLost: number;
  winRate: number;
  totalProfit: number;
  bankrollHistory: number[];
}

interface BotEvaluationEntry {
  handNumber: number;
  phase: GamePhase;
  player: string;
  action: string;
  actualHandStrength: number;
  recommendedAction: string;
  isCorrect: boolean;
  reasoning: string;
}

interface GameStore {
  gameState: GameState | null;
  gamePhase: GamePhase;
  isPlaying: boolean;
  isDealing: boolean;
  botSettings: BotSettings;
  /** Training Bot configuration — shared between web UI and future desktop bot */
  trainingBotConfig: TrainingBotConfig;
  trainingBotSettings: BotSettings;
  opponentPersonality: BotPersonality;
  gameHistory: GameHistoryEntry[];
  stats: Stats;
  tbotStats: TBotStats;
  currentBankroll: number;
  startingBankroll: number;
  selectedBotPersonality: BotPersonality;
  tableSize: number;
  buyIn: number;
  blinds: { small: number; big: number };
  showRiskOverlay: boolean;
  showTableTalk: boolean;
  showCardsAtEnd: boolean;
  autoPlayMode: boolean;
  autoRefillChips: boolean;
  tbotActivity: { action: string; amount?: number; confidence: number; reasoning: string; isBluff: boolean; isAllIn?: boolean; timestamp: number } | null;
  botEvaluations: BotEvaluationEntry[];
  autoPlaySpeed: number;
  sessionOpponentStats: OpponentStats;

  initializeGame: () => void;
  startHand: () => void;
  dealCommunityCards: (phase: GamePhase) => void;
  autoDealRemainingCards: () => void;
  botAct: () => Promise<void>;
  playerAct: (action: 'fold' | 'check' | 'call' | 'raise', amount?: number) => void;
  advancePhase: () => void;
  resolveHand: () => void;
  endHand: (winnerId: string, potDistribution?: Record<string, number>) => void;
  advanceTurn: () => void;
  updateBotSettings: (settings: Partial<BotSettings>) => void;
  updateTrainingBotSettings: (settings: Partial<BotSettings>) => void;
  updateTrainingBotConfig: (config: Partial<TrainingBotConfig>) => void;
  setPersonality: (personality: BotPersonality) => void;
  setTrainingPersonality: (personality: BotPersonality) => void;
  setOpponentPersonality: (personality: BotPersonality) => void;
  setTableSize: (size: number) => void;
  setBuyIn: (buyIn: number) => void;
  setStartingBankroll: (amount: number) => void;
  toggleRiskOverlay: () => void;
  toggleTableTalk: () => void;
  toggleShowCardsAtEnd: () => void;
  toggleAutoPlayMode: () => void;
  toggleAutoRefillChips: () => void;
  resetStats: () => void;
  nextHand: () => void;
  quitGame: () => void;
  addHumanChips: (amount: number) => void;
  setAutoPlaySpeed: (speed: number) => void;
  recordHumanDecision: (decision: Omit<BotEvaluationEntry, 'handNumber'>) => void;
}

// Helper: build a new player object
function makePlayer(
  id: string, name: string, position: number, chips: number,
  isBot: boolean, isTrainingBot?: boolean,
): Player {
  return {
    id, name, chips, position, isBot, isTrainingBot,
    hand: [], bet: 0, folded: false,
    totalBetThisRound: 0, totalHandBet: 0,
    isAllIn: false, actedThisRound: false,
  };
}

// Helper: reset player state for new hand
function resetForNewHand(p: Player): Player {
  return {
    ...p,
    hand: [],
    bet: 0,
    folded: false,
    totalBetThisRound: 0,
    totalHandBet: 0,
    isAllIn: false,
    actedThisRound: false,
  };
}

const DEFAULT_STATS: Stats = {
  totalHands: 0, totalWon: 0, totalLost: 0,
  biggestWin: 0, biggestLoss: 0, avgPotSize: 0,
  botSessions: 0, botWins: 0, botLosses: 0,
  winRate: 0, roi: 0, bankrollHistory: [],
  totalBets: 0, totalCalls: 0, totalFolds: 0, avgDecisionTime: 0,
  accuracyByPhase: {
    preflop: { correct: 0, total: 0 },
    flop: { correct: 0, total: 0 },
    turn: { correct: 0, total: 0 },
    river: { correct: 0, total: 0 },
    showdown: { correct: 0, total: 0 },
  },
  positionStats: {},
  bluffAttempts: 0,
  bluffSuccesses: 0,
  handStrengthStats: {},
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gameState: null,
      gamePhase: 'preflop',
      isPlaying: false,
      isDealing: false,
      botSettings: createBotSettings('balanced'),
    trainingBotConfig: DEFAULT_TRAINING_CONFIG,
      trainingBotSettings: createBotSettings('tight-aggressive'),
      opponentPersonality: 'balanced' as BotPersonality,
      gameHistory: [],
      stats: { ...DEFAULT_STATS },
      tbotStats: { handsPlayed: 0, handsWon: 0, handsLost: 0, winRate: 0, totalProfit: 0, bankrollHistory: [] },
      currentBankroll: 1000,
      startingBankroll: 1000,
      selectedBotPersonality: 'balanced',
      tableSize: 6,
      buyIn: 100,
      blinds: { small: 5, big: 10 },
      showRiskOverlay: true,
      showTableTalk: false,
      showCardsAtEnd: true,
      autoPlayMode: false,
      autoRefillChips: false,
      tbotActivity: null,
      botEvaluations: [],
      autoPlaySpeed: 400,
      sessionOpponentStats: { totalActions: 0, folds: 0, calls: 0, raises: 0 },

      // ── Initialize game ──
      initializeGame: () => {
        const { tableSize, buyIn, blinds } = get();
        const players: Player[] = [];
        players.push(makePlayer('human', 'You', 0, buyIn, false));
        players.push(makePlayer('training-bot', 'T-Bot', 1, buyIn, true, true));
        const opponentNames = ['Vortex', 'Phantom', 'Shadow', 'Ace', 'Titan', 'Nova', 'Blitz'];
        for (let i = 2; i < tableSize; i++) {
          players.push(makePlayer(`bot-${i}`, opponentNames[(i - 2) % opponentNames.length], i, buyIn, true));
        }
        set({
          gameState: {
            players, communityCards: [], pot: 0, sidePots: [],
            currentPhase: 'preflop', dealerPosition: 0,
            currentPlayerIndex: 0, currentBet: blinds.big,
            minRaise: blinds.big, lastRaiseAmount: blinds.big,
            handNumber: 0, deck: [], gameOver: false,
            sbPosition: 1, bbPosition: 2, preflopRaised: false,
          },
          isPlaying: true, gamePhase: 'preflop',
          sessionOpponentStats: { totalActions: 0, folds: 0, calls: 0, raises: 0 },
        });
      },

      // ── Start hand ──
      startHand: () => {
        const state = get();
        if (!state.gameState) return;
        const deck = shuffleDeck(createDeck());
        const { blinds, gameState, autoRefillChips, buyIn } = state;

        const players: Player[] = gameState.players.map(resetForNewHand);

        // Auto-refill busted players
        if (autoRefillChips) {
          for (const p of players) {
            if (p.chips <= 0) p.chips = buyIn;
          }
        }

        // Helper: find next player with chips > 0, starting from startIdx, wrapping
        const nextWithChips = (arr: Player[], startIdx: number): number => {
          for (let i = 0; i < arr.length; i++) {
            const idx = (startIdx + i) % arr.length;
            if (arr[idx].chips > 0) return idx;
          }
          return startIdx % arr.length; // fallback
        };

        // Find dealer, SB, BB skipping busted players
        const newDealer = nextWithChips(players, gameState.dealerPosition + 1);
        const sbIdx = nextWithChips(players, newDealer + 1);
        const bbIdx = nextWithChips(players, sbIdx + 1);

        // If heads-up (only 2 with chips), dealer = SB
        const activeCount = players.filter(p => p.chips > 0).length;
        const effectiveDealer = activeCount === 2 ? sbIdx : newDealer;

        // Post SB
        const sbAmount = Math.min(blinds.small, players[sbIdx].chips);
        players[sbIdx].chips -= sbAmount;
        players[sbIdx].bet = sbAmount;
        players[sbIdx].totalBetThisRound = sbAmount;
        players[sbIdx].totalHandBet = sbAmount;
        if (players[sbIdx].chips === 0) players[sbIdx].isAllIn = true;

        // Post BB
        const bbAmount = Math.min(blinds.big, players[bbIdx].chips);
        players[bbIdx].chips -= bbAmount;
        players[bbIdx].bet = bbAmount;
        players[bbIdx].totalBetThisRound = bbAmount;
        players[bbIdx].totalHandBet = bbAmount;
        if (players[bbIdx].chips === 0) players[bbIdx].isAllIn = true;

        // Deal hole cards
        const nonBusted = players.filter(p => p.chips > 0 || p.bet > 0);
        for (const p of nonBusted) {
          const c1 = deck.pop(); if (c1) p.hand.push(c1);
          const c2 = deck.pop(); if (c2) p.hand.push(c2);
        }

        const newSb = sbIdx;
        const newBb = bbIdx;

        // First-to-act after BB
        const utg = nextWithChips(players, bbIdx + 1);

        set({
          gameState: {
            ...gameState,
            players, communityCards: [],
            pot: sbAmount + bbAmount, sidePots: [],
            currentPhase: 'preflop', dealerPosition: effectiveDealer,
            currentPlayerIndex: utg,
            currentBet: Math.max(sbAmount, bbAmount),
            minRaise: blinds.big, lastRaiseAmount: blinds.big,
            handNumber: gameState.handNumber + 1,
            deck, gameOver: false,
            sbPosition: newSb, bbPosition: newBb,
            preflopRaised: false,
          },
          gamePhase: 'preflop', isDealing: true, isPlaying: true,
        });
        setTimeout(() => set({ isDealing: false }), 600);
      },

      // ── Deal community cards ──
      dealCommunityCards: (phase: GamePhase) => {
        const state = get();
        if (!state.gameState) return;
        const { deck, communityCards } = state.gameState;

        // Burn one card before dealing
        deck.pop();

        const cardsToDeal = phase === 'flop' ? 3 : 1;
        const newCommunity = [...communityCards];
        for (let i = 0; i < cardsToDeal; i++) {
          const card = deck.pop();
          if (card) newCommunity.push(card);
        }

        // Reset per-round state; all-in players (chips===0) keep bet/actedThisRound
        const players = state.gameState.players.map(p => ({
          ...p,
          bet: p.chips === 0 ? p.bet : 0,
          totalBetThisRound: p.chips === 0 ? p.totalBetThisRound : 0,
          actedThisRound: p.chips === 0 ? true : false,
        }));

        // After flop, first to act is first active player left of dealer
        let firstToAct = (state.gameState.dealerPosition + 1) % players.length;
        for (let i = 0; i < players.length; i++) {
          const idx = (state.gameState.dealerPosition + 1 + i) % players.length;
          if (players[idx].chips > 0 && !players[idx].folded) { firstToAct = idx; break; }
        }

        set({
          gameState: {
            ...state.gameState,
            players, communityCards: newCommunity,
            currentPhase: phase,
            currentPlayerIndex: firstToAct,
            currentBet: 0,
            minRaise: state.blinds.big,
            lastRaiseAmount: 0,
            lastAction: `${phase.charAt(0).toUpperCase() + phase.slice(1)} dealt`,
          },
          gamePhase: phase,
        });
      },

      // ── Auto-deal remaining community cards (all-in, no more betting) ──
      autoDealRemainingCards: () => {
        const state = get();
        if (!state.gameState || state.gameState.gameOver) return;
        const phases: GamePhase[] = ['preflop', 'flop', 'turn', 'river'];
        const currentIdx = phases.indexOf(state.gameState.currentPhase);
        for (let i = currentIdx + 1; i < phases.length; i++) {
          get().dealCommunityCards(phases[i]);
        }
      },

      // ── Bot act ──
      botAct: async () => {
        const state = get();
        if (!state.gameState) return;
        const gs = state.gameState;
        const pIdx = gs.currentPlayerIndex;
        const player = gs.players[pIdx];
        if (!player) return;
        if (!player.isBot && !state.autoPlayMode) return;
        if (player.folded || player.chips <= 0) return;

        const isAutoHuman = !player.isBot && state.autoPlayMode;
        const isTraining = player.isTrainingBot || isAutoHuman;
        const settings = isTraining ? state.trainingBotSettings : state.botSettings;
        const decision = botDecision(gs, player, settings, isTraining ? state.sessionOpponentStats : undefined);

        const players = gs.players.map(p => ({ ...p }));
        const cur = { ...players[pIdx] };
        let wasRaise = false;
        let isAllIn = false;
        const prevBet = cur.bet;

        switch (decision.action) {
          case 'fold':
            cur.folded = true;
            break;
          case 'check':
            break;
          case 'call': {
            const callAmt = Math.min(Math.round(gs.currentBet - cur.bet), cur.chips);
            if (callAmt > 0) {
              cur.chips -= callAmt;
              cur.bet += callAmt;
              cur.totalBetThisRound += callAmt;
              cur.totalHandBet += callAmt;
              if (cur.chips === 0) isAllIn = true;
            }
            break;
          }
          case 'raise': {
            // Enforce minimum raise (integers)
            const minTotal = gs.currentBet + Math.max(gs.minRaise, gs.lastRaiseAmount || gs.minRaise);
            const raiseTotal = Math.round(Math.max(decision.amount || minTotal, minTotal));
            const toAdd = Math.min(raiseTotal - cur.bet, cur.chips);
            if (toAdd > 0) {
              cur.chips -= toAdd;
              cur.bet += toAdd;
              cur.totalBetThisRound += toAdd;
              cur.totalHandBet += toAdd;
              wasRaise = true;
              if (cur.chips === 0) isAllIn = true;
            }
            break;
          }
        }

        cur.actedThisRound = true;
        if (isAllIn) cur.isAllIn = true;
        players[pIdx] = cur;

        // Reset actedThisRound for others when raising (they must respond)
        if (wasRaise) {
          for (let i = 0; i < players.length; i++) {
            if (i !== pIdx && !players[i].folded && players[i].chips > 0) {
              players[i].actedThisRound = false;
            }
          }
        }

        // Action label
        let actionLabel: string;
        if (decision.action === 'fold') actionLabel = 'folds';
        else if (decision.action === 'check') actionLabel = 'checks';
        else if (isAllIn) actionLabel = `all-in for $${cur.bet}`;
        else if (wasRaise) actionLabel = `raises to $${cur.bet}`;
        else if (decision.action === 'call') actionLabel = cur.bet > prevBet ? `calls $${cur.bet - prevBet}` : 'checks';
        else actionLabel = decision.action;
        if (decision.isBluff) actionLabel += ' (bluff!)';

        const newPot = gs.pot + Math.max(0, cur.totalBetThisRound - (gs.players[pIdx].totalBetThisRound));
        const tbotUpdate = isTraining ? {
          tbotActivity: {
            action: decision.action, amount: decision.amount,
            confidence: decision.confidence, reasoning: decision.reasoning,
            isBluff: decision.isBluff, isAllIn, timestamp: Date.now(),
          } as GameStore['tbotActivity'],
        } : {};

        // Track opponent actions for learning rate adaptation
        let sessionOpponentStats = state.sessionOpponentStats;
        if (!isTraining) {
          sessionOpponentStats = {
            totalActions: sessionOpponentStats.totalActions + 1,
            folds: sessionOpponentStats.folds + (decision.action === 'fold' ? 1 : 0),
            calls: sessionOpponentStats.calls + (decision.action === 'call' || decision.action === 'check' ? 1 : 0),
            raises: sessionOpponentStats.raises + (decision.action === 'raise' ? 1 : 0),
          };
        }

        set({
          gameState: {
            ...gs, players, pot: newPot,
            currentBet: wasRaise ? cur.bet : gs.currentBet,
            minRaise: wasRaise ? Math.max(gs.minRaise, cur.bet - gs.currentBet) : gs.minRaise,
            lastRaiseAmount: wasRaise ? (cur.bet - gs.currentBet) : gs.lastRaiseAmount,
            preflopRaised: gs.preflopRaised || (wasRaise && gs.currentPhase === 'preflop'),
            lastAction: `${cur.name} ${actionLabel}`,
          },
          ...tbotUpdate,
          sessionOpponentStats,
        });
      },

      // ── Player act ──
      playerAct: (action, amount) => {
        const state = get();
        if (!state.gameState) return;
        const gs = state.gameState;
        const players = gs.players.map(p => ({ ...p }));
        const hIdx = players.findIndex(p => !p.isBot);
        if (hIdx === -1) return;
        const human = { ...players[hIdx] };
        const prevBet = human.bet;
        let raised = false;

        switch (action) {
          case 'fold':
            human.folded = true;
            break;
          case 'check':
            human.actedThisRound = true;
            players[hIdx] = human;
            set({ gameState: { ...gs, players, lastAction: 'You check' } });
            get().advanceTurn();
            return;
          case 'call': {
            const callAmt = Math.min(Math.round(gs.currentBet - human.bet), human.chips);
            if (callAmt <= 0) {
              human.actedThisRound = true;
              players[hIdx] = human;
              set({ gameState: { ...gs, players, lastAction: 'You check' } });
              get().advanceTurn();
              return;
            }
            human.chips -= callAmt;
            human.bet += callAmt;
            human.totalBetThisRound += callAmt;
            human.totalHandBet += callAmt;
            if (human.chips === 0) human.isAllIn = true;
            break;
          }
          case 'raise': {
            const minTotal = gs.currentBet + Math.max(gs.minRaise, gs.lastRaiseAmount || gs.minRaise);
            const raiseTotal = Math.round(Math.max(amount || minTotal, minTotal));
            const toAdd = Math.min(raiseTotal - human.bet, human.chips);
            if (toAdd <= 0) {
              human.actedThisRound = true;
              players[hIdx] = human;
              set({ gameState: { ...gs, players, lastAction: 'You check' } });
              get().advanceTurn();
              return;
            }
            human.chips -= toAdd;
            human.bet += toAdd;
            human.totalBetThisRound += toAdd;
            human.totalHandBet += toAdd;
            raised = true;
            if (human.chips === 0) human.isAllIn = true;
            break;
          }
        }

        human.actedThisRound = true;
        players[hIdx] = human;

        if (raised) {
          for (let i = 0; i < players.length; i++) {
            if (i !== hIdx && !players[i].folded && players[i].chips > 0) {
              players[i].actedThisRound = false;
            }
          }
        }

        const newPot = gs.pot + Math.max(0, human.totalBetThisRound - (gs.players[hIdx].totalBetThisRound));
        const lastAction = raised
          ? `You raise to $${human.bet}`
          : action === 'fold' ? 'You fold'
          : `You call $${human.bet - prevBet}`;

        set({
          gameState: {
            ...gs, players, pot: newPot,
            currentBet: raised ? human.bet : gs.currentBet,
            minRaise: raised ? Math.max(gs.minRaise, human.bet - gs.currentBet) : gs.minRaise,
            lastRaiseAmount: raised ? (human.bet - gs.currentBet) : gs.lastRaiseAmount,
            preflopRaised: gs.preflopRaised || (raised && gs.currentPhase === 'preflop'),
            lastAction,
          },
        });

        // Track decision vs bot recommendation
        if (human.hand.length > 0 && gs.communityCards.length > 0) {
          const handStrength = evaluateHand(human.hand, gs.communityCards).score;
          const botRec = botDecision(gs, human, state.botSettings);
          const aL = action.toLowerCase();
          const rL = botRec.action.toLowerCase();
          const isCorrect = aL === rL || (aL === 'check' && rL === 'call' && gs.currentBet === human.bet);
          get().recordHumanDecision({
            phase: gs.currentPhase, player: 'You', action: aL,
            actualHandStrength: handStrength, recommendedAction: rL,
            isCorrect, reasoning: isCorrect ? 'Matches bot recommendation' : `Bot recommended ${rL}`,
          });
        }

        get().advanceTurn();
      },

      // ── Advance turn ──
      advanceTurn: () => {
        const state = get();
        if (!state.gameState || state.gameState.gameOver) return;
        const gs = state.gameState;
        const players = gs.players;

        // Players who can still act (not folded, still have chips)
        const canAct = players.filter(p => !p.folded && p.chips > 0);

        // No one can act → determine what to do
        if (canAct.length === 0) {
          // If only one non-folded player: they win immediately (everyone else folded)
          const nonFolded = players.filter(p => !p.folded);
          if (nonFolded.length <= 1) {
            get().resolveHand();
            return;
          }
          // Multiple non-folded but all all-in → deal remaining cards, then showdown
          get().autoDealRemainingCards();
          get().resolveHand();
          return;
        }

        // Only one player can act → check if we need to auto-deal
        if (canAct.length === 1) {
          // Check if everyone has acted with equal bets
          const allActed = canAct.every(p => p.actedThisRound);
          if (allActed) {
            const bets = canAct.map(p => p.totalBetThisRound);
            const allEqual = bets.every(b => b === bets[0]);
            // Also check if there are all-in players who haven't been handled
            const hasAllInPlayers = players.some(p => !p.folded && p.chips === 0);
            if (allEqual && hasAllInPlayers) {
              // No more betting possible — deal remaining cards
              get().autoDealRemainingCards();
              get().resolveHand();
              return;
            }
            if (allEqual) {
              get().advancePhase();
              return;
            }
          }
          // Still need the one player to act — find next
          let nextIdx = (gs.currentPlayerIndex + 1) % players.length;
          let iterations = 0;
          while (iterations < players.length) {
            const c = players[nextIdx];
            if (!c.folded && c.chips > 0 && !c.actedThisRound) {
              set({ gameState: { ...gs, currentPlayerIndex: nextIdx } });
              return;
            }
            nextIdx = (nextIdx + 1) % players.length;
            iterations++;
          }
          // All have acted, advance phase
          get().advancePhase();
          return;
        }

        // Normal flow: 2+ players can act
        // Check if all have acted with equal bets
        const allActed = canAct.every(p => p.actedThisRound);
        if (allActed) {
          const bets = canAct.map(p => p.totalBetThisRound);
          const allEqual = bets.every(b => b === bets[0]);
          if (allEqual) {
            get().advancePhase();
            return;
          }
        }

        // Find next player to act
        let nextIdx = (gs.currentPlayerIndex + 1) % players.length;
        let iterations = 0;
        while (iterations < players.length) {
          const c = players[nextIdx];
          if (!c.folded && c.chips > 0 && !c.actedThisRound) {
            set({ gameState: { ...gs, currentPlayerIndex: nextIdx } });
            return;
          }
          nextIdx = (nextIdx + 1) % players.length;
          iterations++;
        }

        // Fallback: advance phase
        get().advancePhase();
      },

      // ── Advance phase ──
      advancePhase: () => {
        const state = get();
        if (!state.gameState) return;
        const phases: GamePhase[] = ['preflop', 'flop', 'turn', 'river'];
        const currentIdx = phases.indexOf(state.gameState.currentPhase);
        if (currentIdx < phases.length - 1) {
          get().dealCommunityCards(phases[currentIdx + 1]);
        } else {
          get().resolveHand();
        }
      },

      // ── Resolve hand (showdown) ──
      resolveHand: () => {
        const state = get();
        if (!state.gameState) return;
        const gs = state.gameState;
        const activePlayers = gs.players.filter(p => !p.folded && p.hand.length > 0);

        // Safety: ensure all community cards are dealt
        if (gs.communityCards.length < 5 && activePlayers.length > 1) {
          get().autoDealRemainingCards();
          // Re-read state after auto-dealing
          const updatedState = get();
          if (!updatedState.gameState) return;
          return get().resolveHand();
        }

        if (activePlayers.length === 0) {
          set({ gameState: { ...gs, gameOver: true, lastAction: 'Hand ended — all players folded' } });
          return;
        }

        // Single winner (everyone else folded)
        if (activePlayers.length === 1) {
          const winner = activePlayers[0];
          const displayName = winner.id === 'human' ? 'You' : winner.name;
          set({
            gameState: {
              ...gs, gameOver: true,
              winner: { playerId: winner.id, hand: { ...evaluateHand(winner.hand, gs.communityCards), cards: winner.hand } },
              winners: [{ playerId: winner.id, amount: gs.pot }],
              lastAction: `${displayName} win (everyone folded)!`, sidePots: [],
            },
          });
          get().endHand(winner.id, { [winner.id]: gs.pot });
          return;
        }

        // Compute side pots using extracted pure function
        const sidePotResult = calculateSidePots(gs.players, gs.communityCards);
        const { distribution: distributions, winners: allWinners, sidePots, potDescriptions, primaryWinnerId } = sidePotResult;

        // Pick primary winner for display
        const primaryPlayer = gs.players.find(p => p.id === primaryWinnerId)!;
        const primaryDisplay = primaryPlayer.id === 'human' ? 'You' : primaryPlayer.name;
        const primaryEval = evaluateHand(primaryPlayer.hand, gs.communityCards);

        set({
          gameState: {
            ...gs, gameOver: true,
            winner: { playerId: primaryWinnerId, hand: primaryEval },
            winners: allWinners,
            lastAction: `${primaryDisplay} win with ${primaryEval.description}!`,
            sidePots,
          },
        });

        get().endHand(primaryWinnerId, distributions);
      },

      // ── End hand (distribute pots) ──
      endHand: (winnerId: string, potDistribution?: Record<string, number>) => {
        const state = get();
        if (!state.gameState) return;
        const { gameState, stats, currentBankroll, autoPlayMode } = state;
        const dist = potDistribution || { [winnerId]: gameState.pot };

        // Distribute chips
        const players = gameState.players.map(p => ({ ...p }));
        for (const [pid, amt] of Object.entries(dist)) {
          const idx = players.findIndex(pl => pl.id === pid);
          if (idx !== -1 && amt > 0) players[idx].chips += amt;
        }

        // In auto-play mode: T-Bot is playing as human, so track T-Bot stats only.
        // Human stats remain untouched.
        // In manual mode: human is playing, track human stats only.
        // T-Bot stats remain untouched.
        const isAuto = autoPlayMode;

        // Human bankroll tracking (manual mode only)
        const humanPlayer = players.find(p => p.id === 'human');
        const humanHandBet = humanPlayer?.totalHandBet || 0;
        const humanWon = dist['human'] || 0;
        const humanNet = humanWon - humanHandBet;
        const isHumanWinner = humanNet > 0;
        const newBankroll = currentBankroll + (isAuto ? 0 : humanNet);

        // T-Bot bankroll tracking (auto-play mode only)
        const tbot = players.find(p => p.id === 'training-bot');
        const tbotHandBet = tbot?.totalHandBet || 0;
        const tbotWon = dist['training-bot'] || 0;
        const tbotNet = tbotWon - tbotHandBet;
        const isTbotWinner = tbotNet > 0;

        const newTotalHands = isAuto ? stats.totalHands : stats.totalHands + 1;
        const newAvgPot = isAuto
          ? stats.avgPotSize
          : (stats.totalHands === 0
            ? gameState.pot
            : (stats.avgPotSize * stats.totalHands + gameState.pot) / (stats.totalHands + 1));
        const newWinRate = isAuto
          ? stats.winRate
          : ((stats.totalWon + (isHumanWinner ? 1 : 0)) / (stats.totalHands + 1)) * 100;
        const newROI = isAuto
          ? ((currentBankroll - state.startingBankroll) / state.startingBankroll) * 100
          : ((newBankroll - state.startingBankroll) / state.startingBankroll) * 100;

        const newStats: Stats = isAuto
          ? { ...stats }
          : {
              ...stats,
              totalHands: newTotalHands,
              totalWon: stats.totalWon + (isHumanWinner ? 1 : 0),
              totalLost: stats.totalLost + (isHumanWinner ? 0 : 1),
              biggestWin: Math.max(stats.biggestWin, isHumanWinner ? humanNet : 0),
              biggestLoss: Math.min(stats.biggestLoss, isHumanWinner ? 0 : humanNet),
              avgPotSize: newAvgPot,
              botSessions: stats.botSessions + 1,
              botWins: stats.botWins + (isHumanWinner ? 0 : 1),
              botLosses: stats.botLosses + (isHumanWinner ? 1 : 0),
              winRate: newWinRate, roi: newROI,
              bankrollHistory: [...stats.bankrollHistory, newBankroll],
            };

        // T-Bot tracking
        const prevTbot = state.tbotStats;
        const newTbotHands = isAuto ? prevTbot.handsPlayed + 1 : prevTbot.handsPlayed;
        const newTbotStats: TBotStats = isAuto
          ? {
              handsPlayed: newTbotHands,
              handsWon: prevTbot.handsWon + (isTbotWinner ? 1 : 0),
              handsLost: prevTbot.handsLost + (isTbotWinner ? 0 : 1),
              winRate: (prevTbot.handsWon + (isTbotWinner ? 1 : 0)) / newTbotHands * 100,
              totalProfit: prevTbot.totalProfit + tbotNet,
              bankrollHistory: [...prevTbot.bankrollHistory, prevTbot.totalProfit + tbotNet],
            }
          : { ...prevTbot };

        // Determine human position name
        const humanIdx = players.findIndex(p => p.id === 'human');
        const totalPlayers = players.length;
        const posNames = ['SB', 'BB', 'UTG', 'UTG+1', 'MP', 'MP+1', 'CO', 'BTN'];
        let humanPositionName = '';
        if (humanIdx >= 0 && humanIdx < totalPlayers) {
          const dealerIdx = gameState.dealerPosition;
          // Position relative to dealer (0 = SB, 1 = BB, 2 = UTG, etc.)
          let relPos = (humanIdx - dealerIdx + totalPlayers) % totalPlayers;
          if (totalPlayers <= 3) relPos = humanIdx; // simplified for small tables
          if (totalPlayers <= 6) {
            const shortNames = ['SB', 'BB', 'UTG', 'MP', 'CO', 'BTN'];
            humanPositionName = shortNames[relPos] || posNames[relPos] || `P${relPos}`;
          } else {
            humanPositionName = posNames[relPos] || `P${relPos}`;
          }
        }

        // Determine human hand strength category
        let handCategory = 'Unknown';
        let handDesc = '';
        if (humanPlayer && humanPlayer.hand.length === 2) {
          const [c1, c2] = humanPlayer.hand;
          const v1 = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'].indexOf(c1.rank);
          const v2 = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'].indexOf(c2.rank);
          const isPair = v1 === v2;
          const isSuitedHand = c1.suit === c2.suit;
          const high = Math.max(v1, v2);
          const low = Math.min(v1, v2);
          const gap = high - low;
          handDesc = `${c1.rank}${c2.rank}${isPair ? '' : isSuitedHand ? 's' : 'o'}`;
          if (isPair) {
            if (high >= 11) handCategory = 'High Pair (JJ+)';
            else if (high >= 8) handCategory = 'Mid Pair (88-TT)';
            else handCategory = 'Low Pair (22-77)';
          } else if (high >= 12) {
            handCategory = 'Broadway / High Cards';
          } else if (isSuitedHand && gap <= 2) {
            handCategory = 'Suited Connectors';
          } else if (isSuitedHand && gap <= 3) {
            handCategory = 'Suited Gappers';
          } else if (isSuitedHand) {
            handCategory = 'Suited';
          } else if (gap <= 2) {
            handCategory = 'Connectors';
          } else {
            handCategory = 'Other';
          }
        }

        // Update position stats (human only)
        const prevPosStats = stats.positionStats || {};
        const newPosStats = isAuto
          ? prevPosStats
          : (() => {
              const posEntry = prevPosStats[humanPositionName] || { hands: 0, wins: 0, netProfit: 0 };
              return {
                ...prevPosStats,
                [humanPositionName]: {
                  hands: posEntry.hands + 1,
                  wins: posEntry.wins + (isHumanWinner ? 1 : 0),
                  netProfit: posEntry.netProfit + humanNet,
                },
              };
            })();

        // Update hand strength stats (human only)
        const prevHsStats = stats.handStrengthStats || {};
        const newHsStats = isAuto
          ? prevHsStats
          : (() => {
              const hsEntry = prevHsStats[handCategory] || { hands: 0, wins: 0 };
              return {
                ...prevHsStats,
                [handCategory]: {
                  hands: hsEntry.hands + 1,
                  wins: hsEntry.wins + (isHumanWinner ? 1 : 0),
                },
              };
            })();

        // Track bluff from tbotActivity (human only)
        let bluffsThisHand = 0;
        let bluffSuccessThisHand = 0;
        if (!isAuto) {
          const tbotAct = state.tbotActivity;
          if (tbotAct && tbotAct.isBluff) {
            bluffsThisHand = 1;
            if (tbotNet > 0) bluffSuccessThisHand = 1;
          }
        }

        const historyEntry: GameHistoryEntry = {
          handNumber: gameState.handNumber,
          winner: players.find(p => p.id === winnerId)?.name || winnerId,
          winningHand: gameState.winner?.hand.description || '',
          potSize: gameState.pot, duration: 0,
          startTime: Date.now(), endTime: Date.now(),
          botResult: humanNet, bluffs: bluffsThisHand, mistakes: 0,
          numPlayers: gameState.players.length,
          humanPosition: humanPositionName,
          humanHandCategory: handCategory,
          humanHandDescription: handDesc,
        };

        set({
          stats: {
            ...newStats,
            positionStats: newPosStats,
            handStrengthStats: newHsStats,
            bluffAttempts: (stats.bluffAttempts || 0) + bluffsThisHand,
            bluffSuccesses: (stats.bluffSuccesses || 0) + bluffSuccessThisHand,
          },
          tbotStats: newTbotStats,
          gameHistory: [...state.gameHistory, historyEntry],
          currentBankroll: newBankroll,
          gameState: { ...gameState, players },
        });
      },

      // ── Settings & utilities ──
      updateBotSettings: (settings) => set(s => ({ botSettings: { ...s.botSettings, ...settings } })),
      updateTrainingBotSettings: (settings) => set(s => ({ trainingBotSettings: { ...s.trainingBotSettings, ...settings } })),
      updateTrainingBotConfig: (config) => set(s => ({ trainingBotConfig: { ...s.trainingBotConfig, ...config } })),
      setPersonality: (personality) => set({ botSettings: createBotSettings(personality), selectedBotPersonality: personality }),
      setTrainingPersonality: (personality) => set({ trainingBotSettings: createBotSettings(personality) }),
      setOpponentPersonality: (personality) => set({ botSettings: createOpponentSettings(personality), opponentPersonality: personality }),
      setTableSize: (size) => set({ tableSize: size }),
      setBuyIn: (buyIn) => set({ buyIn }),
      setStartingBankroll: (amount) => set({ startingBankroll: amount }),
      toggleRiskOverlay: () => set(s => ({ showRiskOverlay: !s.showRiskOverlay })),
      toggleTableTalk: () => set(s => ({ showTableTalk: !s.showTableTalk })),
      toggleShowCardsAtEnd: () => set(s => ({ showCardsAtEnd: !s.showCardsAtEnd })),
      toggleAutoPlayMode: () => set(s => ({ autoPlayMode: !s.autoPlayMode })),
      toggleAutoRefillChips: () => set(s => ({ autoRefillChips: !s.autoRefillChips })),
      resetStats: () => set({ stats: { ...DEFAULT_STATS }, currentBankroll: get().startingBankroll, gameHistory: [], botEvaluations: [] }),
      nextHand: () => {
        const st = get();
        if (!st.isPlaying) { if (!st.gameState) get().initializeGame(); get().startHand(); }
        else if (st.gameState?.gameOver) { get().startHand(); }
      },
      setAutoPlaySpeed: (speed) => set({ autoPlaySpeed: speed }),
      quitGame: () => set({ isPlaying: false, gameState: null, gamePhase: 'preflop', isDealing: false }),
      addHumanChips: (amount: number) => {
        const st = get();
        if (!st.gameState || amount <= 0) return;
        const players = st.gameState.players.map(p => {
          if (p.isBot) return p;
          return { ...p, chips: p.chips + amount, isAllIn: p.chips === 0 && p.chips + amount > 0 ? false : p.isAllIn };
        });
        set({ gameState: { ...st.gameState, players }, currentBankroll: st.currentBankroll + amount });
      },
      recordHumanDecision: (decision) => {
        const st = get();
        set({ botEvaluations: [...st.botEvaluations, { ...decision, handNumber: st.gameState?.handNumber || 0 }] });
      },
    }),
    {
      name: 'pokerbot-arena-storage',
      partialize: (state) => ({
        stats: { ...state.stats },
        tbotStats: { ...state.tbotStats, bankrollHistory: [...state.tbotStats.bankrollHistory] },
        currentBankroll: state.currentBankroll, startingBankroll: state.startingBankroll,
        gameHistory: [...state.gameHistory], botEvaluations: [...state.botEvaluations],
        selectedBotPersonality: state.selectedBotPersonality,
        tableSize: state.tableSize, buyIn: state.buyIn, blinds: { ...state.blinds },
        autoPlaySpeed: state.autoPlaySpeed,
        isPlaying: state.isPlaying, gameState: state.gameState,
        trainingBotSettings: { ...state.trainingBotSettings },
        botSettings: { ...state.botSettings },
        opponentPersonality: state.opponentPersonality,
        sessionOpponentStats: state.sessionOpponentStats,
      }),
    }
  )
);
