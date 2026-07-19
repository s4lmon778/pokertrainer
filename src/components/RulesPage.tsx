import React, { useState } from 'react';
import { BookOpen, Trophy, Zap, Brain } from 'lucide-react';

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

// Compute combo counts
const RANK_COMBOS: number[] = (() => {
  const sorted = Object.entries(HAND_RANKINGS_169).sort((a, b) => a[1] - b[1]);
  return sorted.map(([key]) => {
    if (key.length === 2) return 6;
    if (key.endsWith('s')) return 4;
    return 12;
  });
})();

let cum = 0;
const RANK_CUMULATIVE: number[] = RANK_COMBOS.map(c => { cum += c; return cum; });
const TOTAL_COMBOS = 1326;

const getHandPercentile = (r1: number, r2: number, isPair: boolean, isSuited: boolean): number => {
  const hi = RANKS[Math.min(r1, r2)];
  const lo = RANKS[Math.max(r1, r2)];
  const key = isPair ? `${hi}${lo}` : isSuited ? `${hi}${lo}s` : `${hi}${lo}o`;
  const rank169 = HAND_RANKINGS_169[key];
  if (!rank169 || rank169 < 1 || rank169 > RANK_CUMULATIVE.length) return 100;
  return (RANK_CUMULATIVE[rank169 - 1] / TOTAL_COMBOS) * 100;
};

const getCellColor = (pct: number) => {
  const stops: [number, number, number, number, number][] = [
    [0,    140,   90,   22,   85],
    [5,    130,   85,   20,   82],
    [12,   100,   75,   18,   78],
    [25,    60,   65,   16,   74],
    [45,    30,   55,   15,   70],
    [70,    10,   60,   14,   65],
    [100,    0,   70,   13,   60],
  ];
  const t = Math.max(0, Math.min(100, pct));
  let i = 0;
  while (i < stops.length - 1 && stops[i + 1][0] < t) i++;
  const [p0, h0, s0, lb0, lt0] = stops[i];
  const [p1, h1, s1, lb1, lt1] = stops[i + 1];
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
  label: string; pct: number; i: number; j: number;
  isPair: boolean; isSuited: boolean;
  r1: string; r2: string; hiRank: string; loRank: string;
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
        style={{ backgroundColor: c.bg, color: c.text, borderColor: `${c.text}20` }}
      >
        <span className="text-[9px] sm:text-[10px] font-black leading-tight">{label}</span>
        <span className="text-[7px] sm:text-[8.5px] font-medium opacity-60 leading-tight hidden sm:inline">{pct.toFixed(1)}%</span>
      </div>
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
      </div>
    </div>
  );
};

const StartingHandsMatrix: React.FC = React.memo(() => (
  <div className="inline-block min-w-full">
    <div className="flex items-center gap-2 mb-3 text-[10px] flex-wrap">
      <span className="text-accent-green font-semibold whitespace-nowrap">Premium</span>
      <div className="flex-1 h-3 min-w-[80px] rounded-full" style={{ background: 'linear-gradient(to right, hsl(120,85%,22%), hsl(70,75%,18%), hsl(30,60%,16%), hsl(0,80%,15%))' }} />
      <span className="text-accent-red font-semibold whitespace-nowrap">Trash</span>
      <span className="text-text-secondary/40 ml-2 whitespace-nowrap text-[9px]">Lower % = better</span>
    </div>
    <div className="grid" style={{ gridTemplateColumns: `28px repeat(13, 1fr)` }}>
      <div className="h-6 sm:h-7" />
      {RANKS.map(r => (
        <div key={r} className="h-6 sm:h-7 flex items-center justify-center text-[10px] sm:text-[11px] font-black text-text-secondary/50">{r}</div>
      ))}
      {RANKS.map((r1, i) => (
        <React.Fragment key={r1}>
          <div className="h-6 sm:h-7 flex items-center justify-center text-[10px] sm:text-[11px] font-black text-text-secondary/50">{r1}</div>
          {RANKS.map((r2, j) => {
            const isPair = i === j;
            const isSuited = i < j;
            const hiRank = RANKS[Math.min(i, j)];
            const loRank = RANKS[Math.max(i, j)];
            const label = isPair ? `${r1}${r2}` : isSuited ? `${hiRank}${loRank}s` : `${hiRank}${loRank}o`;
            const pct = getHandPercentile(i, j, isPair, isSuited);
            return <MatrixCell key={`${i}-${j}`} label={label} pct={pct} i={i} j={j} isPair={isPair} isSuited={isSuited} r1={r1} r2={r2} hiRank={hiRank} loRank={loRank} />;
          })}
        </React.Fragment>
      ))}
    </div>
  </div>
));
StartingHandsMatrix.displayName = 'StartingHandsMatrix';

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
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${h.color} flex items-center justify-center text-white font-black text-xs shrink-0 shadow-lg`}>{h.rank}</div>
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
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{h.name}</div>
                  <div className="text-[11px] text-text-secondary/50">{h.desc}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black font-mono text-gold">{h.pct}</div>
                  <div className="text-[10px] text-text-secondary/40">probability</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-premium overflow-x-auto">
        <h3 className="text-lg font-black mb-4 flex items-center gap-2"><Zap size={18} className="text-gold" /> Preflop Starting Hands</h3>
        <p className="text-xs text-text-secondary/60 mb-4">Color-coded matrix of all 169 starting hands. Pairs on diagonal, suited above, offsuit below. Green = premium, red = weak.</p>
        <StartingHandsMatrix />
      </div>

      <div className="card-premium">
        <h3 className="text-lg font-black mb-4 flex items-center gap-2"><Brain size={18} className="text-accent-blue" /> Betting Actions &amp; Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Betting Rounds */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <h4 className="font-bold text-sm text-gold mb-3 flex items-center gap-2"><Zap size={14} /> Betting Rounds</h4>
            <ul className="space-y-2 text-sm text-text-secondary/70">
              <li className="flex items-start gap-2"><span className="text-gold font-bold text-xs mt-0.5">1.</span><span><strong>Preflop</strong> — Each player receives 2 hole cards. Betting starts with the player left of the big blind.</span></li>
              <li className="flex items-start gap-2"><span className="text-gold font-bold text-xs mt-0.5">2.</span><span><strong>Flop</strong> — 3 community cards dealt face-up. Another round of betting begins with the small blind.</span></li>
              <li className="flex items-start gap-2"><span className="text-gold font-bold text-xs mt-0.5">3.</span><span><strong>Turn</strong> — 4th community card dealt. Betting round follows.</span></li>
              <li className="flex items-start gap-2"><span className="text-gold font-bold text-xs mt-0.5">4.</span><span><strong>River</strong> — 5th community card dealt. Final betting round.</span></li>
              <li className="flex items-start gap-2"><span className="text-gold font-bold text-xs mt-0.5">5.</span><span><strong>Showdown</strong> — Remaining players reveal hands. Best 5-card poker hand wins the pot.</span></li>
            </ul>
          </div>
          {/* Available Actions */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <h4 className="font-bold text-sm text-accent-blue mb-3 flex items-center gap-2"><Trophy size={14} /> Actions</h4>
            <ul className="space-y-2 text-sm text-text-secondary/70">
              <li className="flex items-start gap-2"><span className="text-accent-green font-bold text-xs mt-0.5">•</span><span><strong>Check</strong> — Pass the action to the next player without betting (only when no bet has been made).</span></li>
              <li className="flex items-start gap-2"><span className="text-accent-green font-bold text-xs mt-0.5">•</span><span><strong>Call</strong> — Match the current bet to stay in the hand.</span></li>
              <li className="flex items-start gap-2"><span className="text-accent-green font-bold text-xs mt-0.5">•</span><span><strong>Raise</strong> — Increase the current bet. Minimum raise is the size of the previous bet.</span></li>
              <li className="flex items-start gap-2"><span className="text-accent-green font-bold text-xs mt-0.5">•</span><span><strong>Fold</strong> — Discard your hand and forfeit the pot.</span></li>
              <li className="flex items-start gap-2"><span className="text-accent-green font-bold text-xs mt-0.5">•</span><span><strong>All-In</strong> — Bet all your remaining chips.</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
});

RulesPage.displayName = 'RulesPage';
export default RulesPage;
