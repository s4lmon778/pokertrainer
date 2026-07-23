// ── PokerBot Bridge — Background Service Worker ──
// Relays table state from content scripts to the Tauri desktop app
// via the local HTTP bridge, and relays actions back.

const BRIDGE_PORTS = [19876, 19877, 19878, 19879, 19880, 19881, 19882, 19883, 19884, 19885, 19886];
const POLL_INTERVAL_MS = 600; // poll /action every 600ms
const STATE_INTERVAL_MS = 800; // push /state every 800ms

let bridgePort = null;
let tableStates = new Map(); // table_id → last BrowserTableState
let pollTimers = new Map();  // table_id → setInterval handle

// ── Bridge discovery ──

async function discoverBridge() {
  for (const port of BRIDGE_PORTS) {
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(500) });
      if (resp.ok) {
        bridgePort = port;
        console.log(`[PokerBot Bridge] Connected to Tauri bridge on port ${port}`);
        return port;
      }
    } catch {
      // try next port
    }
  }
  // Retry every 5s if not found
  setTimeout(discoverBridge, 5000);
  return null;
}

async function ensureBridge() {
  if (bridgePort) return bridgePort;
  return await discoverBridge();
}

// ── Messages from content script ──

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TABLE_STATE') {
    handleTableState(message.payload, sender.tab?.id);
  } else if (message.type === 'REGISTER_TABLE') {
    handleRegisterTable(message.payload);
    sendResponse({ ok: true });
  } else if (message.type === 'UNREGISTER_TABLE') {
    handleUnregisterTable(message.payload.tableId);
    sendResponse({ ok: true });
  }
});

async function handleTableState(payload, tabId) {
  const { tableId, state } = payload;
  const port = await ensureBridge();
  if (!port) return;

  // Store latest state
  tableStates.set(tableId, { state, tabId, timestamp: Date.now() });

  // POST state to bridge (non-blocking)
  try {
    await fetch(`http://127.0.0.1:${port}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: tableId, state }),
      signal: AbortSignal.timeout(1000),
    });
  } catch {
    // Bridge might be restarting — will retry next cycle
  }
}

// ── Table registration ──

function handleRegisterTable(payload) {
  const { tableId } = payload;

  // Already registered?
  if (pollTimers.has(tableId)) return;

  // Start polling for actions
  const timer = setInterval(() => pollActions(tableId), POLL_INTERVAL_MS);
  pollTimers.set(tableId, timer);

  console.log(`[PokerBot Bridge] Registered table: ${tableId}`);
}

function handleUnregisterTable(tableId) {
  const timer = pollTimers.get(tableId);
  if (timer) {
    clearInterval(timer);
    pollTimers.delete(tableId);
  }
  tableStates.delete(tableId);
  console.log(`[PokerBot Bridge] Unregistered table: ${tableId}`);
}

// ── Poll for bot actions ──

async function pollActions(tableId) {
  const port = bridgePort;
  if (!port) return;

  try {
    const resp = await fetch(`http://127.0.0.1:${port}/action?table_id=${encodeURIComponent(tableId)}`, {
      signal: AbortSignal.timeout(1000),
    });
    const data = await resp.json();

    if (data.pending && data.action !== 'none') {
      const entry = tableStates.get(tableId);
      if (!entry) return;

      // Send action to content script for execution
      chrome.tabs.sendMessage(entry.tabId, {
        type: 'EXECUTE_ACTION',
        payload: { action: data.action, amount: data.amount },
      });
    }
  } catch {
    // OK — will retry
  }
}

// ── Startup ──

discoverBridge();

console.log('[PokerBot Bridge] Background service worker started');
