import React from 'react';
import { useGameStore } from '../store/gameStore';
import type { Card as CardType } from '../types/card';
import { Trophy } from 'lucide-react';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};
const SUIT_COLORS: Record<string, string> = {
  hearts: '#ef4444', diamonds: '#f97316', clubs: '#1e293b', spades: '#0f172a',
};

interface CardDisplayProps {
  card: CardType;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CardDisplay: React.FC<CardDisplayProps> = ({ card, faceDown = false, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-12 md:w-9 md:h-14 text-[9px] md:text-[10px]',
    md: 'w-10 h-16 md:w-12 md:h-[4.5rem] text-[10px] md:text-xs',
    lg: 'w-14 h-20 md:w-16 md:h-24 text-xs md:text-sm',
  };

  if (faceDown) {
    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-950 rounded-xl border-2 border-indigo-500/40 shadow-lg flex items-center justify-center ${className}`}>
        <div className="w-7 h-7 rounded-full bg-indigo-800/40 flex items-center justify-center border border-indigo-400/20">
          <span className="text-indigo-300/60 text-sm">♠</span>
        </div>
      </div>
    );
  }

  const suitSymbol = SUIT_SYMBOLS[card.suit] || '';
  const suitColor = SUIT_COLORS[card.suit] || '#000';

  return (
    <div className={`${sizeClasses[size]} bg-white rounded-xl border border-gray-200 shadow-lg flex flex-col items-center justify-between p-1 animate-deal ${className} hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-default`}>
      <div className="self-start font-bold leading-none" style={{ color: suitColor }}>{card.rank}<span className="text-[0.55em] ml-0.5">{suitSymbol}</span></div>
      <div className="text-xl leading-none" style={{ color: suitColor }}>{suitSymbol}</div>
      <div className="self-end font-bold rotate-180 leading-none" style={{ color: suitColor }}>{card.rank}<span className="text-[0.55em] ml-0.5">{suitSymbol}</span></div>
    </div>
  );
};

const PokerTable: React.FC = () => {
  const gameState = useGameStore(s => s.gameState);
  const showRiskOverlay = useGameStore(s => s.showRiskOverlay);
  const showCardsAtEnd = useGameStore(s => s.showCardsAtEnd);
  const gamePhase = useGameStore(s => s.gamePhase);

  if (!gameState) return null;

  const getPlayerPosition = (index: number, total: number) => {
    const startAngle = -Math.PI * 0.55;
    const endAngle = Math.PI * 0.55;
    const angle = startAngle + (index / Math.max(total - 1, 1)) * (endAngle - startAngle);
    return {
      x: 50 + 37 * Math.cos(angle - Math.PI / 2),
      y: 50 + 35 * Math.sin(angle - Math.PI / 2),
    };
  };

  const botPlayers = gameState.players.filter(p => p.isBot);
  const humanPlayer = gameState.players.find(p => !p.isBot)!;
  const isActivePlayer = gameState.players[gameState.currentPlayerIndex]?.id === humanPlayer.id;
  const humanIdx = gameState.players.findIndex(p => !p.isBot);
  const winnerPlayer = gameState.gameOver && gameState.winner
    ? gameState.players.find(p => p.id === gameState.winner!.playerId)
    : null;
  const isHumanWinner = winnerPlayer?.id === 'human';

  const getRoleBadge = (playerIdx: number) => {
    if (playerIdx === gameState.dealerPosition) return { label: 'D', color: 'bg-white text-black', ring: 'ring-white/30' };
    if (playerIdx === gameState.sbPosition) return { label: 'SB', color: 'bg-blue-500 text-white', ring: 'ring-blue-400/50' };
    if (playerIdx === gameState.bbPosition) return { label: 'BB', color: 'bg-red-500 text-white', ring: 'ring-red-400/50' };
    return null;
  };

  return (
    <div className="relative w-full mx-auto" style={{ aspectRatio: '16/9', maxHeight: 'min(690px, 55dvh)' }}>
      {/* Table */}
      <div className="absolute inset-0 rounded-[42%] bg-gradient-to-b from-table-dark via-[#0d2a18] to-table-dark border-[8px] border-[#1a3a28] shadow-[0_0_80px_-20px_rgba(0,0,0,0.7)]">
        {/* Felt */}
        <div className="absolute inset-2 rounded-[40%] bg-felt-gradient" />
        {/* Texture */}
        <div className="absolute inset-2 rounded-[40%] bg-table-texture opacity-25" />
        {/* Shine */}
        <div className="absolute inset-2 rounded-[40%] bg-felt-shine" />

        {/* Community cards */}
        <div className="absolute top-[36%] left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {gameState.communityCards.map(card => (
            <CardDisplay key={card.id} card={card} size="md" />
          ))}
          {Array.from({ length: 5 - gameState.communityCards.length }).map((_, i) => (
            <div key={`empty-${i}`} className="w-10 h-16 md:w-12 md:h-[4.5rem] rounded-xl border-2 border-dashed border-white/[0.06] bg-white/[0.02]" />
          ))}
        </div>

        {/* Pot */}
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md rounded-full px-5 py-1.5 z-10 border border-white/10">
          <span className="text-gold font-bold text-sm">Pot: ${gameState.pot}</span>
        </div>

        {/* Phase badge */}
        {showRiskOverlay && (
          <div className="absolute top-[18%] left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md rounded-lg px-3 py-1 z-10 text-center border border-white/10">
            <span className="text-[9px] text-text-secondary/60 uppercase tracking-wider font-semibold">{gamePhase}</span>
          </div>
        )}

        {/* Last action */}
        {gameState.lastAction && (
          <div className="absolute bottom-[28%] left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md rounded-full px-4 py-1 z-10 animate-slide-up border border-white/10">
            <span className="text-text-secondary/70 text-xs font-medium">{gameState.lastAction}</span>
          </div>
        )}

        {/* Winner overlay */}
        {winnerPlayer && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none animate-pop-in">
            {/* Confetti particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-sm pointer-events-none"
                  style={{
                    left: `${5 + Math.random() * 90}%`,
                    top: '-10px',
                    width: `${4 + Math.random() * 8}px`,
                    height: `${6 + Math.random() * 10}px`,
                    backgroundColor: ['#d4af37','#f0d060','#ef4444','#22c55e','#3b82f6','#06b6d4','#eab308','#f97316'][i % 8],
                    animation: `confettiFall ${2 + Math.random() * 2.5}s ease-in ${Math.random() * 1.2}s forwards`,
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                />
              ))}
            </div>
            <div className="bg-black/50 rounded-3xl border border-gold/40 px-8 md:px-10 py-5 md:py-6 text-center space-y-2 md:space-y-3 pointer-events-auto">
              <Trophy size={40} className="text-gold mx-auto" />
              <div>
                <div className="text-2xl font-black text-gold">
                  {isHumanWinner ? 'You Win!' : `${winnerPlayer.name} Wins!`}
                </div>
                <div className="text-sm text-text-secondary font-medium mt-1">
                  {gameState.winner?.hand.description}
                </div>
              </div>
              <div className="text-3xl font-black font-mono text-gold">
                +${gameState.pot}
              </div>
              <div className="text-xs text-text-secondary/50">Pot awarded</div>
            </div>
          </div>
        )}

        {/* Human player — sits on bottom edge */}
        <div className="absolute -bottom-[3%] left-1/2 -translate-x-1/2 flex flex-col items-center z-20 transition-all duration-300">
          {/* Winner glow ring */}
          {isHumanWinner && (
            <div className="absolute -inset-3 rounded-2xl ring-4 ring-gold/50 animate-pulse-glow pointer-events-none" />
          )}
          <div className="flex gap-1 mb-1">
            {humanPlayer.hand.map(card => (<CardDisplay key={card.id} card={card} size="md" />))}
          </div>
          {/* Winner glow ring */}
          {isHumanWinner && (
            <div className="absolute inset-0 rounded-2xl ring-4 ring-gold/50 animate-pulse-glow pointer-events-none" />
          )}
          <div className={`rounded-2xl border-2 p-2.5 min-w-[130px] relative transition-all duration-300 ${
            isActivePlayer ? 'border-gold bg-surface-elevated shadow-[0_4px_20px_-4px_rgba(212,175,55,0.3)]' :
            isHumanWinner ? 'border-gold bg-surface-elevated shadow-[0_0_24px_rgba(212,175,55,0.4)]' :
            humanPlayer.actedThisRound ? 'border-gold/30 bg-surface-elevated' :
            'border-white/10 bg-surface-elevated'
          }`}>
            {isActivePlayer && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gold text-black text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md whitespace-nowrap z-30">
                YOUR TURN
              </div>
            )}
            {humanPlayer.actedThisRound && !humanPlayer.folded && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent-green rounded-full border-2 border-surface-elevated" />
            )}
            {getRoleBadge(humanIdx) && (
              <div className={`absolute -top-2 -left-2 text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-surface-elevated shadow-md ${getRoleBadge(humanIdx)!.color} ${getRoleBadge(humanIdx)!.ring}`}>
                {getRoleBadge(humanIdx)!.label}
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                humanPlayer.folded ? 'bg-gray-600' : 'bg-gold text-black'
              }`}>Y</div>
              <div>
                <span className="font-bold text-sm">You</span>
                <div className="text-gold text-xs font-mono font-semibold">${humanPlayer.chips}</div>
              </div>
            </div>
            {humanPlayer.bet > 0 && (
              <div className="mt-1.5 text-center text-[11px] text-accent-yellow font-mono font-semibold bg-black/20 rounded-full px-2 py-0.5">Bet: ${humanPlayer.bet}</div>
            )}
            {humanPlayer.folded && <div className="mt-1 text-center text-[11px] text-text-secondary/50 font-semibold">Folded</div>}
            {humanPlayer.chips === 0 && !humanPlayer.folded && <div className="mt-1 text-center text-[11px] text-accent-red font-bold">ALL IN</div>}
          </div>
        </div>

        {/* Bot players */}
        {botPlayers.map((player, idx) => {
          const pos = getPlayerPosition(idx, botPlayers.length);
          const isTraining = player.isTrainingBot === true;
          const isCurrent = gameState.players[gameState.currentPlayerIndex]?.id === player.id && !gameState.gameOver;
          const isWinnerBot = gameState.gameOver && gameState.winner?.playerId === player.id;

          return (
            <div key={player.id} className="absolute z-20 transition-all duration-300 flex flex-col items-center gap-0.5" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}>
              {/* Reveal hole cards at end of game */}
              {showCardsAtEnd && gameState.gameOver && (
                <div className="flex gap-0.5 mb-0.5">
                  {player.hand.map(card => (
                    <CardDisplay key={card.id} card={card} size="sm" />
                  ))}
                </div>
              )}
              {/* Winner glow */}
              {isWinnerBot && (
                <div className="absolute -inset-1 rounded-2xl ring-4 ring-gold/50 animate-pulse-glow pointer-events-none" />
              )}
              <div className={`rounded-2xl border-2 p-2 min-w-[95px] relative transition-all duration-300 ${
                player.folded ? 'border-gray-600/40 opacity-40 bg-surface-elevated' :
                isWinnerBot && isTraining ? 'border-accent-cyan bg-surface-elevated' :
                isWinnerBot ? 'border-gold bg-surface-elevated' :
                isCurrent && isTraining ? 'border-accent-cyan bg-surface-elevated' :
                isCurrent ? 'border-gold bg-surface-elevated' :
                player.actedThisRound ? 'border-gold/30 bg-surface-elevated' :
                isTraining ? 'border-accent-cyan/30 bg-surface-elevated' :
                'border-white/10 bg-surface-elevated'
              }`}>
                {isCurrent && (
                  <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md ${
                    isTraining ? 'bg-cyan-500' : 'bg-accent-blue'
                  }`}>
                    {isTraining ? 'T-BOT' : 'THINKING'}
                  </div>
                )}
                {getRoleBadge(player.position) && (
                  <div className={`absolute -top-2 -left-2 text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-surface-elevated shadow-md ${getRoleBadge(player.position)!.color}`}>
                    {getRoleBadge(player.position)!.label}
                  </div>
                )}
                {player.actedThisRound && !player.folded && (
                  <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-surface-elevated ${isTraining ? 'bg-accent-cyan' : 'bg-accent-green'}`} />
                )}
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    player.folded ? 'bg-gray-600' :
                    isTraining ? 'bg-cyan-500 text-white' :
                    'bg-gold text-black'
                  }`}>
                    {player.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs">{player.name}</span>
                      {isTraining && <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold uppercase">TRAIN</span>}
                    </div>
                    <div className={`text-xs font-mono font-semibold ${isTraining ? 'text-cyan-400' : 'text-gold'}`}>${player.chips}</div>
                  </div>
                </div>
                {player.bet > 0 && (
                  <div className="mt-1 bg-black/30 rounded-full text-[9px] text-text-secondary/70 text-center px-2 py-0.5">Bet: ${player.bet}</div>
                )}
                {player.folded && <div className="mt-1 text-[9px] text-text-secondary/30 text-center font-semibold">Folded</div>}
                {player.chips === 0 && !player.folded && <div className="mt-1 text-[9px] text-accent-red text-center font-bold">ALL IN</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PokerTable;
