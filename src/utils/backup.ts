/**
 * Data backup, export, and import service.
 *
 * PokerTrainer stores all game data in localStorage via Zustand persist.
 * This module adds:
 * - Export: Download game data as a JSON file
 * - Import: Upload and restore game data from a JSON file
 * - Auto-backup: Periodic localStorage snapshots
 * - Backup verification: Validate imported data structure
 * - Size tracking: Monitor storage usage
 *
 * Backup strategy:
 * - Primary: Zustand persist middleware (automatic, per-change)
 * - Secondary: Manual export (user-initiated, downloads JSON file)
 * - Tertiary: Auto-backup snapshots (periodic, in localStorage)
 */

import { sanitizeString } from './sanitize';

// ── Types ──

export interface BackupData {
  /** Schema version for forward compatibility */
  version: 1;
  /** ISO timestamp of when backup was created */
  exportedAt: string;
  /** App version at time of backup */
  appVersion: string;
  /** The actual game data (matches Zustand persist structure) */
  data: Record<string, unknown>;
  /** Human-readable summary for preview */
  summary: BackupSummary;
}

export interface BackupSummary {
  totalHands: number;
  winRate: number;
  currentBankroll: number;
  gameHistoryCount: number;
  statsAvailable: boolean;
}

export interface ImportResult {
  success: boolean;
  error?: string;
  summary?: BackupSummary;
}

// ── Constants ──

const BACKUP_STORAGE_KEY = 'pokertrainer_backup_snapshot';
const AUTO_BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_SNAPSHOT_AGE = 24 * 60 * 60 * 1000; // 24 hours
const MAX_STORAGE_SIZE = 4.5 * 1024 * 1024; // 4.5MB warning threshold (localStorage ~5MB limit)

// ── Export ──

/**
 * Export game data as a downloadable JSON file.
 * Prompts the browser to download the file.
 *
 * @returns The backup data object (also triggers download)
 */
export function exportData(): BackupData | null {
  try {
    const storeData = readStoreData();
    const summary = generateSummary(storeData);

    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      appVersion: getAppVersion(),
      data: storeData,
      summary,
    };

    // Trigger download
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pokertrainer-backup-${formatDate(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return backup;
  } catch (err) {
    console.error('[Backup] Export failed:', err);
    return null;
  }
}

/**
 * Export data as a JSON string (for programmatic use).
 */
export function exportDataAsString(): string | null {
  try {
    const storeData = readStoreData();
    const summary = generateSummary(storeData);
    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      appVersion: getAppVersion(),
      data: storeData,
      summary,
    };
    return JSON.stringify(backup);
  } catch (err) {
    console.error('[Backup] Export to string failed:', err);
    return null;
  }
}

// ── Import ──

/**
 * Import game data from a JSON file.
 * Validates the structure before applying.
 *
 * @param file - The uploaded JSON file
 * @returns Result with success status and optional summary
 */
export async function importData(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    return importDataFromString(text);
  } catch (err) {
    return { success: false, error: `Failed to read file: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

/**
 * Import game data from a JSON string.
 */
export function importDataFromString(jsonString: string): ImportResult {
  try {
    const parsed = JSON.parse(jsonString);

    // Validate backup structure
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid backup file: not a JSON object' };
    }

    if (!parsed.version || typeof parsed.version !== 'number') {
      return { success: false, error: 'Invalid backup file: missing version field' };
    }

    if (!parsed.data || typeof parsed.data !== 'object') {
      return { success: false, error: 'Invalid backup file: missing data field' };
    }

    // Validate essential data keys exist
    const requiredKeys = ['state'];
    const missing = requiredKeys.filter(k => !(k in parsed.data));
    if (missing.length > 0) {
      return { success: false, error: `Invalid backup data: missing keys: ${missing.join(', ')}` };
    }

    // Validate state structure
    const state = parsed.data.state;
    if (!state || typeof state !== 'object') {
      return { success: false, error: 'Invalid backup: state is missing or not an object' };
    }

    // Validate critical fields
    if (state.currentBankroll !== undefined && typeof state.currentBankroll !== 'number') {
      return { success: false, error: 'Invalid backup: currentBankroll is not a number' };
    }

    // Sanitize and write to localStorage
    const sanitizedData = sanitizeImportData(parsed);
    const storeKey = 'pokerbot-arena-storage';

    // Create backup of current data before overwriting
    const currentData = localStorage.getItem(storeKey);
    if (currentData) {
      try {
        localStorage.setItem(`${storeKey}_pre_import_backup`, currentData);
      } catch { /* Non-critical */ }
    }

    // Write new data
    localStorage.setItem(storeKey, JSON.stringify(sanitizedData));

    // Update auto-backup snapshot
    saveAutoBackup();

    // Generate summary
    const stateData = (sanitizedData.state as Record<string, unknown> | undefined) ?? {};
    const summary = generateSummary(stateData as Record<string, unknown>);

    return { success: true, summary };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { success: false, error: 'Invalid JSON format in backup file' };
    }
    return { success: false, error: `Import failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

// ── Auto-Backup ──

/**
 * Save an automatic backup snapshot to localStorage.
 * Called periodically and on significant state changes.
 */
export function saveAutoBackup(): void {
  try {
    const storeData = readStoreData();
    const snapshot = {
      timestamp: Date.now(),
      data: storeData,
    };
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('[Backup] Auto-backup failed:', err);
  }
}

/**
 * Restore from the most recent auto-backup snapshot.
 *
 * @returns true if a backup was found and restored
 */
export function restoreAutoBackup(): boolean {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return false;

    const snapshot = JSON.parse(raw);
    if (!snapshot.timestamp || !snapshot.data) return false;

    // Check if snapshot is too old
    const age = Date.now() - snapshot.timestamp;
    if (age > MAX_SNAPSHOT_AGE) {
      console.warn('[Backup] Snapshot too old (', Math.round(age / 3600000), 'hours), skipping');
      return false;
    }

    const storeKey = 'pokerbot-arena-storage';
    localStorage.setItem(storeKey, JSON.stringify(snapshot.data));
    return true;
  } catch (err) {
    console.error('[Backup] Restore failed:', err);
    return false;
  }
}

/**
 * Get the age of the most recent auto-backup in milliseconds.
 * Returns -1 if no backup exists.
 */
export function getAutoBackupAge(): number {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return -1;
    const snapshot = JSON.parse(raw);
    return Date.now() - snapshot.timestamp;
  } catch {
    return -1;
  }
}

// ── Storage Monitoring ──

/**
 * Check localStorage usage and return a warning if near capacity.
 *
 * @returns Object with size info and warning flag
 */
export function checkStorageUsage(): { usedBytes: number; percentUsed: number; warning: boolean } {
  try {
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalBytes += (key.length + (localStorage.getItem(key)?.length || 0)) * 2; // UTF-16
      }
    }

    const percentUsed = (totalBytes / MAX_STORAGE_SIZE) * 100;
    const warning = totalBytes > MAX_STORAGE_SIZE;

    return {
      usedBytes: totalBytes,
      percentUsed: Math.round(percentUsed * 100) / 100,
      warning,
    };
  } catch {
    return { usedBytes: 0, percentUsed: 0, warning: false };
  }
}

/**
 * Clear all PokerTrainer data from localStorage.
 * WARNING: This is destructive. Export first!
 */
export function clearAllData(): boolean {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('pokerbot') || key.startsWith('pokertrainer'))) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}

// ── Helpers ──

function readStoreData(): Record<string, unknown> {
  const storeKey = 'pokerbot-arena-storage';
  try {
    const raw = localStorage.getItem(storeKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed || {};
  } catch {
    return {};
  }
}

function generateSummary(data: Record<string, unknown>): BackupSummary {
  const state = (data.state || data) as Record<string, unknown>;

  return {
    totalHands: (state.stats as Record<string, number>)?.totalHands ?? 0,
    winRate: Math.round(((state.stats as Record<string, number>)?.winRate ?? 0) * 100) / 100,
    currentBankroll: (state.currentBankroll as number) ?? 0,
    gameHistoryCount: Array.isArray(state.gameHistory) ? state.gameHistory.length : 0,
    statsAvailable: !!state.stats,
  };
}

function getAppVersion(): string {
  // Try to read from a global that Vite exposes, or fall back
  return '1.0.0';
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sanitizeImportData(data: Record<string, unknown>): Record<string, unknown> {
  // Deep sanitize string values in the import data
  const sanitized = JSON.parse(JSON.stringify(data));
  sanitizeObject(sanitized);
  return sanitized;
}

function sanitizeObject(obj: unknown, depth = 0): void {
  if (depth > 20 || !obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'string') {
        obj[i] = sanitizeString(obj[i] as string);
      } else if (typeof obj[i] === 'object') {
        sanitizeObject(obj[i], depth + 1);
      }
    }
  } else {
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const val = (obj as Record<string, unknown>)[key];
      if (typeof val === 'string') {
        (obj as Record<string, unknown>)[key] = sanitizeString(val);
      } else if (typeof val === 'object') {
        sanitizeObject(val, depth + 1);
      }
    }
  }
}

// ── Auto-backup timer ──

if (typeof window !== 'undefined') {
  // Save auto-backup every 5 minutes
  setInterval(saveAutoBackup, AUTO_BACKUP_INTERVAL);

  // Also save on page unload
  window.addEventListener('beforeunload', saveAutoBackup);

  // Save when the tab becomes hidden (user switches away)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      saveAutoBackup();
    }
  });
}
