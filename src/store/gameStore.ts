import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, Player, GamePhase, Card as CardType } from '../types/card';
import { createDeck, shuffleDeck } from '../utils/deck';
import { evaluateHand } from '../utils/handEvaluator';
import { botDecision, type BotSettings, createBotSettings, createOpponentSettings, type BotPersonality } from '../utils/botEngine';

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
  trainingBotSettings: BotSettings;
  opponentPersonality: BotPersonality;
  gameHistory: GameHistoryEntry[];
  stats: Stats;
  currentBankroll: number;
  selectedBotPersonality: BotPersonality;
  tableSize: number;
  buyIn: number;
  blinds: { small: number; big: number };
  showRiskOverlay: boolean;
  showTableTalk: boolean;
  botEvaluations: BotEvaluationEntry[];
  autoPlaySpeed: number;

  initializeGame: () => void;
  startHand: () => void;
  dealCommunityCards: (phase: GamePhase) => void;
  botAct: () => Promise<void>;
  playerAct: (action: 'fold' | 'check' | 'call' | 'raise', amount?: number) => void;
  advancePhase: () => void;
  resolveHand: () => void;
  endHand: (winnerId: string, potDistribution?: Record<string, number>) => void;
  advanceTurn: () => void;
  updateBotSettings: (settings: Partial<BotSettings>) => void;
  updateTrainingBotSettings: (settings: Partial<BotSettings>) => void;
  setPersonality: (personality: BotPersonality) => void;
  setTrainingPersonality: (personality: BotPersonality) => void;
  setOpponentPersonality: (personality: BotPersonality) => void;
  setTableSize: (size: number) => void;
  setBuyIn: (buyIn: number) => void;
  toggleRiskOverlay: () => void;
  toggleTableTalk: () => void;
  resetStats: () => void;
  nextHand: () => void;
  quitGame: () => void;
  setAutoPlaySpeed: (speed: number) => void;
  recordHumanDecision: (decision: Omit<BotEvaluationEntry, 'handNumber'>) => void;
}

const DEFAULT_STATS: Stats = {
  totalHands: 0,
  totalWon: 0,
  totalLost: 0,
  biggestWin: 0,
  biggestLoss: 0,
  avgPotSize: 0,
  botSessions: 0,
  botWins: 0,
  botLosses: 0,
  winRate: 0,
  roi: 0,
  bankrollHistory: [],
  totalBets: 0,
  totalCalls: 0,
  totalFolds: 0,
  avgDecisionTime: 0,
  accuracyByPhase: {
    preflop: { correct: 0, total: 0 },
    flop: { correct: 0, total: 0 },
    turn: { correct: 0, total: 0 },
    river: { correct: 0, total: 0 },
    showdown: { correct: 0, total: 0 },
  },
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gameState: null,
      gamePhase: 'preflop',
      isPlaying: false,
      isDealing: false,
      botSettings: createBotSettings('balanced'),
      trainingBotSettings: createBotSettings('tight-aggressive'),
      opponentPersonality: 'balanced' as BotPersonality,
      gameHistory: [],
      stats: { ...DEFAULT_STATS },
      currentBankroll: 1000,
      selectedBotPersonality: 'balanced',
      tableSize: 6,
      buyIn: 100,
      blinds: { small: 5, big: 10 },
      showRiskOverlay: true,
      showTableTalk: false,
      botEvaluations: [],
      autoPlaySpeed: 800,

      initializeGame: () => {
        const { tableSize, buyIn, blinds } = get();
        const players: Player[] = [];

        // Human player at position 0
        players.push({
          id: 'human',
          name: 'You',
          chips: buyIn,
          hand: [],
          bet: 0,
          folded: false,
          isBot: false,
          position: 0,
          totalBetThisRound: 0,
          actedThisRound: false,
        });

        // Training bot at position 1 (the bot to train/test)
        players.push({
          id: 'training-bot',
          name: 'T-Bot',
          chips: buyIn,
          hand: [],
          bet: 0,
          folded: false,
          isBot: true,
          isTrainingBot: true,
          position: 1,
          totalBetThisRound: 0,
          actedThisRound: false,
        });

        // Regular opponent bots fill remaining positions
        const opponentNames = ['Vortex', 'Phantom', 'Shadow', 'Ace', 'Titan', 'Nova', 'Blitz'];
        for (let i = 2; i < tableSize; i++) {
          players.push({
            id: `bot-${i}`,
            name: opponentNames[(i - 2) % opponentNames.length],
            chips: buyIn,
            hand: [],
            bet: 0,
            folded: false,
            isBot: true,
            isTrainingBot: false,
            position: i,
            totalBetThisRound: 0,
            actedThisRound: false,
          });
        }

        set({
          gameState: {
            players,
            communityCards: [],
            pot: 0,
            sidePots: [],
            currentPhase: 'preflop',
            dealerPosition: 0,
            currentPlayerIndex: 0,
            currentBet: blinds.big,
            minRaise: blinds.big,
            handNumber: 0,
            deck: [],
            gameOver: false,
            sbPosition: 1,
            bbPosition: 2,
          },
          isPlaying: true,
          gamePhase: 'preflop',
        });
      },

      startHand: () => {
        const state = get();
        if (!state.gameState) return;

        // Fresh shuffled deck — use timestamp to ensure different RNG path
        const freshDeck = createDeck();
        const deck = shuffleDeck(freshDeck);
        const { blinds, gameState } = state;

        const players: Player[] = gameState.players.map(p => ({
          ...p,
          hand: [] as CardType[],
          bet: 0,
          folded: false,
          totalBetThisRound: 0,
          actedThisRound: false,
          chips: p.chips,
        }));

        const sbIdx = (gameState.dealerPosition + 1) % players.length;
        const bbIdx = (gameState.dealerPosition + 2) % players.length;

        // Post blinds
        if (players[sbIdx].chips >= blinds.small) {
          players[sbIdx].chips -= blinds.small;
          players[sbIdx].bet = blinds.small;
          players[sbIdx].totalBetThisRound = blinds.small;
        } else {
          players[sbIdx].bet = Math.max(0, players[sbIdx].chips);
          players[sbIdx].chips = 0;
          players[sbIdx].totalBetThisRound = players[sbIdx].bet;
        }
        if (players[bbIdx].chips >= blinds.big) {
          players[bbIdx].chips -= blinds.big;
          players[bbIdx].bet = blinds.big;
          players[bbIdx].totalBetThisRound = blinds.big;
        } else {
          players[bbIdx].bet = Math.max(0, players[bbIdx].chips);
          players[bbIdx].chips = 0;
          players[bbIdx].totalBetThisRound = players[bbIdx].bet;
        }

        // Deal 2 cards to each non-busted player
        for (let i = 0; i < players.length; i++) {
          if (players[i].chips <= 0 && players[i].bet === 0) continue;
          const c1 = deck.pop();
          const c2 = deck.pop();
          if (c1) players[i].hand.push(c1);
          if (c2) players[i].hand.push(c2);
        }

        const totalPot = players[sbIdx].bet + players[bbIdx].bet;
        // Rotate dealer each hand
        const newDealer = (gameState.dealerPosition + 1) % players.length;

        set({
          gameState: {
            ...gameState,
            players,
            communityCards: [],
            pot: totalPot,
            currentPhase: 'preflop',
            dealerPosition: newDealer,
            currentPlayerIndex: (bbIdx + 1) % players.length,
            currentBet: blinds.big,
            minRaise: blinds.big,
            handNumber: gameState.handNumber + 1,
            deck,
            gameOver: false,
            sbPosition: (newDealer + 1) % players.length,
            bbPosition: (newDealer + 2) % players.length,
          },
          gamePhase: 'preflop',
          isDealing: true,
          isPlaying: true,
        });

        setTimeout(() => set({ isDealing: false }), 600);
      },

      dealCommunityCards: (phase: GamePhase) => {
        const state = get();
        if (!state.gameState) return;
        const { deck, communityCards } = state.gameState;
        const cardsToDeal = phase === 'flop' ? 3 : 1;
        const newCommunity = [...communityCards];
        for (let i = 0; i < cardsToDeal; i++) {
          const card = deck.pop();
          if (card) newCommunity.push(card);
        }

        const players = state.gameState.players.map(p => ({
          ...p,
          bet: p.chips === 0 ? p.bet : 0,
          totalBetThisRound: p.chips === 0 ? p.totalBetThisRound : 0,
          actedThisRound: p.chips === 0 ? true : false,
        }));

        set({
          gameState: {
            ...state.gameState,
            players,
            communityCards: newCommunity,
            currentPhase: phase,
            currentPlayerIndex: (state.gameState.dealerPosition + 1) % state.gameState.players.length,
            currentBet: 0,
            minRaise: state.blinds.big,
            lastAction: `${phase.charAt(0).toUpperCase() + phase.slice(1)} dealt`,
          },
          gamePhase: phase,
        });
      },

      botAct: async () => {
        const state = get();
        if (!state.gameState) return;

        const player = state.gameState.players[state.gameState.currentPlayerIndex];
        if (!player || !player.isBot) return;
        if (player.folded || player.chips <= 0) return;

        // Use training bot settings OR opponent bot settings
        const settings = player.isTrainingBot ? state.trainingBotSettings : state.botSettings;
        const decision = botDecision(state.gameState, player, settings);

        const players = state.gameState.players.map(p => ({ ...p }));
        const pIdx = state.gameState.currentPlayerIndex;
        const currentPlayer = { ...players[pIdx] };

        switch (decision.action) {
          case 'fold':
            currentPlayer.folded = true;
            break;
          case 'check':
            break;
          case 'call': {
            const callAmount = Math.min(state.gameState.currentBet - currentPlayer.bet, currentPlayer.chips);
            if (callAmount <= 0) break;
            currentPlayer.chips -= callAmount;
            currentPlayer.bet += callAmount;
            currentPlayer.totalBetThisRound += callAmount;
            break;
          }
          case 'raise': {
            const raiseTotal = decision.amount || state.gameState.currentBet * 2;
            const toAdd = Math.min(raiseTotal - currentPlayer.bet, currentPlayer.chips);
            if (toAdd <= 0) break;
            currentPlayer.chips -= toAdd;
            currentPlayer.bet += toAdd;
            currentPlayer.totalBetThisRound += toAdd;
            break;
          }
        }

        currentPlayer.actedThisRound = true;
        players[pIdx] = currentPlayer;

        const oldTotalBet = state.gameState.players[pIdx].totalBetThisRound;
        const potIncrease = Math.max(0, currentPlayer.totalBetThisRound - oldTotalBet);
        const newPot = state.gameState.pot + potIncrease;

        set({
          gameState: {
            ...state.gameState,
            players,
            pot: newPot,
            currentBet: decision.action === 'raise' ? currentPlayer.bet : state.gameState.currentBet,
            lastAction: `${currentPlayer.name} ${decision.action}${decision.action === 'raise' ? ` to $${currentPlayer.bet}` : ''}${decision.isBluff ? ' (bluff!)' : ''}`,
          },
        });
      },

      playerAct: (action, amount) => {
        const state = get();
        if (!state.gameState) return;
        const players = state.gameState.players.map(p => ({ ...p }));
        const humanIdx = players.findIndex(p => !p.isBot);
        if (humanIdx === -1) return;
        const human = { ...players[humanIdx] };
        const gs = state.gameState;
        let raised = false;

        switch (action) {
          case 'fold':
            human.folded = true;
            break;
          case 'check':
            human.actedThisRound = true;
            players[humanIdx] = human;
            set({ gameState: { ...gs, players, lastAction: 'You check' } });
            return;
          case 'call': {
            const callAmt = Math.min(gs.currentBet - human.bet, human.chips);
            if (callAmt <= 0) {
              human.actedThisRound = true;
              players[humanIdx] = human;
              set({ gameState: { ...gs, players, lastAction: 'You check' } });
              return;
            }
            human.chips -= callAmt;
            human.bet += callAmt;
            human.totalBetThisRound += callAmt;
            break;
          }
          case 'raise': {
            const raiseTotal = amount || Math.min(gs.currentBet * 2, gs.currentBet + human.chips);
            const toAdd = Math.min(raiseTotal - human.bet, human.chips);
            if (toAdd <= 0) {
              human.actedThisRound = true;
              players[humanIdx] = human;
              set({ gameState: { ...gs, players, lastAction: 'You check' } });
              return;
            }
            human.chips -= toAdd;
            human.bet += toAdd;
            human.totalBetThisRound += toAdd;
            raised = true;
            break;
          }
        }

        human.actedThisRound = true;
        players[humanIdx] = human;

        const oldTotalBet = gs.players[humanIdx].totalBetThisRound;
        const potIncrease = human.totalBetThisRound - oldTotalBet;
        const newPot = gs.pot + Math.max(0, potIncrease);

        if (raised) {
          for (let i = 0; i < players.length; i++) {
            if (i !== humanIdx && !players[i].folded && players[i].chips > 0) {
              players[i].actedThisRound = false;
            }
          }
        }

        set({
          gameState: {
            ...gs,
            players,
            pot: newPot,
            currentBet: action === 'raise' ? human.bet : gs.currentBet,
            lastAction: `You ${action}${action === 'raise' && amount ? ` to $${amount}` : ''}`,
          },
        });

        // Track human decision vs bot recommendation
        if (human.hand.length > 0 && gs.communityCards.length > 0) {
          const handStrength = evaluateHand(human.hand, gs.communityCards).score;
          const botRec = botDecision(gs, human, state.botSettings);
          const actionLower = action.toLowerCase();
          const recLower = botRec.action.toLowerCase();
          const isCorrect = actionLower === recLower || (actionLower === 'check' && recLower === 'call' && gs.currentBet === human.bet);
          get().recordHumanDecision({
            phase: gs.currentPhase,
            player: 'You',
            action: actionLower,
            actualHandStrength: handStrength,
            recommendedAction: recLower,
            isCorrect,
            reasoning: isCorrect ? 'Matches bot recommendation' : `Bot recommended ${recLower}`,
          });
        }

        get().advanceTurn();
      },

      advanceTurn: () => {
        const state = get();
        if (!state.gameState || state.gameState.gameOver) return;

        const gs = state.gameState;
        const players = gs.players;

        const nonFoldedWithChips = players.filter(p => !p.folded && p.chips > 0);
        if (nonFoldedWithChips.length <= 1) {
          get().resolveHand();
          return;
        }

        const allActed = players
          .filter(p => !p.folded && p.chips > 0)
          .every(p => p.actedThisRound);

        if (allActed) {
          const bets = players
            .filter(p => !p.folded && p.chips > 0)
            .map(p => p.totalBetThisRound);
          const allEqual = bets.every(b => b === bets[0]);

          if (allEqual) {
            get().advancePhase();
            return;
          }
        }

        let nextIdx = (gs.currentPlayerIndex + 1) % players.length;
        let iterations = 0;
        while (iterations < players.length) {
          const candidate = players[nextIdx];
          if (!candidate.folded && candidate.chips > 0 && !candidate.actedThisRound) {
            set({ gameState: { ...gs, currentPlayerIndex: nextIdx } });
            return;
          }
          nextIdx = (nextIdx + 1) % players.length;
          iterations++;
        }

        get().advancePhase();
      },

      advancePhase: () => {
        const state = get();
        if (!state.gameState) return;

        const phases: GamePhase[] = ['preflop', 'flop', 'turn', 'river'];
        const currentIdx = phases.indexOf(state.gameState.currentPhase);

        if (currentIdx < phases.length - 1) {
          const nextPhase = phases[currentIdx + 1];
          get().dealCommunityCards(nextPhase);
        } else {
          get().resolveHand();
        }
      },

      resolveHand: () => {
        const state = get();
        if (!state.gameState) return;

        const gs = state.gameState;
        const activePlayers = gs.players.filter(p => !p.folded);
        if (activePlayers.length === 0) return;

        if (activePlayers.length === 1) {
          const winner = activePlayers[0];
          set({
            gameState: {
              ...gs,
              gameOver: true,
              lastAction: `${winner.name} wins (everyone folded)!`,
            },
          });
          get().endHand(winner.id);
          return;
        }

        const playerEvals: { player: (typeof activePlayers)[0]; score: number; description: string }[] = [];
        for (const player of activePlayers) {
          const handEval = evaluateHand(player.hand, gs.communityCards);
          playerEvals.push({ player, score: handEval.score, description: handEval.description });
        }

        playerEvals.sort((a, b) => b.score - a.score);
        const bestScore = playerEvals[0].score;
        const winners = playerEvals.filter(e => e.score === bestScore);

        const winner = winners[0];
        const winnerName = winner.player.id === 'human' ? 'You' : winner.player.name;
        const description = winner.description;

        set({
          gameState: {
            ...gs,
            gameOver: true,
            winner: {
              playerId: winner.player.id,
              hand: {
                ...evaluateHand(winner.player.hand, gs.communityCards),
                cards: winner.player.hand,
              },
            },
            lastAction: `${winnerName} wins with ${description}!`,
            sidePots: [],
          },
        });

        get().endHand(winner.player.id);
      },

      endHand: (winnerId: string) => {
        const state = get();
        if (!state.gameState) return;

        const { gameState, stats, currentBankroll } = state;
        const pot = gameState.pot;
        const isHumanWinner = winnerId === 'human';
        const humanPlayer = gameState.players.find(p => p.id === 'human');
        const humanBetThisHand = humanPlayer?.totalBetThisRound || 0;

        const players = gameState.players.map(p => ({ ...p }));
        const winnerIdx = players.findIndex(p => p.id === winnerId);
        if (winnerIdx !== -1) {
          players[winnerIdx].chips += pot;
        }

        const newBankroll = isHumanWinner
          ? currentBankroll + pot - humanBetThisHand
          : currentBankroll - humanBetThisHand;

        const newTotalHands = stats.totalHands + 1;
        const newAvgPot = stats.totalHands === 0
          ? pot
          : (stats.avgPotSize * stats.totalHands + pot) / newTotalHands;
        const newWinRate = ((stats.totalWon + (isHumanWinner ? 1 : 0)) / newTotalHands) * 100;
        const newROI = ((newBankroll - 1000) / 1000) * 100;

        const newStats: Stats = {
          ...stats,
          totalHands: newTotalHands,
          totalWon: stats.totalWon + (isHumanWinner ? 1 : 0),
          totalLost: stats.totalLost + (isHumanWinner ? 0 : 1),
          biggestWin: Math.max(stats.biggestWin, isHumanWinner ? pot - humanBetThisHand : 0),
          biggestLoss: Math.min(stats.biggestLoss, isHumanWinner ? 0 : humanBetThisHand - pot),
          avgPotSize: newAvgPot,
          botSessions: stats.botSessions + 1,
          botWins: stats.botWins + (isHumanWinner ? 0 : 1),
          botLosses: stats.botLosses + (isHumanWinner ? 1 : 0),
          winRate: newWinRate,
          roi: newROI,
          bankrollHistory: [...stats.bankrollHistory, newBankroll],
        };

        const historyEntry: GameHistoryEntry = {
          handNumber: gameState.handNumber,
          winner: players.find(p => p.id === winnerId)?.name || winnerId,
          winningHand: gameState.winner?.hand.description || '',
          potSize: pot,
          duration: 0,
          startTime: Date.now(),
          endTime: Date.now(),
          botResult: isHumanWinner ? (pot - humanBetThisHand) : humanBetThisHand - pot,
          bluffs: 0,
          mistakes: 0,
          numPlayers: gameState.players.length,
        };

        set({
          stats: newStats,
          gameHistory: [...state.gameHistory, historyEntry],
          currentBankroll: newBankroll,
          gameState: { ...gameState, players },
        });
      },

      updateBotSettings: (settings) => {
        set(state => ({
          botSettings: { ...state.botSettings, ...settings },
        }));
      },

      updateTrainingBotSettings: (settings) => {
        set(state => ({
          trainingBotSettings: { ...state.trainingBotSettings, ...settings },
        }));
      },

      setPersonality: (personality) => {
        const settings = createBotSettings(personality);
        set({ botSettings: settings, selectedBotPersonality: personality });
      },

      setTrainingPersonality: (personality) => {
        const settings = createBotSettings(personality);
        set({ trainingBotSettings: settings });
      },

      setOpponentPersonality: (personality) => {
        const settings = createOpponentSettings(personality);
        set({ botSettings: settings, opponentPersonality: personality });
      },

      setTableSize: (size) => set({ tableSize: size }),
      setBuyIn: (buyIn) => set({ buyIn }),

      toggleRiskOverlay: () => {
        set(state => ({ showRiskOverlay: !state.showRiskOverlay }));
      },

      toggleTableTalk: () => {
        set(state => ({ showTableTalk: !state.showTableTalk }));
      },

      resetStats: () => {
        set({
          stats: { ...DEFAULT_STATS },
          currentBankroll: 1000,
          gameHistory: [],
          botEvaluations: [],
        });
      },

      nextHand: () => {
        const state = get();
        if (!state.isPlaying) {
          if (!state.gameState) get().initializeGame();
          get().startHand();
        } else if (state.gameState?.gameOver) {
          get().startHand();
        }
      },

      setAutoPlaySpeed: (speed) => set({ autoPlaySpeed: speed }),

      quitGame: () => {
        set({
          isPlaying: false,
          gameState: null,
          gamePhase: 'preflop',
          isDealing: false,
        });
      },

      recordHumanDecision: (decision) => {
        const state = get();
        const entry: BotEvaluationEntry = {
          ...decision,
          handNumber: state.gameState?.handNumber || 0,
        };
        set({ botEvaluations: [...state.botEvaluations, entry] });
      },
    }),
    {
      name: 'pokerbot-arena-storage',
      partialize: (state) => ({
        stats: { ...state.stats },
        currentBankroll: state.currentBankroll,
        gameHistory: [...state.gameHistory],
        botEvaluations: [...state.botEvaluations],
        selectedBotPersonality: state.selectedBotPersonality,
        tableSize: state.tableSize,
        buyIn: state.buyIn,
        blinds: { ...state.blinds },
        autoPlaySpeed: state.autoPlaySpeed,
        trainingBotSettings: { ...state.trainingBotSettings },
        botSettings: { ...state.botSettings },
        opponentPersonality: state.opponentPersonality,
      }),
    }
  )
);
