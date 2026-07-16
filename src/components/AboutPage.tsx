import React from 'react';
import { Play, Brain, BarChart3, BookOpen, Settings, Trophy, Info, Crown } from 'lucide-react';

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
export default AboutPage;
