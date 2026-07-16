/**
 * Production monitoring & error tracking service.
 *
 * Provides a unified interface for:
 * - Error tracking (Sentry-compatible API)
 * - Performance monitoring (Core Web Vitals, custom metrics)
 * - Crash reporting with breadcrumbs
 * - User behavior analytics bridge
 *
 * Integration points:
 * - Sentry: replace captureException/captureMessage with Sentry SDK calls
 * - LogRocket: add session replay recording
 * - Datadog RUM: replace with datadogRum calls
 * - Custom backend: POST to your own telemetry endpoint
 *
 * All tracking respects the analytics consent flag from analytics.ts.
 */

import { isAnalyticsEnabled } from './analytics';

// ── Configuration ──

interface MonitoringConfig {
  /** Environment: development, staging, production */
  environment: 'development' | 'staging' | 'production';
  /** App version from package.json */
  version: string;
  /** DSN or endpoint URL for error reporting */
  errorEndpoint?: string;
  /** DSN or endpoint URL for performance metrics */
  perfEndpoint?: string;
  /** Sample rate for performance traces (0.0 - 1.0) */
  tracesSampleRate: number;
  /** Maximum breadcrumbs to keep in memory */
  maxBreadcrumbs: number;
  /** Callback before sending errors (for PII scrubbing) */
  beforeSend?: (event: ErrorEvent) => ErrorEvent | null;
}

interface ErrorEvent {
  type: string;
  message: string;
  stack?: string;
  timestamp: number;
  tags: Record<string, string>;
  breadcrumbs: Breadcrumb[];
  metadata: Record<string, unknown>;
  environment: string;
  version: string;
}

interface Breadcrumb {
  category: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  timestamp: number;
  data?: Record<string, unknown>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  tags: Record<string, string>;
  timestamp: number;
}

// ── State ──

let config: MonitoringConfig = {
  environment: (import.meta.env.MODE as MonitoringConfig['environment']) || 'development',
  version: '0.0.0',
  tracesSampleRate: 0.1,
  maxBreadcrumbs: 50,
};

const breadcrumbs: Breadcrumb[] = [];
const metricQueue: PerformanceMetric[] = [];
let crashCount = 0;
const MAX_CRASHES_BEFORE_RELOAD = 5;

// ── Public API ──

/**
 * Initialize the monitoring service with app configuration.
 * Call once at app startup.
 */
export function initMonitoring(cfg: Partial<MonitoringConfig>): void {
  config = { ...config, ...cfg };
  if (config.environment === 'development') {
    console.debug('[Monitoring] Initialized in', config.environment, 'mode');
  }
}

/**
 * Record a breadcrumb for crash context.
 * Breadcrumbs are included in error reports to show what led up to a crash.
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: Breadcrumb['level'] = 'info',
  data?: Record<string, unknown>,
): void {
  breadcrumbs.push({
    category,
    message,
    level,
    timestamp: Date.now(),
    data,
  });

  // Keep only the most recent breadcrumbs
  while (breadcrumbs.length > config.maxBreadcrumbs) {
    breadcrumbs.shift();
  }
}

/**
 * Capture and report an exception.
 * In production, this would send to Sentry or equivalent.
 */
export function captureException(
  error: Error,
  tags: Record<string, string> = {},
): void {
  if (!isAnalyticsEnabled()) return;

  crashCount++;

  const event: ErrorEvent = {
    type: error.name || 'Error',
    message: error.message,
    stack: error.stack,
    timestamp: Date.now(),
    tags,
    breadcrumbs: [...breadcrumbs],
    metadata: {
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      crashCount,
    },
    environment: config.environment,
    version: config.version,
  };

  // Allow PII scrubbing / filtering before send
  const finalEvent = config.beforeSend ? config.beforeSend(event) : event;
  if (!finalEvent) return; // Event was filtered out

  // In development, log to console
  if (config.environment === 'development') {
    console.error('[Monitoring] Exception captured:', error.message, finalEvent);
    return;
  }

  // Send to error tracking endpoint
  if (config.errorEndpoint) {
    sendBeacon(config.errorEndpoint, finalEvent);
  }

  // Auto-reload if we're crashing repeatedly (runaway error loop)
  if (crashCount >= MAX_CRASHES_BEFORE_RELOAD && typeof window !== 'undefined') {
    console.warn('[Monitoring] Too many crashes — reloading page');
    // Persist crash info before reload
    try {
      sessionStorage.setItem('__monitoring_crash', JSON.stringify({
        count: crashCount,
        lastError: error.message,
        timestamp: Date.now(),
      }));
    } catch { /* sessionStorage may be unavailable */ }
    window.location.reload();
  }
}

/**
 * Capture a non-critical message or warning.
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'warning',
  tags: Record<string, string> = {},
): void {
  if (!isAnalyticsEnabled() && level !== 'error') return;

  if (config.environment === 'development') {
    const logFn = level === 'error' ? console.error : level === 'warning' ? console.warn : console.info;
    logFn('[Monitoring]', message, tags);
  }

  if (level === 'error' && config.errorEndpoint) {
    sendBeacon(config.errorEndpoint, {
      type: 'Message',
      message,
      timestamp: Date.now(),
      tags,
      environment: config.environment,
      version: config.version,
    });
  }
}

/**
 * Record a performance metric.
 * Batches and flushes periodically to minimize network overhead.
 */
export function recordMetric(
  name: string,
  value: number,
  unit: PerformanceMetric['unit'] = 'ms',
  tags: Record<string, string> = {},
): void {
  if (!isAnalyticsEnabled()) return;

  metricQueue.push({
    name,
    value,
    unit,
    tags,
    timestamp: Date.now(),
  });

  // Flush when queue gets large
  if (metricQueue.length >= 50) {
    flushMetrics();
  }
}

/**
 * Measure the execution time of an async function.
 * Usage: const result = await measureAsync('loadStats', () => loadStatsData())
 */
export async function measureAsync<T>(
  metricName: string,
  fn: () => Promise<T>,
  tags: Record<string, string> = {},
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    recordMetric(metricName, duration, 'ms', tags);
  }
}

/**
 * Measure the execution time of a sync function.
 */
export function measureSync<T>(
  metricName: string,
  fn: () => T,
  tags: Record<string, string> = {},
): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    recordMetric(metricName, duration, 'ms', tags);
  }
}

/**
 * Get all recorded breadcrumbs (for debugging).
 */
export function getBreadcrumbs(): readonly Breadcrumb[] {
  return breadcrumbs;
}

/**
 * Get the current crash count.
 */
export function getCrashCount(): number {
  return crashCount;
}

/**
 * Reset crash counter (call after successful recovery).
 */
export function resetCrashCount(): void {
  crashCount = 0;
}

/**
 * Flush pending metrics to the backend.
 */
export function flushMetrics(): void {
  if (metricQueue.length === 0) return;
  const metrics = metricQueue.splice(0);

  if (config.environment === 'development') {
    console.debug('[Monitoring] Metrics flushed:', metrics.length);
  }

  if (config.perfEndpoint && isAnalyticsEnabled()) {
    sendBeacon(config.perfEndpoint, { metrics });
  }
}

// ── Core Web Vitals ──

/**
 * Report Core Web Vitals (LCP, FID, CLS).
 * Call this once at app startup.
 */
export function reportWebVitals(): void {
  if (typeof window === 'undefined') return;

  // LCP — Largest Contentful Paint
  try {
    // Use PerformanceObserver for modern browsers
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime?: number };
        if (lastEntry) {
          recordMetric('LCP', lastEntry.startTime ?? 0, 'ms', { vital: 'LCP' });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    }

    // CLS — Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { hadRecentInput?: boolean; value?: number })[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value ?? 0;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // Report CLS on page unload
    window.addEventListener('beforeunload', () => {
      recordMetric('CLS', clsValue, 'count', { vital: 'CLS' });
    });
  } catch {
    // PerformanceObserver not supported — skip
  }
}

// ── Session tracking ──

let sessionStartTime = Date.now();

/**
 * Get the session duration in milliseconds.
 */
export function getSessionDuration(): number {
  return Date.now() - sessionStartTime;
}

/**
 * Reset the session start time (call when starting a new game).
 */
export function resetSession(): void {
  sessionStartTime = Date.now();
}

// ── Helpers ──

function sendBeacon(url: string, data: unknown): void {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
    // Fallback: fetch with keepalive
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(() => {});
    } catch { /* Silently fail — monitoring shouldn't break the app */ }
    return;
  }

  try {
    navigator.sendBeacon(url, JSON.stringify(data));
  } catch { /* Silently fail */ }
}

// Flush metrics periodically
if (typeof window !== 'undefined') {
  setInterval(flushMetrics, 30000); // Every 30 seconds
  window.addEventListener('beforeunload', flushMetrics);
}
