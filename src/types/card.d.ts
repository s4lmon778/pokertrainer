export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export interface Card {
    suit: Suit;
    rank: Rank;
    id: string;
}
export type HandStrength = 'high-card' | 'pair' | 'two-pair' | 'three-of-a-kind' | 'straight' | 'flush' | 'full-house' | 'four-of-a-kind' | 'straight-flush' | 'royal-flush';
export interface HandEvaluation {
    strength: HandStrength;
    score: number;
    cards: Card[];
    description: string;
}
export interface SidePot {
    amount: number;
    eligiblePlayerIds: string[];
}
export interface Player {
    id: string;
    name: string;
    chips: number;
    hand: Card[];
    bet: number;
    folded: boolean;
    isBot: boolean;
    isTrainingBot?: boolean;
    avatar?: string;
    position: number;
    totalBetThisRound: number;
    totalHandBet: number;
    isAllIn: boolean;
    actedThisRound: boolean;
}
export type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export interface GameState {
    players: Player[];
    communityCards: Card[];
    pot: number;
    sidePots: SidePot[];
    currentPhase: GamePhase;
    dealerPosition: number;
    currentPlayerIndex: number;
    currentBet: number;
    minRaise: number;
    lastRaiseAmount: number;
    handNumber: number;
    deck: Card[];
    gameOver: boolean;
    winner?: {
        playerId: string;
        hand: HandEvaluation;
    };
    winners?: {
        playerId: string;
        amount: number;
    }[];
    lastAction?: string;
    sbPosition: number;
    bbPosition: number;
    preflopRaised: boolean;
}
//# sourceMappingURL=card.d.ts.map