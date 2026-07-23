// ── PokerBot Bridge — Popup ──

const bridgeDot = document.getElementById('bridgeDot');
const bridgeStatus = document.getElementById('bridgeStatus');
const tableDot = document.getElementById('tableDot');
const tableStatus = document.getElementById('tableStatus');
const siteName = document.getElementById('siteName');
const forceScanBtn = document.getElementById('forceScanBtn');

async function checkBridge() {
  for (const port of [19876, 19877, 19878, 19879, 19880, 19881, 19882, 19883, 19884, 19885, 19886]) {
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(300) });
      if (resp.ok) {
        bridgeDot.className = 'dot green';
        bridgeStatus.textContent = `Connected (port ${port})`;
        return;
      }
    } catch {}
  }
  bridgeDot.className = 'dot red';
  bridgeStatus.textContent = 'Desktop app not found';
}

async function checkTable() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const url = (tab.url || '').toLowerCase();
    const knownSites = ['ggpoker', 'ignitioncasino', 'bovada', 'coinpoker', 'americascardroom', 'acr', 'pokerstars'];

    const found = knownSites.find(s => url.includes(s));
    if (found) {
      tableDot.className = 'dot green';
      tableStatus.textContent = 'Poker table detected';
      siteName.textContent = found;
    } else {
      tableDot.className = 'dot yellow';
      tableStatus.textContent = 'Not a known poker site';
      siteName.textContent = url ? new URL(url).hostname : '—';
    }
  } catch {
    tableDot.className = 'dot red';
    tableStatus.textContent = 'Cannot access tab';
  }
}

forceScanBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'EXECUTE_ACTION', payload: { action: 'none', amount: 0 } }).catch(() => {});
    }
  } catch {}
});

checkBridge();
checkTable();
