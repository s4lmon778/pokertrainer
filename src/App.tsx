import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import PokerTable from './components/PokerTable';
import PlayerControls from './components/PlayerControls';
import RiskOverlay from './components/RiskOverlay';
import SettingsPanel from './components/SettingsPanel';
import Card from './components/Card';
import CoachTips from './components/CoachTips';
import ErrorBoundary from './components/ErrorBoundary';
import TrainingBotSettings from './components/TrainingBotSettings';
import { useGameStore } from './store/gameStore';
import { initMonitoring, addBreadcrumb, reportWebVitals } from './utils/monitoring';
import { Play, BarChart3, Settings, BookOpen, Info, Trophy, Brain, Zap, Users, Sparkles, LogOut, Crown, Coins, Keyboard, XCircle, Loader2, RefreshCw } from 'lucide-react';

// Code-split heavy components for faster initial load
const StatsDashboard = lazy(() => import('./components/StatsDashboard'));
const RulesPage = lazy(() => import('./components/RulesPage'));
const AboutPage = lazy(() => import('./components/AboutPage'));
const SolverPage = lazy(() => import('./pages/SolverPage'));

/** Loading fallback for lazy components */
const LazyFallback: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex flex-col items-center gap-3">
      <Loader2 size={32} className="text-gold animate-spin" />
      <p className="text-sm text-text-secondary/50">Loading...</p>
    </div>
  </div>
);

type Tab = 'play' | 'stats' | 'rules' | 'solver' | 'about' | 'settings' | 'training';

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
  const autoRefillChips = useGameStore(s => s.autoRefillChips);
  const toggleAutoRefillChips = useGameStore(s => s.toggleAutoRefillChips);
  const tbotActivity = useGameStore(s => s.tbotActivity);
  const quitGame = useGameStore(s => s.quitGame);
  const addHumanChips = useGameStore(s => s.addHumanChips);

  const [rebuyAmount, setRebuyAmount] = useState<number | ''>(100);
  const handleRebuy = useCallback(() => {
    const amt = rebuyAmount === '' ? 0 : rebuyAmount;
    if (amt > 0) {
      addHumanChips(amt);
    }
  }, [rebuyAmount, addHumanChips]);

  // Initialize monitoring on mount
  useEffect(() => {
    initMonitoring({
      version: '1.0.0',
      environment: import.meta.env.PROD ? 'production' : 'development',
      tracesSampleRate: 0.1,
    });
    reportWebVitals();
    addBreadcrumb('app', 'App mounted', 'info');
  }, []);

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

  const tabs = useMemo(() => [
    { id: 'play' as Tab, icon: Play, label: 'Play' },
    { id: 'stats' as Tab, icon: BarChart3, label: 'Stats' },
    { id: 'rules' as Tab, icon: BookOpen, label: 'Rules' },
    { id: 'solver' as Tab, icon: Brain, label: 'Solver' },
    { id: 'about' as Tab, icon: Info, label: 'About' },
    { id: 'settings' as Tab, icon: Settings, label: 'Settings' },
  ], []);

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
              <button key={tab.id} onClick={() => goToTab(tab.id)}
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
                onClick={toggleAutoRefillChips}
                aria-label={autoRefillChips ? 'Disable auto-refill chips' : 'Enable auto-refill chips'}
                className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold transition-all ${
                  autoRefillChips ? 'bg-emerald-500 text-white' : 'bg-white/10 text-text-secondary/50 hover:text-text-primary'
                }`}
              >
                <RefreshCw size={10} />
                <span className="hidden sm:inline">REFILL</span>
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
        {activeTab === 'rules' && (
          <section role="region" aria-label="Poker rules and hand rankings">
            <ErrorBoundary>
              <Suspense fallback={<LazyFallback />}>
                <RulesPage />
              </Suspense>
            </ErrorBoundary>
          </section>
        )}
        {activeTab === 'solver' && (
          <section role="region" aria-label="GTO Solver">
            <ErrorBoundary>
              <Suspense fallback={<LazyFallback />}>
                <SolverPage />
              </Suspense>
            </ErrorBoundary>
          </section>
        )}
        {activeTab === 'about' && (
          <section role="region" aria-label="About PokerTrainer">
            <ErrorBoundary>
              <Suspense fallback={<LazyFallback />}>
                <AboutPage />
              </Suspense>
            </ErrorBoundary>
          </section>
        )}
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

export default App;
