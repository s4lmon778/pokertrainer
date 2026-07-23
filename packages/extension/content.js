// ── PokerBot Bridge — Content Script ──
// Runs on supported poker sites. Reads DOM table state,
// sends to background script, and executes bot actions.

const SCAN_INTERVAL_MS = 800; // push state every 800ms

// ── Site detection ──

function detectSite() {
  const url = location.href.toLowerCase();
  if (url.includes('ggpoker')) return 'ggpoker';
  if (url.includes('ignitioncasino') || url.includes('bovada')) return 'ignition';
  if (url.includes('coinpoker')) return 'coinpoker';
  if (url.includes('americascardroom') || url.includes('acr')) return 'acr';
  if (url.includes('pokerstars')) return 'pokerstars';
  return 'unknown';
}

function makeTableId() {
  // Stable table ID from URL path + host (survives page nav within same table)
  return `${location.hostname}${location.pathname}`.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);
}

// ── DOM reading helpers ──

function queryText(selector) {
  const el = document.querySelector(selector);
  return el ? el.textContent.trim() : '';
}

function queryAllText(selector) {
  return Array.from(document.querySelectorAll(selector)).map(el => el.textContent.trim());
}

function queryVisible(selector) {
  const el = document.querySelector(selector);
  if (!el) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0;
}

function parseCurrency(text) {
  if (!text) return 0.0;
  const cleaned = text.replace(/[^0-9.\-]/g, '');
  return parseFloat(cleaned) || 0.0;
}

// ── Card parsing ──

// GGPoker uses CSS classes like "card-hearts-A" or "card rank-A suit-hearts"
// Ignition uses "card Ah" etc.
// CoinPoker uses similar class patterns
function parseCardFromClass(className) {
  let rank = '?';
  let suit = '?';

  const lower = className.toLowerCase();

  // Suit detection
  if (lower.includes('heart') || lower.includes('hearts') || lower.includes('♥') || lower.includes('&hearts;')) {
    suit = 'h';
  } else if (lower.includes('diamond') || lower.includes('diamonds') || lower.includes('♦') || lower.includes('&diams;')) {
    suit = 'd';
  } else if (lower.includes('spade') || lower.includes('spades') || lower.includes('♠') || lower.includes('&spades;')) {
    suit = 's';
  } else if (lower.includes('club') || lower.includes('clubs') || lower.includes('♣') || lower.includes('&clubs;')) {
    suit = 'c';
  }

  // Rank detection — look for patterns like "rank-A", "card-A", "-a ", " Ah"
  const rankPatterns = [
    /\b(?:rank|card)[-=_]\s*(a|k|q|j|t|[2-9]|10)\b/i,
    /\b(?:rank|card)[-=_]\s*(1[0-4])\b/i, // numeric rank like "card-14" for Ace
    /\b(a|k|q|j|t|10|[2-9])\b/i,
  ];

  for (const pat of rankPatterns) {
    const m = lower.match(pat);
    if (m) {
      let r = m[1].toUpperCase();
      // Convert numeric ranks
      if (r === '14' || r === '1') r = 'A';
      else if (r === '13') r = 'K';
      else if (r === '12') r = 'Q';
      else if (r === '11') r = 'J';
      else if (r === '10') r = 'T';
      rank = r;
      break;
    }
  }

  // Fallback: check textContent of the card element
  return { rank, suit };
}

function parseCardFromElement(el) {
  // Try class-based parsing first
  const cls = el.className || '';
  let result = parseCardFromClass(cls);

  // If rank is still unknown, try text content
  if (result.rank === '?') {
    const text = (el.textContent || '').trim();
    if (text.length >= 1) {
      const rankChar = text[0].toUpperCase();
      if ('AKQJT98765432'.includes(rankChar)) {
        result.rank = rankChar;
      }
    }
    if (text.length >= 2) {
      const suitChar = text[1];
      if (suitChar === '♥' || suitChar === 'h') result.suit = 'h';
      else if (suitChar === '♦' || suitChar === 'd') result.suit = 'd';
      else if (suitChar === '♠' || suitChar === 's') result.suit = 's';
      else if (suitChar === '♣' || suitChar === 'c') result.suit = 'c';
    }
  }

  return result;
}

// ── Broad card selectors (site-agnostic fallback) ──

const BROAD_HERO_CARD_SELECTORS = [
  '.seat-1 .card', '.player-card .card', '[class*="hero"] .card',
  '.my-card .card', '.hole-card', '.player-cards .card',
  '.hand-cards .card', '[class*="player-hand"] .card',
  '.poker-card.face-up', '[class*="seat"][class*="active"] .card',
  '[data-seat="hero"] .card', '[data-player="hero"] .card',
];

const BROAD_COMMUNITY_CARD_SELECTORS = [
  '.community-cards .card', '.board .card', '[class*="community"] .card',
  '.table-community .card', '.board-cards .card', '.table-cards .card',
  '.poker-board .card', '[class*="board"] .card',
];

const BROAD_BUTTON_SELECTORS = {
  fold: [
    '.action-btn.fold', '[data-action="fold"]', 'button.fold', '.btn-fold',
    '#fold-button', '.fold-button', 'button:has-text("Fold")',
  ],
  call: [
    '.action-btn.call', '[data-action="call"]', 'button.call', '.btn-call',
    '#call-button', '.call-button', 'button:has-text("Call")',
  ],
  raise: [
    '.action-btn.raise', '[data-action="raise"]', 'button.raise', '.btn-raise',
    '#raise-button', '.raise-button', 'button:has-text("Raise")',
  ],
  all_in: [
    '.action-btn.allin', '[data-action="allin"]', 'button.allin', '.btn-allin',
    '#all-in-button', '.all-in-button', 'button:has-text("All")',
  ],
  check: [
    '.action-btn.check', '[data-action="check"]', 'button.check', '.btn-check',
    '#check-button', '.check-button', 'button:has-text("Check")',
  ],
};

// ── State extraction ──

function findCardElements(selectors) {
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    if (els.length > 0) return Array.from(els);
  }
  return [];
}

function findButton(action) {
  for (const sel of BROAD_BUTTON_SELECTORS[action] || []) {
    // Try querySelector with :has-text equivalent
    if (sel.includes(':has-text(')) {
      const text = sel.match(/:has-text\("(.+?)"\)/)?.[1];
      if (text) {
        const buttons = document.querySelectorAll('button, [role="button"], .btn, [class*="btn"], [class*="button"]');
        for (const btn of buttons) {
          if (btn.textContent.toLowerCase().includes(text.toLowerCase()) && btn.offsetWidth > 0) {
            return btn;
          }
        }
        continue;
      }
    }
    const el = document.querySelector(sel);
    if (el && el.offsetWidth > 0) return el;
  }
  return null;
}

function readTableState() {
  const site = detectSite();
  const tableId = makeTableId();

  // Hero cards
  const heroEls = findCardElements(BROAD_HERO_CARD_SELECTORS);
  const heroCards = heroEls.slice(0, 2).map(el => parseCardFromElement(el));

  // Community cards
  const commEls = findCardElements(BROAD_COMMUNITY_CARD_SELECTORS);
  const communityCards = commEls.slice(0, 5).map(el => parseCardFromElement(el));

  // Phase
  const phase = communityCards.length === 0 ? 'preflop'
    : communityCards.length <= 3 ? 'flop'
    : communityCards.length === 4 ? 'turn'
    : 'river';

  // Action buttons
  const buttonsVisible = {};
  for (const action of ['fold', 'call', 'raise', 'all_in', 'check']) {
    buttonsVisible[action] = !!findButton(action);
  }

  // Hero turn detection: look for timer element or active turn indicator
  const turnIndicators = [
    '.turn-indicator.visible', '.my-turn', '[class*="hero-turn"]',
    '.time-bar.visible', '.timer-visible', '.turn-timer',
    '.active-player [class*="turn"]', '[class*="action-indicator"].active',
    '.player-active [class*="turn"]',
  ];
  let isHeroTurn = buttonsVisible.fold || buttonsVisible.call || buttonsVisible.check;
  for (const sel of turnIndicators) {
    if (queryVisible(sel)) { isHeroTurn = true; break; }
  }

  // Pot size
  const potSelectors = [
    '.pot-amount', '.pot .value', '[class*="pot"] .amount', '.table-pot',
    '#pot-amount', '.pot-amount', '.pot .amount', '.pot-display',
    '.pot-value',
  ];
  let potSize = 0.0;
  for (const sel of potSelectors) {
    const text = queryText(sel);
    if (text) { potSize = parseCurrency(text); break; }
  }

  // Hero stack
  const stackSelectors = [
    '.seat-1 .stack', '.my-stack .value', '[class*="hero"] .chips',
    '.my-chips', '#player-chips', '.player-stack .value',
    '.chip-count', '.stack .amount', '.chip-stack-display',
  ];
  let heroStack = 1000.0;
  for (const sel of stackSelectors) {
    const text = queryText(sel);
    if (text) { heroStack = parseCurrency(text); break; }
  }

  return {
    table_id: tableId,
    site_name: site,
    url: location.href,
    hero_cards: heroCards,
    community_cards: communityCards,
    pot_size: potSize,
    hero_stack: heroStack,
    hero_bet: 0.0,
    is_hero_turn: isHeroTurn,
    phase,
    buttons_visible: buttonsVisible,
    screenshot_b64: null, // filled in by OCR fallback when DOM fails
  };
}

// ── Action execution ──

function executeAction(action, amount) {
  console.log(`[PokerBot Bridge] Executing action: ${action} (${amount})`);

  if (action === 'check') {
    // Check = no action, or click check button if visible
    const checkBtn = findButton('check');
    if (checkBtn) { checkBtn.click(); }
    return;
  }

  const btn = findButton(action);
  if (!btn) {
    console.warn(`[PokerBot Bridge] Button not found for action: ${action}`);
    return;
  }

  // If raising with an amount, try to set the bet input first
  if (action === 'raise' && amount > 0) {
    const betInputs = [
      '.bet-input input', '.raise-input input', '[class*="bet"] input',
      'input.bet-amount', '#bet-amount', '.bet-amount input',
      '.raise-amount input', 'input[type="number"]',
      '.bet-input', '.raise-input',
    ];
    for (const sel of betInputs) {
      const input = document.querySelector(sel);
      if (input && input.offsetWidth > 0) {
        input.value = amount;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }
    }
  }

  btn.click();
  console.log(`[PokerBot Bridge] Clicked ${action} button`);
}

// ── Message handler (from background) ──

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_ACTION') {
    const { action, amount } = message.payload;
    executeAction(action, amount);
    sendResponse({ ok: true });
  }
});

// ── State push loop ──

const tableId = makeTableId();
let registered = false;

function pushState() {
  const state = readTableState();
  chrome.runtime.sendMessage({
    type: 'TABLE_STATE',
    payload: { tableId, state },
  }).catch(() => {}); // background might not be ready yet
}

// Register this table with background
chrome.runtime.sendMessage({
  type: 'REGISTER_TABLE',
  payload: { tableId, url: location.href },
}).then(() => {
  registered = true;
});

// Push state on interval
setInterval(pushState, SCAN_INTERVAL_MS);

// Also push on URL change (SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    pushState();
  }
}).observe(document.body || document.documentElement, {
  childList: true, subtree: true,
});

console.log(`[PokerBot Bridge] Content script active on ${detectSite()} — table: ${tableId}`);
