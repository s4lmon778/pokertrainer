import React, { useState, useEffect, useCallback } from 'react';
import PokerTable from './components/PokerTable';
import PlayerControls from './components/PlayerControls';
import RiskOverlay from './components/RiskOverlay';
import StatsDashboard from './components/StatsDashboard';
import SettingsPanel from './components/SettingsPanel';
import { useGameStore } from './store/gameStore';
import { Play, BarChart3, Settings, BookOpen, Info, Trophy, Brain, Zap, Users, Sparkles, LogOut, Crown, Coins } from 'lucide-react';

type Tab = 'play' | 'stats' | 'rules' | 'about' | 'settings';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('play');
  const isPlaying = useGameStore(s => s.isPlaying);
  const initializeGame = useGameStore(s => s.initializeGame);
  const startHand = useGameStore(s => s.startHand);
  const botAct = useGameStore(s => s.botAct);
  const advanceTurn = useGameStore(s => s.advanceTurn);
  const gameState = useGameStore(s => s.gameState);
  const autoPlaySpeed = useGameStore(s => s.autoPlaySpeed);
  const blinds = useGameStore(s => s.blinds);
  const currentBankroll = useGameStore(s => s.currentBankroll);
  const quitGame = useGameStore(s => s.quitGame);

  const botActingRef = React.useRef(false);

  useEffect(() => {
    if (!isPlaying || !gameState || gameState.gameOver) {
      botActingRef.current = false;
      return;
    }
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer) return;
    if (currentPlayer.isBot === false) { botActingRef.current = false; return; }
    if (currentPlayer.actedThisRound || botActingRef.current) return;

    botActingRef.current = true;
    const timer = setTimeout(async () => {
      try { await botAct(); advanceTurn(); }
      catch (e) { console.error('botAct error:', e); }
      finally { botActingRef.current = false; }
    }, autoPlaySpeed);

    return () => { clearTimeout(timer); botActingRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameState?.currentPlayerIndex, gameState?.gameOver, botAct, advanceTurn, autoPlaySpeed]);

  const handleStartGame = useCallback(() => {
    initializeGame();
    setTimeout(() => startHand(), 500);
  }, [initializeGame, startHand]);

  const handleNextHand = useCallback(() => startHand(), [startHand]);

  const goToTab = useCallback((tab: Tab) => setActiveTab(tab), []);

  const tabs = [
    { id: 'play' as Tab, icon: Play, label: 'Table' },
    { id: 'stats' as Tab, icon: BarChart3, label: 'Stats' },
    { id: 'rules' as Tab, icon: BookOpen, label: 'Rules' },
    { id: 'about' as Tab, icon: Info, label: 'About' },
    { id: 'settings' as Tab, icon: Settings, label: 'Settings' },
  ];

  const showGame = activeTab === 'play' && isPlaying && gameState;

  return (
    <div className="min-h-screen bg-surface text-text-primary flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 bg-surface/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-300 via-gold to-amber-500 rounded-full flex items-center justify-center shadow-md">
                <Crown size={20} className="text-black" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight">
                  <span className="text-gold">Poker</span>
                  <span className="text-text-secondary font-bold">Trainer</span>
                </h1>
                <p className="text-[10px] text-text-secondary/40 font-medium tracking-wide">PRACTICE & TRAIN YOUR BOT</p>
              </div>
            </div>

            {isPlaying && (
              <button onClick={quitGame}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary/60 hover:text-accent-red hover:bg-accent-red/10 border border-transparent hover:border-accent-red/20 transition-all">
                <LogOut size={12} /> Quit
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-0.5 bg-white/5 rounded-xl p-1 border border-white/5 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gold text-black shadow-md'
                    : 'text-text-secondary/70 hover:text-text-primary hover:bg-white/5'
                }`}>
                <tab.icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-3 w-full">
        {/* Game Status Bar */}
        {showGame && (
          <div className="glass px-5 py-2.5 mb-3 flex items-center justify-between flex-wrap gap-3 animate-fade-in">
            <div className="flex items-center gap-5 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary/60 text-xs uppercase tracking-wider font-semibold">Hand</span>
                <span className="text-text-primary font-mono font-bold text-base">{gameState!.handNumber}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-text-secondary/60 text-xs uppercase tracking-wider font-semibold">Blinds</span>
                <span className="text-text-primary font-mono font-bold">${blinds.small}/${blinds.big}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-text-secondary/60 text-xs uppercase tracking-wider font-semibold">Phase</span>
                <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold font-bold text-xs uppercase tracking-wider border border-gold/30">{gameState!.currentPhase}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Coins size={14} className="text-gold" />
                <span className={`font-mono font-bold text-base ${currentBankroll >= 1000 ? 'text-accent-green' : 'text-accent-red'}`}>${currentBankroll}</span>
              </div>
              {gameState!.gameOver && (
                <button onClick={handleNextHand} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
                  <Play size={12} /> Next Hand
                </button>
              )}
            </div>
          </div>
        )}

        {/* Landing page */}
        {activeTab === 'play' && !isPlaying && !gameState && (
          <LandingPage onStart={handleStartGame} goToTab={goToTab} />
        )}

        {/* Game view — sidebar layout */}
        {showGame && (
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Left: controls + table */}
            <div className="flex-1 min-w-0 space-y-2">
              <PlayerControls />
              <PokerTable />
            </div>
            {/* Right: stats sidebar */}
            <div className="w-full lg:w-80 shrink-0">
              <RiskOverlay />
            </div>
          </div>
        )}

        {activeTab === 'stats' && <StatsDashboard />}
        {activeTab === 'rules' && <RulesPage />}
        {activeTab === 'about' && <AboutPage />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>

      <footer className="border-t border-white/5 py-3 text-center">
        <p className="text-[10px] text-text-secondary/30 font-medium tracking-wide">POKERTRAINER — EDUCATIONAL SIMULATION. NO REAL MONEY.</p>
      </footer>
    </div>
  );
};

// --- Landing Page ---

const LandingPage: React.FC<{ onStart: () => void; goToTab: (tab: Tab) => void }> = ({ onStart, goToTab }) => (
  <div className="flex flex-col items-center justify-center py-10 md:py-14 space-y-10 animate-fade-in">
    {/* Hero */}
    <div className="text-center max-w-lg space-y-5">
      <div className="w-24 h-24 mx-auto bg-gradient-to-br from-amber-300 via-gold to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-float">
        <Crown size={44} className="text-black" strokeWidth={1.5} />
      </div>
      <h2 className="text-4xl md:text-5xl font-black tracking-tight">
        <span className="bg-gradient-to-r from-gold-light via-gold to-gold-dark bg-clip-text text-transparent">Poker</span>
        <span className="text-text-primary">Trainer</span>
      </h2>
      <p className="text-text-secondary/70 text-sm md:text-base max-w-sm mx-auto leading-relaxed">
        Practice Texas Hold'em against AI opponents. Train your custom bot, track stats, sharpen your game.
      </p>
      <button onClick={onStart} className="btn-primary inline-flex items-center gap-2 px-10 py-3.5 rounded-2xl text-base font-bold shadow-xl shadow-gold/20 hover:shadow-gold/40 transition-all active:scale-95">
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
        <button
          key={i}
          onClick={() => goToTab(f.tab)}
          className="card-premium text-center space-y-3 group cursor-pointer hover:scale-[1.03] transition-transform duration-300 text-left w-full"
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
        </button>
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
);

// --- Rules Page ---

const RulesPage: React.FC = () => {
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
        <h3 className="text-lg font-black mb-4 flex items-center gap-2"><Trophy size={18} className="text-gold" /> Hand Rankings</h3>
        <div className="space-y-1">
          {handRankings.map(h => (
            <div key={h.rank} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all group border border-transparent hover:border-white/5">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${h.color} flex items-center justify-center text-white font-black text-xs shrink-0 shadow-lg`}>{h.rank}</div>
              <div className="flex-1 min-w-0"><div className="font-bold text-sm">{h.name}</div><div className="text-xs text-text-secondary/60">{h.desc}</div></div>
              <div className="hidden md:block text-xs font-mono text-text-secondary/50 bg-white/5 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">{h.example}</div>
              <div className="text-[10px] text-text-secondary/40 font-mono shrink-0 w-16 text-right">{h.pct}</div>
            </div>
          ))}
        </div>
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
};

// --- About Page ---

const AboutPage: React.FC = () => (
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
);

export default App;
