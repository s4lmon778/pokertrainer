/**
 * Range Selector Component
 * 
 * Interactive UI for selecting poker ranges (hero/villain hand distributions).
 * Uses the same 169-hand matrix visualization as the StartingHandsMatrix.
 */

import React, { useState, useCallback } from 'react';

// Standard ranks for poker hands
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

interface RangeSelectorProps {
  title: string;
  selectedHands: Set<string>;
  onHandToggle: (hand: string, selected: boolean) => void;
  preset?: string;
  onPresetSelect?: (preset: string) => void;
}

export const RangeSelector: React.FC<RangeSelectorProps> = ({
  title,
  selectedHands,
  onHandToggle,
  preset,
  onPresetSelect,
}) => {
  const [hoveredHand, setHoveredHand] = useState<string | null>(null);
  
  const handlePresetClick = useCallback((presetName: string) => {
    if (onPresetSelect) {
      onPresetSelect(presetName);
    }
  }, [onPresetSelect]);

  return (
    <div className="range-selector p-4 bg-gray-800 rounded-lg">
      <h4 className="text-lg font-bold mb-3">{title}</h4>
      
      {/* Presets */}
      {onPresetSelect && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Quick Presets:</label>
          <div className="flex flex-wrap gap-2">
            {[
              { name: '100%', hands: 'all' },
              { name: 'Ultra Tight', hands: 'tight' },
              { name: 'Tight', hands: 'medium-tight' },
              { name: 'Loose', hands: 'medium-loose' },
              { name: 'Very Loose', hands: 'loose' },
            ].map(presetOption => (
              <button
                key={presetOption.name}
                onClick={() => handlePresetClick(presetOption.name)}
                className={`px-3 py-1 text-xs rounded ${
                  preset === presetOption.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {presetOption.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Hand Matrix */}
      <div className="hand-matrix">
        <div className="grid grid-cols-[1.5rem_repeat(13,1fr)] gap-0.5 text-[8px]">
          {/* Corner cell */}
          <div />
          {/* Column headers */}
          {RANKS.map((r2: string) => (
            <div key={`col-${r2}`} className="text-center font-bold text-gray-400">{r2}</div>
          ))}
          {/* Rows */}
          {RANKS.map((r1: string, i: number) => (
            <React.Fragment key={r1}>
              {/* Row header */}
              <div className="text-center font-bold text-gray-400">{r1}</div>
              {RANKS.map((r2: string, j: number) => {
                const isPair = i === j;
                const isSuited = i < j;
                const hiRank = RANKS[Math.min(i, j)];
                const loRank = RANKS[Math.max(i, j)];
                const handKey = isPair ? `${hiRank}${loRank}` : isSuited ? `${hiRank}${loRank}s` : `${hiRank}${loRank}o`;
                const isSelected = selectedHands.has(handKey);
                const isHovered = hoveredHand === handKey;
                
                return (
                  <div
                    key={`${i}-${j}`}
                    className={`aspect-square flex items-center justify-center rounded cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : isHovered
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                    onClick={() => onHandToggle(handKey, !isSelected)}
                    onMouseEnter={() => setHoveredHand(handKey)}
                    onMouseLeave={() => setHoveredHand(null)}
                  >
                    {isPair ? `${hiRank}${loRank}` : isSuited ? `${hiRank}${loRank}s` : `${hiRank}${loRank}o`}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Stats */}
      <div className="mt-3 text-xs text-gray-400">
        Selected: {selectedHands.size} hands ({(selectedHands.size / TOTAL_COMBOS * 100).toFixed(1)}%)
      </div>
    </div>
  );
};
