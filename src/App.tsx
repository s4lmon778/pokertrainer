import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import PokerTable from './components/PokerTable';
import PlayerControls from './components/PlayerControls';
import RiskOverlay from './components/RiskOverlay';
import SettingsPanel from './components/SettingsPanel';
import Card from './components/Card';
import CoachTips from './components/CoachTips';
import ErrorBoundary from './components/ErrorBoundary';
import { useGameStore } from './store/gameStore';
import { Play, BarChart3, Settings, BookOpen, Info, Trophy, Brain, Zap, Users, Sparkles, LogOut, Crown, Coins, Keyboard, XCircle, Loader2 } from 'lucide-react';

// Code-split heavy components
const StatsDashboard = lazy(() => import('./components/StatsDashboard'));

/** Loading fallback for lazy components */
const LazyFallback: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex flex-col items-center gap-3">
      <Loader2 size={32} className="text-gold animate-spin" />
      <p className="text-sm text-text-secondary/50">Loading...</p>
    </div>
  </div>
);

type Tab = 'play' | 'stats' | 'rules' | 'about' | 'settings';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('play');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const isPlaying = useGameStore(s => s.isPlaying);
  const initializeGame = useGameStore(s => s.initializeGame);
  const startHand = useGameStore(s => s.startHand);
  const botAct = useGameStore(s => s.botAct);
  const advanceTurn = useGameStore(s => s.advanceTurn);
  const gameState = useGameStore(s => s.gameState);
  const autoPlaySpeed = useGameStore(s => s.autoPlaySpeed);
  const blinds = useGameStore(s => s.blinds);
  const currentBankroll = useGameStore(s => s.currentBankroll);
  const startingBankroll = useGameStore(s => s.startingBankroll);
  const autoPlayMode = useGameStore(s => s.autoPlayMode);
  const toggleAutoPlayMode = useGameStore(s => s.toggleAutoPlayMode);
  const tbotActivity = useGameStore(s => s.tbotActivity);
  const quitGame = useGameStore(s => s.quitGame);
  const addHumanChips = useGameStore(s => s.addHumanChips);

  const [rebuyAmount, setRebuyAmount] = useState<number | ''>(100);
  const handleRebuy = () => {
    const amt = rebuyAmount === '' ? 0 : rebuyAmount;
    if (amt > 0) {
      addHumanChips(amt);
    }
  };

  // Track pending bot action per player index to prevent duplicate scheduling
  const pendingRef = React.useRef<{
    playerIdx: number;
    actionTimer: ReturnType<typeof setTimeout> | null;
    safetyTimer: ReturnType<typeof setTimeout> | null;
  }>({ playerIdx: -1, actionTimer: null, safetyTimer: null });
  const stuckDetectorRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPlayerIdxRef = React.useRef<number>(-1);
  const stuckSinceRef = React.useRef<number>(0);

  const clearPending = () => {
    const p = pendingRef.current;
    if (p.actionTimer) { clearTimeout(p.actionTimer); p.actionTimer = null; }
    if (p.safetyTimer) { clearTimeout(p.safetyTimer); p.safetyTimer = null; }
    p.playerIdx = -1;
  };

  // Main bot action loop
  useEffect(() => {
    if (!isPlaying || !gameState || gameState.gameOver) {
      clearPending();
      return;
    }
    const currentIdx = gameState.currentPlayerIndex;
    const currentPlayer = gameState.players[currentIdx];
    if (!currentPlayer) { clearPending(); return; }

    // Track player changes for stuck detection
    if (currentIdx !== lastPlayerIdxRef.current) {
      lastPlayerIdxRef.current = currentIdx;
      stuckSinceRef.current = Date.now();
    }

    // Human turn — wait for input unless autoPlayMode is on
    if (currentPlayer.isBot === false && !autoPlayMode) {
      clearPending();
      return;
    }

    // Skip folded or busted players — advance turn immediately (sync)
    if (currentPlayer.folded || currentPlayer.chips <= 0) {
      if (pendingRef.current.playerIdx !== currentIdx) {
        clearPending();
        pendingRef.current.playerIdx = currentIdx;
        // Use 0ms timeout for near-sync advance, prevents timer/cleanup races
        const skipTimer = setTimeout(() => {
          try { advanceTurn(); } catch (e) { }
          pendingRef.current.playerIdx = -1;
        }, 0);
        pendingRef.current.actionTimer = skipTimer;
        return () => { clearTimeout(skipTimer); pendingRef.current.playerIdx = -1; };
      }
      return;
    }

    // Guard: already acted or already scheduled for this player
    if (currentPlayer.actedThisRound || pendingRef.current.playerIdx === currentIdx) {
      return;
    }

    // Schedule bot action for this player
    clearPending();
    pendingRef.current.playerIdx = currentIdx;

    // Safety: force-advance if stuck for 6 seconds
    const safety = setTimeout(() => {
      console.warn('bot safety timeout — forcing advance for player', currentIdx);
      try { advanceTurn(); } catch (e) { }
      clearPending();
    }, 6000);
    pendingRef.current.safetyTimer = safety;

    const action = setTimeout(async () => {
      try { await botAct(); advanceTurn(); }
      catch (e) { advanceTurn(); }
      finally { clearPending(); }
    }, autoPlaySpeed);
    pendingRef.current.actionTimer = action;

    return () => {
      clearTimeout(action);
      clearTimeout(safety);
      pendingRef.current.playerIdx = -1;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameState?.currentPlayerIndex, gameState?.gameOver, botAct, advanceTurn, autoPlaySpeed, autoPlayMode]);

  // Stuck detector: if currentPlayerIndex unchanged for > 6s, force recovery
  useEffect(() => {
    if (!isPlaying || gameState?.gameOver) return;
    if (stuckDetectorRef.current) return;

    let lastKnownIdx = gameState?.currentPlayerIndex;

    stuckDetectorRef.current = setInterval(() => {
      const gs = useGameStore.getState().gameState;
      if (!gs || gs.gameOver) {
        if (stuckDetectorRef.current) { clearInterval(stuckDetectorRef.current); stuckDetectorRef.current = null; }
        return;
      }
      const currentIdx = gs.currentPlayerIndex;

      // Player index changed — reset tracker
      if (currentIdx !== lastKnownIdx) {
        lastKnownIdx = currentIdx;
        stuckSinceRef.current = Date.now();
        return;
      }

      // Human turn in manual mode — not stuck, just waiting for input
      const p = gs.players[currentIdx];
      if (p && p.isBot === false && !useGameStore.getState().autoPlayMode) {
        stuckSinceRef.current = Date.now();
        return;
      }

      const stuckMs = Date.now() - stuckSinceRef.current;
      if (stuckMs > 6000) {
        console.warn('stuck detector: player', currentIdx, 'stuck for', stuckMs, 'ms — forcing recovery. chips:', p?.chips, 'folded:', p?.folded, 'acted:', p?.actedThisRound);
        stuckSinceRef.current = Date.now();
        const store = useGameStore.getState();
        const idxBefore = store.gameState?.currentPlayerIndex;
        try { store.advanceTurn(); } catch (e) { }
        const newGs = useGameStore.getState().gameState;
        if (newGs && newGs.currentPlayerIndex === idxBefore && !newGs.gameOver) {
          console.warn('stuck detector: advanceTurn had no effect, forcing resolveHand');
          try {
            const s = useGameStore.getState();
            if (s.gameState) { s.resolveHand(); }
          } catch (e) { }
        }
        lastKnownIdx = useGameStore.getState().gameState?.currentPlayerIndex;
      }
    }, 2000);

    return () => {
      if (stuckDetectorRef.current) { clearInterval(stuckDetectorRef.current); stuckDetectorRef.current = null; }
    };
  }, [isPlaying, gameState?.gameOver]);

  const handleStartGame = useCallback(() => {
    initializeGame();
    setTimeout(() => startHand(), 500);
  }, [initializeGame, startHand]);

  const handleNextHand = useCallback(() => startHand(), [startHand]);

  // Auto-advance to next hand in auto-play mode when game is over
  useEffect(() => {
    if (!autoPlayMode || !gameState?.gameOver || !isPlaying) return;
    const timer = setTimeout(() => startHand(), 2000);
    return () => clearTimeout(timer);
  }, [autoPlayMode, gameState?.gameOver, isPlaying, startHand]);

  const goToTab = useCallback((tab: Tab) => setActiveTab(tab), []);

  const tabs = [
    { id: 'play' as Tab, icon: Play, label: 'Play' },
    { id: 'stats' as Tab, icon: BarChart3, label: 'Stats' },
    { id: 'rules' as Tab, icon: BookOpen, label: 'Rules' },
    { id: 'about' as Tab, icon: Info, label: 'About' },
    { id: 'settings' as Tab, icon: Settings, label: 'Settings' },
  ];

  const showGame = activeTab === 'play' && isPlaying && gameState;

  return (
    <div className="min-h-screen bg-surface text-text-primary flex flex-col">
      {/* Skip navigation link */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-gold focus:text-black focus:rounded-lg focus:font-bold focus:text-sm">
        Skip to main content
      </a>

      {/* Header */}
      <header className="border-b border-white/5 bg-surface/95 backdrop-blur-xl sticky top-0 z-50" role="banner">
        <div className="max-w-[1600px] mx-auto px-2 sm:px-3 py-1.5 sm:py-2">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2.5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-300 via-gold to-amber-500 rounded-full flex items-center justify-center shadow-md">
                <Crown size={16} className="text-black sm:block hidden" strokeWidth={2} />
                <Crown size={14} className="text-black sm:hidden" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight">
                  <span className="text-gold">Poker</span>
                  <span className="text-text-secondary font-bold">Trainer</span>
                </h1>
                <p className="text-[8px] sm:text-[10px] text-text-secondary/40 font-medium tracking-wide hidden xs:block">PRACTICE & TRAIN YOUR BOT</p>
              </div>
            </div>

            {isPlaying && (
              <button onClick={quitGame}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary/60 hover:text-accent-red hover:bg-accent-red/10 border border-transparent hover:border-accent-red/20 transition-all"
                aria-label="Quit game">
                <LogOut size={12} aria-hidden="true" /> Quit
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-0.5 bg-white/5 rounded-xl p-0.5 sm:p-1 border border-white/5 overflow-x-auto scrollbar-none" role="tablist" aria-label="Main navigation">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                role="tab" aria-selected={activeTab === tab.id}
                aria-label={`${tab.label} tab`}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gold text-black shadow-md'
                    : 'text-text-secondary/70 hover:text-text-primary hover:bg-white/5'
                }`}>
                <tab.icon size={12} className="sm:w-[14px] sm:h-[14px]" aria-hidden="true" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main id="main-content" className="flex-1 max-w-[1600px] mx-auto px-2 py-2 w-full" role="main" aria-label="Main content">
        {/* Game Status Bar */}
        {showGame && (
          <div className="glass px-3 sm:px-5 py-2 sm:py-2.5 mb-2 sm:mb-3 flex items-center justify-between flex-wrap gap-2 sm:gap-3 animate-fade-in" role="region" aria-label="Game status" aria-live="polite">
            <div className="flex items-center gap-2 sm:gap-5 text-xs sm:text-sm flex-wrap">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-text-secondary/60 text-[10px] sm:text-xs uppercase tracking-wider font-semibold hidden sm:inline">Hand</span>
                <span className="text-text-primary font-mono font-bold text-sm sm:text-base">#{gameState!.handNumber}</span>
              </div>
              <div className="w-px h-3 sm:h-4 bg-white/10" />
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-text-secondary/60 text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Blinds</span>
                <span className="text-text-primary font-mono font-bold text-xs sm:text-sm">${blinds.small}/${blinds.big}</span>
              </div>
              <div className="w-px h-3 sm:h-4 bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-text-secondary/60 text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Phase</span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-gold/20 text-gold font-bold text-[10px] sm:text-xs uppercase tracking-wider border border-gold/30">{gameState!.currentPhase}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
              <button
                onClick={toggleAutoPlayMode}
                aria-label={autoPlayMode ? 'Disable auto-play mode' : 'Enable auto-play mode'}
                className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold transition-all ${
                  autoPlayMode ? 'bg-cyan-500 text-white' : 'bg-white/10 text-text-secondary/50 hover:text-text-primary'
                }`}
              >
                <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${autoPlayMode ? 'bg-white animate-pulse' : 'bg-text-secondary/30'}`} aria-hidden="true" />
                AUTO
              </button>
              <button
                onClick={() => setShowShortcuts(true)}
                aria-label="Keyboard shortcuts"
                className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold bg-white/10 text-text-secondary/50 hover:text-text-primary transition-all"
              >
                <Keyboard size={12} />
                <span className="hidden sm:inline">KEYS</span>
              </button>
              <div className="flex items-center gap-1">
                <span className="text-[9px] sm:text-[10px] text-text-secondary/60 font-semibold whitespace-nowrap">Rebuy:</span>
                <input
                  type="number"
                  min={1} max={10000}
                  value={rebuyAmount}
                  onChange={e => { const v = e.target.value; setRebuyAmount(v === '' ? '' : Math.max(1, parseInt(v) || 1)); }}
                  className="w-12 sm:w-16 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] sm:text-xs text-center font-mono focus:outline-none focus:border-gold/50 transition-colors"
                />
                <button
                  onClick={handleRebuy}
                  aria-label={`Add $${rebuyAmount === '' ? 0 : rebuyAmount} in chips`}
                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-gold/20 border border-gold/30 text-gold text-[9px] sm:text-[10px] font-bold hover:bg-gold/30 transition-all active:scale-95"
                >
                  +$
                </button>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Coins size={12} className="text-gold sm:w-[14px] sm:h-[14px]" />
                <span className="text-text-secondary/60 text-[9px] sm:text-xs uppercase tracking-wider font-semibold hidden sm:inline">Bankroll</span>
                <span className={`font-mono font-bold text-sm sm:text-base ${currentBankroll >= startingBankroll ? 'text-accent-green' : 'text-accent-red'}`}>${currentBankroll}</span>
                <span className="text-[9px] sm:text-[10px] text-text-secondary/40 hidden sm:inline">
                  ({currentBankroll >= startingBankroll ? '+' : ''}{currentBankroll - startingBankroll})
                </span>
              </div>
              {gameState!.gameOver && (
                <button onClick={handleNextHand} aria-label="Deal next hand" className="btn-primary text-[10px] sm:text-xs px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-1.5">
                  <Play size={12} aria-hidden="true" /> Next Hand
                </button>
              )}
            </div>
          </div>
        )}

        {/* T-Bot decision status */}
        {showGame && tbotActivity && (
          <div role="status" aria-live="polite" className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 mb-1 sm:mb-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] sm:text-xs animate-fade-in overflow-x-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shrink-0" />
            <span className="text-cyan-400 font-bold shrink-0">T-Bot</span>
            <span className={`px-1 sm:px-1.5 py-0.5 rounded font-black text-[8px] sm:text-[10px] uppercase tracking-wider shrink-0 ${
              tbotActivity.action === 'raise' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              tbotActivity.action === 'fold' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              tbotActivity.action === 'call' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
              tbotActivity.action === 'check' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              'bg-white/10 text-text-secondary/70 border border-white/10'
            }`}>
              {tbotActivity.isAllIn ? 'ALL IN' : tbotActivity.action}
              {tbotActivity.action === 'raise' && tbotActivity.amount && !tbotActivity.isAllIn ? ` $${tbotActivity.amount}` : ''}
            </span>
            <span className="text-text-secondary/70 truncate max-w-[120px] sm:max-w-none">{tbotActivity.reasoning}</span>
            {tbotActivity.isBluff && (
              <span className="text-accent-yellow font-bold text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-accent-yellow/10 border border-accent-yellow/20 shrink-0">BLUFF</span>
            )}
            <span className="text-text-secondary/30 text-[9px] sm:text-[10px] ml-auto shrink-0 hidden sm:inline">conf: {(tbotActivity.confidence * 100).toFixed(0)}%</span>
          </div>
        )}

        {/* Landing page */}
        {activeTab === 'play' && !isPlaying && !gameState && (
          <section role="region" aria-label="Welcome">
            <LandingPage onStart={handleStartGame} goToTab={goToTab} />
          </section>
        )}

        {/* Game view — sidebar layout */}
        {showGame && (
          <div className="flex flex-col xl:flex-row gap-1.5">
            <div className="flex-1 min-w-0 space-y-1">
              <PokerTable />
              <PlayerControls />
            </div>
            <div className="w-full xl:w-64 shrink-0 hidden md:block">
              <RiskOverlay />
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <section role="region" aria-label="Statistics dashboard">
            <ErrorBoundary>
              <Suspense fallback={<LazyFallback />}>
                <StatsDashboard />
              </Suspense>
            </ErrorBoundary>
          </section>
        )}
        {activeTab === 'rules' && <section role="region" aria-label="Poker rules and hand rankings"><RulesPage /></section>}
        {activeTab === 'about' && <section role="region" aria-label="About PokerTrainer"><AboutPage /></section>}
        {activeTab === 'settings' && (
          <section role="region" aria-label="Game settings">
            <ErrorBoundary>
              <SettingsPanel />
            </ErrorBoundary>
          </section>
        )}
      </main>

      {/* Screen-reader-only live region for game announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {showGame && gameState && (
          <span>
            Hand {gameState.handNumber}, {gameState.currentPhase}.
            {gameState.lastAction && ` Last action: ${gameState.lastAction}.`}
            {gameState.gameOver && ' Hand complete.'}
          </span>
        )}
      </div>

      <footer className="border-t border-white/5 py-3 text-center" role="contentinfo">
        <p className="text-[10px] text-text-secondary/30 font-medium tracking-wide">POKERTRAINER — EDUCATIONAL SIMULATION. NO REAL MONEY.</p>
      </footer>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowShortcuts(false)} />
          <div className="relative bg-surface-elevated border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-pop-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Keyboard size={18} className="text-gold" />
                <h3 className="font-black text-lg">Keyboard Shortcuts</h3>
              </div>
              <button onClick={() => setShowShortcuts(false)} className="text-text-secondary/50 hover:text-text-primary transition-colors" aria-label="Close shortcuts">
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { key: 'F', action: 'Fold', desc: 'Forfeit your hand', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                { key: 'C', action: 'Call', desc: 'Match the current bet', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                { key: 'X', action: 'Check', desc: 'Pass without betting (when no bet to call)', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
                { key: 'R', action: 'Raise', desc: 'Increase the bet (uses 2x call amount)', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                { key: 'A', action: 'All-In', desc: 'Bet all your remaining chips', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
                { key: 'Esc', action: 'Cancel / Deselect', desc: 'Clear focus from any active control', color: 'bg-white/10 text-text-secondary/70 border-white/20' },
              ].map(({ key, action, desc, color }) => (
                <div key={key} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all">
                  <kbd className={`px-2.5 py-1.5 rounded-lg text-sm font-black font-mono border min-w-[2.5rem] text-center ${color}`}>
                    {key}
                  </kbd>
                  <div>
                    <div className="font-bold text-sm text-text-primary">{action}</div>
                    <div className="text-[11px] text-text-secondary/50">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-text-secondary/30 mt-4 text-center">
              Shortcuts only work when it's your turn and no input is focused.
            </p>
          </div>
        </div>
      )}

      {/* Coach Tips Toast */}
      <CoachTips />
    </div>
  );
};

// --- Landing Page ---

const LandingPage: React.FC<{ onStart: () => void; goToTab: (tab: Tab) => void }> = React.memo(({ onStart, goToTab }) => (
  <div className="flex flex-col items-center justify-center py-10 md:py-14 space-y-10 animate-fade-in">
    {/* Hero */}
    <div className="text-center max-w-lg space-y-5">
      <div className="w-24 h-24 mx-auto bg-gradient-to-br from-amber-300 via-gold to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-float">
        <Crown size={44} className="text-black" strokeWidth={1.5} />
      </div>
      <h2 className="text-4xl md:text-5xl font-black tracking-tight">
        <span className="text-gold">Poker</span>
        <span className="text-text-primary">Trainer</span>
      </h2>
      <p className="text-text-secondary/70 text-sm md:text-base max-w-sm mx-auto leading-relaxed">
        Practice Texas Hold'em against AI opponents. Train your custom bot, track stats, sharpen your game.
      </p>
      <button onClick={onStart} className="btn-primary inline-flex items-center gap-2 px-10 py-3.5 rounded-2xl text-base font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.97]">
        <Play size={20} /> Start Playing
      </button>
    </div>

    {/* Feature cards — clickable */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
      {[
        { icon: Users, title: 'Multi-Player', desc: 'Set table size, buy-in, and opponent bots', color: 'gold', tab: 'settings' as Tab },
        { icon: Brain, title: 'Train Your Bot', desc: 'Configure your AI bot — aggression, bluffing, accuracy', color: 'cyan', tab: 'settings' as Tab },
        { icon: BarChart3, title: 'Track Progress', desc: 'Bankroll history, win rates, and decision analysis', color: 'green', tab: 'stats' as Tab },
      ].map((f, i) => (
        <Card
          key={i}
          variant="premium"
          onClick={() => goToTab(f.tab)}
          className="text-center space-y-3 group w-full"
        >
          <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${
            f.color === 'gold' ? 'bg-gold/10' :
            f.color === 'cyan' ? 'bg-accent-cyan/10' :
            'bg-accent-green/10'
          }`}>
            <f.icon size={22} className={f.color === 'gold' ? 'text-gold' : f.color === 'cyan' ? 'text-accent-cyan' : 'text-accent-green'} />
          </div>
          <h3 className="font-bold text-sm">{f.title}</h3>
          <p className="text-xs text-text-secondary/60 leading-relaxed">{f.desc}</p>
        </Card>
      ))}
    </div>

    {/* Tips */}
    <div className="card-premium w-full max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={16} className="text-gold" />
        <span className="text-sm font-bold">Quick Tips</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {[
          ['1.', 'Configure your <strong>training bot</strong> and opponent bots in Settings first'],
          ['2.', 'Keys: <kbd>F</kbd>old <kbd>C</kbd>all <kbd>X</kbd>heck <kbd>R</kbd>aise <kbd>A</kbd>ll-In'],
          ['3.', 'Watch the stats sidebar for real-time win probability and expected value'],
          ['4.', 'Review stats after each session to see your bot\'s performance'],
        ].map(([num, text], i) => (
          <div key={i} className="flex items-start gap-2 text-text-secondary/60">
            <span className="text-gold font-bold shrink-0">{num}</span>
            <span dangerouslySetInnerHTML={{ __html: text.replace(/<kbd>(.*?)<\/kbd>/g, '<kbd class="px-1.5 py-0.5 bg-white/10 rounded-md text-[10px] font-mono font-semibold text-text-primary/80">$1</kbd>') }} />
          </div>
        ))}
      </div>
    </div>
  </div>
));

LandingPage.displayName = 'LandingPage';

// --- Rules Page ---

const suitColors: Record<string, string> = {
  '♠': '#0f172a',
  '♥': '#ef4444',
  '♦': '#f97316',
  '♣': '#1e293b',
};

const colorizeSuits = (text: string) => {
  const parts = text.split(/([♠♥♦♣])/);
  return parts.map((part, i) => {
    const color = suitColors[part];
    if (color) {
      return <span key={i} style={{ color, fontWeight: 'bold' }}>{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
};

const RulesPage: React.FC = React.memo(() => {
  const handRankings = [
    { rank: 1, name: 'Royal Flush', desc: 'A, K, Q, J, 10, all same suit', example: 'A♠ K♠ Q♠ J♠ 10♠', pct: '0.000154%', color: 'from-yellow-400 to-yellow-600' },
    { rank: 2, name: 'Straight Flush', desc: 'Five consecutive, same suit', example: '9♥ 8♥ 7♥ 6♥ 5♥', pct: '0.00139%', color: 'from-orange-400 to-orange-600' },
    { rank: 3, name: 'Four of a Kind', desc: 'Four cards same rank', example: 'Q♣ Q♦ Q♥ Q♠ 3♣', pct: '0.0240%', color: 'from-red-400 to-red-600' },
    { rank: 4, name: 'Full House', desc: 'Three of a kind + a pair', example: '8♠ 8♥ 8♦ K♣ K♦', pct: '0.144%', color: 'from-pink-400 to-pink-600' },
    { rank: 5, name: 'Flush', desc: 'Five cards, same suit', example: 'A♣ J♣ 8♣ 8♣ 2♣', pct: '0.197%', color: 'from-purple-400 to-purple-600' },
    { rank: 6, name: 'Straight', desc: 'Five consecutive, any suit', example: '9♠ 8♦ 7♥ 6♣ 5♠', pct: '0.392%', color: 'from-blue-400 to-blue-600' },
    { rank: 7, name: 'Three of a Kind', desc: 'Three cards same rank', example: 'J♣ J♦ J♥ 4♠ 9♣', pct: '2.11%', color: 'from-cyan-400 to-cyan-600' },
    { rank: 8, name: 'Two Pair', desc: 'Two different pairs', example: '10♣ 10♦ 5♥ 5♠ K♣', pct: '4.75%', color: 'from-teal-400 to-teal-600' },
    { rank: 9, name: 'One Pair', desc: 'Two cards same rank', example: 'A♠ A♦ 7♥ 4♣ 2♠', pct: '42.3%', color: 'from-emerald-400 to-emerald-600' },
    { rank: 10, name: 'High Card', desc: 'No combination', example: 'K♥ 9♦ 6♣ 4♠ 2♥', pct: '50.1%', color: 'from-gray-400 to-gray-600' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card-premium">
        <h2 className="text-xl font-black flex items-center gap-2 mb-3"><BookOpen size={20} className="text-gold" /> Texas Hold'em Rules</h2>
        <p className="text-text-secondary/70 text-sm leading-relaxed">
          Each player gets 2 hole cards. 5 community cards are dealt: Flop (3), Turn (1), River (1). Make the best 5-card hand from any combination of your 2 hole cards and the 5 community cards.
        </p>
      </div>

      <div className="card-premium">
        <h3 className="text-lg font-black mb-4 flex items-center gap-2"><Trophy size={18} className="text-gold" /> Hand Rankings Chart</h3>
        <div className="space-y-2">
          {handRankings.map(h => {
            const cards = h.example.split(' ');
            return (
              <div key={h.rank} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all group border border-transparent hover:border-white/5">
                {/* Rank number */}
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${h.color} flex items-center justify-center text-white font-black text-xs shrink-0 shadow-lg`}>{h.rank}</div>
                {/* Cards visualization */}
                <div className="flex gap-1 shrink-0">
                  {cards.map((card, i) => {
                    const rank = card.slice(0, -1);
                    const suit = card.slice(-1);
                    const suitColor = suit === '♥' || suit === '♦' ? (suit === '♥' ? '#ef4444' : '#f97316') : (suit === '♠' ? '#0f172a' : '#1e293b');
                    return (
                      <div key={i} className="w-9 h-12 sm:w-10 sm:h-14 bg-white rounded-lg border border-gray-200 shadow flex flex-col items-center justify-between p-0.5">
                        <div className="text-[9px] sm:text-[10px] font-bold leading-none" style={{ color: suitColor }}>{rank}<span className="text-[0.5em]">{suit}</span></div>
                        <div className="text-sm sm:text-base leading-none" style={{ color: suitColor }}>{suit}</div>
                        <div className="text-[9px] sm:text-[10px] font-bold leading-none rotate-180" style={{ color: suitColor }}>{rank}<span className="text-[0.5em]">{suit}</span></div>
                      </div>
                    );
                  })}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{h.name}</div>
                  <div className="text-[11px] text-text-secondary/50">{h.desc}</div>
                </div>
                {/* Probability */}
                <div className="text-right shrink-0">
                  <div className="text-sm font-black font-mono text-gold">{h.pct}</div>
                  <div className="text-[10px] text-text-secondary/40">probability</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preflop Starting Hands Matrix */}
      <div className="card-premium overflow-x-auto">
        <h3 className="text-lg font-black mb-4 flex items-center gap-2"><Zap size={18} className="text-gold" /> Preflop Starting Hands</h3>
        <p className="text-xs text-text-secondary/60 mb-4">Color-coded matrix of all 169 starting hands. Pairs on diagonal, suited above, offsuit below. Green = premium, red = weak.</p>
        <StartingHandsMatrix />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: Zap, color: 'text-accent-yellow', title: 'Betting Rounds', items: ['Pre-Flop: Betting starts left of Big Blind', 'Flop: 3 community cards dealt', 'Turn: 4th community card dealt', 'River: 5th community card dealt', 'Showdown: Best hand wins'] },
          { icon: Brain, color: 'text-accent-blue', title: 'Actions', items: ['Check: Pass without betting', 'Call: Match current bet', 'Raise: Increase the bet', 'Fold: Forfeit your hand', 'All-In: Bet all your chips'] },
        ].map((section, i) => (
          <div key={i} className="card-premium">
            <h3 className="text-lg font-black mb-3 flex items-center gap-2"><section.icon size={18} className={section.color} /> {section.title}</h3>
            <ul className="space-y-2 text-sm text-text-secondary/70">
              {section.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2"><span className="text-gold font-bold text-xs mt-0.5">{j + 1}.</span><span>{item}</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
});

RulesPage.displayName = 'RulesPage';

// --- About Page ---

const AboutPage: React.FC = React.memo(() => (
  <div className="space-y-5 animate-fade-in">
    <div className="card-premium">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-amber-300 via-gold to-amber-500 rounded-full flex items-center justify-center shadow-md">
          <Crown size={28} className="text-black" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-xl font-black">PokerTrainer</h2>
          <p className="text-sm text-text-secondary/60">Practice poker & train your bot</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { icon: Play, title: 'Poker Learners', desc: 'Practice Texas Hold\'em with real-time feedback. Learn hand rankings, betting strategy, and poker terminology risk-free.', color: 'gold' },
          { icon: Brain, title: 'Bot Developers', desc: 'Train and test your own poker AI. Configure accuracy, aggression, bluff frequency, and reaction time.', color: 'cyan' },
        ].map((item, i) => (
          <div key={i} className="bg-white/[0.03] rounded-2xl p-5 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <item.icon size={16} className={item.color === 'gold' ? 'text-gold' : 'text-accent-cyan'} />
              <h3 className="font-bold text-sm">{item.title}</h3>
            </div>
            <p className="text-xs text-text-secondary/60 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="card-premium">
      <h3 className="text-lg font-black mb-3 flex items-center gap-2"><BarChart3 size={18} className="text-gold" /> Features</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {[[Play, 'Multi-player poker hands'], [BarChart3, 'Win rates, bankroll, ROI'], [BookOpen, 'Poker rules & rankings'], [Brain, 'Trainable AI bot'], [Settings, 'Opponent presets'], [Trophy, 'Bot vs bot comparison']].map(([Icon, label], i) => (
          <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all border border-transparent hover:border-white/5">
            <Icon size={16} className="text-gold shrink-0" />
            <span className="text-sm text-text-secondary/70">{label as string}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="card-premium">
      <h3 className="text-lg font-black mb-3 flex items-center gap-2"><Info size={18} className="text-gold" /> Tech Stack</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {[['Framework', 'React 19'], ['Language', 'TypeScript'], ['State', 'Zustand'], ['Styling', 'Tailwind CSS'], ['Charts', 'Recharts'], ['Engine', 'Custom Hold\'em'], ['AI', '4 Personalities'], ['Build', 'Vite']].map(([k, v]) => (
          <div key={k} className="space-y-0.5"><div className="text-[10px] text-text-secondary/40 uppercase tracking-wider font-semibold">{k}</div><div className="text-text-primary font-semibold">{v}</div></div>
        ))}
      </div>
    </div>
  </div>
));

AboutPage.displayName = 'AboutPage';

// --- Preflop Starting Hands Matrix ---

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

// Standard 169-hand ranking by percentile of 1326 combos
const HAND_RANKINGS_169: Record<string, number> = {
  'AA':1,'KK':2,'QQ':3,'AKs':4,'JJ':5,'AQs':6,'KQs':7,'AJs':8,'KJs':9,'TT':10,
  'AKo':11,'ATs':12,'QJs':13,'KTs':14,'QTs':15,'JTs':16,'99':17,'AQo':18,'A9s':19,'KQo':20,
  '88':21,'K9s':22,'T9s':23,'A8s':24,'Q9s':25,'J9s':26,'AJo':27,'A5s':28,'77':29,'A7s':30,
  'KJo':31,'A4s':32,'A3s':33,'A6s':34,'QJo':35,'66':36,'K8s':37,'T8s':38,'A2s':39,'98s':40,
  'J8s':41,'ATo':42,'Q8s':43,'K7s':44,'KTo':45,'55':46,'JTo':47,'87s':48,'QTo':49,'44':50,
  '33':51,'22':52,'K6s':53,'97s':54,'K5s':55,'76s':56,'T7s':57,'K4s':58,'K2s':59,'Q7s':60,
  'K3s':61,'86s':62,'65s':63,'J7s':64,'54s':65,'Q6s':66,'75s':67,'96s':68,'Q5s':69,'64s':70,
  'Q4s':71,'Q3s':72,'T9o':73,'J6s':74,'T6s':75,'Q2s':76,'A9o':77,'Q9o':78,'J9o':79,'53s':80,
  'K9o':81,'85s':82,'J5s':83,'J4s':84,'T5s':85,'J3s':86,'74s':87,'J2s':88,'43s':89,'95s':90,
  'T4s':91,'A8o':92,'T3s':93,'63s':94,'T2s':95,'52s':96,'84s':97,'94s':98,'42s':99,'A5o':100,
  'A7o':101,'A4o':102,'93s':103,'A3o':104,'32s':105,'A6o':106,'83s':107,'92s':108,'K8o':109,
  '82s':110,'A2o':111,'T8o':112,'72s':113,'J8o':114,'98o':115,'Q8o':116,'87o':117,'K7o':118,
  '97o':119,'76o':120,'K6o':121,'T7o':122,'86o':123,'65o':124,'K5o':125,'54o':126,'J7o':127,
  'K4o':128,'75o':129,'K3o':130,'96o':131,'K2o':132,'64o':133,'Q7o':134,'53o':135,'85o':136,
  'T6o':137,'Q6o':138,'J6o':139,'74o':140,'Q5o':141,'43o':142,'95o':143,'Q4o':144,'63o':145,
  'J5o':146,'Q3o':147,'52o':148,'T5o':149,'84o':150,'J4o':151,'Q2o':152,'42o':153,'T4o':154,
  '94o':155,'J3o':156,'32o':157,'T3o':158,'93o':159,'62s':160,'J2o':161,'73s':162,'T2o':163,
  '82o':164,'73o':165,'83o':166,'62o':167,'92o':168,'72o':169,
};

// Compute combo counts from the actual hand labels in ranked order
const RANK_COMBOS: number[] = (() => {
  const sorted = Object.entries(HAND_RANKINGS_169).sort((a, b) => a[1] - b[1]);
  return sorted.map(([key]) => {
    if (key.length === 2) return 6; // pair: "AA"
    if (key.endsWith('s')) return 4; // suited: "AKs"
    return 12; // offsuit: "AKo"
  });
})();

// Cumulative combos up to each rank
let cum = 0;
const RANK_CUMULATIVE: number[] = RANK_COMBOS.map(c => { cum += c; return cum; });
const TOTAL_COMBOS = 1326;

// Sanity: last cumulative should be ~1326
if (RANK_CUMULATIVE.length > 0) {
  const last = RANK_CUMULATIVE[RANK_CUMULATIVE.length - 1];
  if (last !== TOTAL_COMBOS) {
    console.warn(`Hand combos sum to ${last}, expected ${TOTAL_COMBOS}`);
  }
}

const getHandPercentile = (r1: number, r2: number, isPair: boolean, isSuited: boolean): number => {
  const highRank = RANKS[Math.min(r1, r2)];
  const lowRank = RANKS[Math.max(r1, r2)];
  const key = isPair ? `${highRank}${lowRank}` : isSuited ? `${highRank}${lowRank}s` : `${highRank}${lowRank}o`;
  const rank169 = HAND_RANKINGS_169[key];
  if (!rank169 || rank169 < 1 || rank169 > RANK_CUMULATIVE.length) return 100;
  return (RANK_CUMULATIVE[rank169 - 1] / TOTAL_COMBOS) * 100;
};

// Perceptually-adjusted color gradient for starting hands matrix
// Uses multi-stop interpolation for clear visual distinction between strength tiers
const getCellColor = (pct: number) => {
  // Color stops: [percentile, hue, saturation, lightness_bg, lightness_text]
  // Hue ranges from 140 (rich green) → 0 (red) with accelerated mid-range
  const stops = [
    // [pct,  hue,  sat%, lbg%, ltxt%]
    [0,    140,   90,   22,   85],  // AA: Premium - rich green, brightest
    [5,    130,   85,   20,   82],  // Premium boundary
    [12,   100,   75,   18,   78],  // Strong
    [25,    60,   65,   16,   74],  // Playable - yellow-green
    [45,    30,   55,   15,   70],  // Marginal - amber
    [70,    10,   60,   14,   65],  // Weak - orange-red
    [100,    0,   70,   13,   60],  // Trash - red, darkest
  ];

  // Clamp percentile
  const t = Math.max(0, Math.min(100, pct));

  // Find the two stops to interpolate between
  let i = 0;
  while (i < stops.length - 1 && stops[i + 1][0] < t) i++;
  const [p0, h0, s0, lb0, lt0] = stops[i];
  const [p1, h1, s1, lb1, lt1] = stops[i + 1];

  // Linear interpolation factor
  const range = p1 - p0;
  const f = range === 0 ? 0 : (t - p0) / range;

  const hue = h0 + (h1 - h0) * f;
  const sat = s0 + (s1 - s0) * f;
  const bgLight = lb0 + (lb1 - lb0) * f;
  const textLight = lt0 + (lt1 - lt0) * f;

  return {
    bg: `hsl(${hue}, ${sat}%, ${bgLight}%)`,
    text: `hsl(${hue}, ${Math.max(60, sat - 10)}%, ${textLight}%)`,
  };
};

const MatrixCell: React.FC<{
  label: string;
  pct: number;
  i: number;
  j: number;
  isPair: boolean;
  isSuited: boolean;
  r1: string;
  r2: string;
  hiRank: string;
  loRank: string;
}> = ({ label, pct, isPair, isSuited, r1, r2, hiRank, loRank }) => {
  const c = getCellColor(pct);
  const handName = isPair ? `${r1}${r2}` : isSuited ? `${hiRank}${loRank}s` : `${hiRank}${loRank}o`;
  const category = pct < 5 ? 'Premium' : pct < 12 ? 'Strong' : pct < 25 ? 'Playable' : pct < 45 ? 'Marginal' : pct < 70 ? 'Weak' : 'Trash';

  return (
    <div className="tooltip-trigger relative">
      <div
        className="flex flex-col items-center justify-center rounded-sm border transition-all duration-150 cursor-default
                   hover:scale-125 hover:z-20 hover:shadow-lg hover:brightness-125 hover:border-white/30
                   sm:min-h-[36px] min-h-[28px]"
        style={{
          backgroundColor: c.bg,
          color: c.text,
          borderColor: `${c.text}20`,
        }}
      >
        <span className="text-[9px] sm:text-[10px] font-black leading-tight">{label}</span>
        <span className="text-[7px] sm:text-[8.5px] font-medium opacity-60 leading-tight hidden sm:inline">{pct.toFixed(1)}%</span>
      </div>
      {/* Tooltip */}
      <div className="tooltip-content -top-12 left-1/2 -translate-x-1/2 z-50">
        <div className="font-black text-sm">{handName}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-gold font-bold">Top {pct.toFixed(1)}%</span>
          <span className="text-text-secondary/50">·</span>
          <span className={`font-semibold ${
            category === 'Premium' ? 'text-accent-green' :
            category === 'Strong' ? 'text-gold' :
            category === 'Playable' ? 'text-accent-yellow' :
            category === 'Marginal' ? 'text-accent-blue' :
            'text-text-secondary/50'
          }`}>{category}</span>
        </div>
        {pct < 5 && <div className="text-[10px] text-accent-green mt-0.5">Always play</div>}
        {pct >= 5 && pct < 12 && <div className="text-[10px] text-gold mt-0.5">Strong — raise preflop</div>}
        {pct >= 12 && pct < 25 && <div className="text-[10px] text-accent-yellow mt-0.5">Playable from most positions</div>}
        {pct >= 25 && pct < 45 && <div className="text-[10px] text-accent-blue mt-0.5">Marginal — play late position</div>}
        {pct >= 45 && pct < 70 && <div className="text-[10px] text-text-secondary/60 mt-0.5">Weak — fold to aggression</div>}
        {pct >= 70 && <div className="text-[10px] text-text-secondary/30 mt-0.5">Trash — always fold</div>}
      </div>
    </div>
  );
};

const StartingHandsMatrix: React.FC = React.memo(() => (
  <div className="inline-block min-w-full">
    {/* Legend - gradient bar */}
    <div className="flex items-center gap-2 mb-3 text-[10px] flex-wrap">
      <span className="text-accent-green font-semibold whitespace-nowrap">Premium</span>
      <div className="flex-1 h-3 min-w-[80px] rounded-full" style={{ background: 'linear-gradient(to right, hsl(120,85%,22%), hsl(70,75%,18%), hsl(30,60%,16%), hsl(0,80%,15%))' }} />
      <span className="text-accent-red font-semibold whitespace-nowrap">Trash</span>
      <span className="text-text-secondary/40 ml-2 whitespace-nowrap text-[9px]">Lower % = better</span>
    </div>
    {/* Grid */}
    <div className="grid" style={{ gridTemplateColumns: `28px repeat(13, 1fr)` }}>
      {/* Header row */}
      <div className="h-6 sm:h-7" />
      {RANKS.map(r => (
        <div key={r} className="h-6 sm:h-7 flex items-center justify-center text-[10px] sm:text-[11px] font-black text-text-secondary/50">{r}</div>
      ))}
      {RANKS.map((r1, i) => (
        <React.Fragment key={r1}>
          {/* Row label */}
          <div className="h-6 sm:h-7 flex items-center justify-center text-[10px] sm:text-[11px] font-black text-text-secondary/50">{r1}</div>
          {RANKS.map((r2, j) => {
            const isPair = i === j;
            const isSuited = i < j; // above diagonal = suited (higher index in RANKS = lower rank)
            // Always put higher rank first: pairs "AA", suited "AKs", offsuit "AKo"
            const hiRank = RANKS[Math.min(i, j)];
            const loRank = RANKS[Math.max(i, j)];
            const label = isPair
              ? `${r1}${r2}`
              : isSuited
                ? `${hiRank}${loRank}s`
                : `${hiRank}${loRank}o`;
            const pct = getHandPercentile(i, j, isPair, isSuited);
            return (
              <MatrixCell
                key={`${i}-${j}`}
                label={label} pct={pct} i={i} j={j}
                isPair={isPair} isSuited={isSuited}
                r1={r1} r2={r2} hiRank={hiRank} loRank={loRank}
              />
            );
          })}
        </React.Fragment>
      ))}
    </div>
  </div>
));

StartingHandsMatrix.displayName = 'StartingHandsMatrix';

export default App;
