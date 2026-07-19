/**
 * Config Export/Import — Download and load Training Bot configurations
 *
 * Enables users to:
 * - Download their bot config as a JSON file
 * - Import configs from files (share with friends, version control)
 * - Export configs for the standalone desktop app
 */
import { DEFAULT_TRAINING_CONFIG } from '../engine/trainingBot';
/**
 * Export config as a downloadable JSON file.
 * Triggers a browser download with the config filename.
 */
export function downloadConfig(config, filename) {
    const data = JSON.stringify(config, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `pokertrainer-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
/**
 * Import config from a JSON file.
 * Returns the parsed config or null if invalid.
 */
export async function importConfig(file) {
    try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        // Validate required fields
        const required = Object.keys(DEFAULT_TRAINING_CONFIG);
        for (const key of required) {
            if (!(key in parsed)) {
                console.warn(`Missing config field: ${key}, using default`);
            }
        }
        return { ...DEFAULT_TRAINING_CONFIG, ...parsed };
    }
    catch (err) {
        console.error('Failed to import config:', err);
        return null;
    }
}
/**
 * Export config as a JSON string (for clipboard, API, etc.)
 */
export function exportConfigJson(config) {
    return JSON.stringify(config, null, 2);
}
/**
 * Parse config from a JSON string.
 * Throws if invalid.
 */
export function parseConfigJson(json) {
    const parsed = JSON.parse(json);
    const required = Object.keys(DEFAULT_TRAINING_CONFIG);
    for (const key of required) {
        if (!(key in parsed)) {
            throw new Error(`Missing required config field: ${key}`);
        }
    }
    return { ...DEFAULT_TRAINING_CONFIG, ...parsed };
}
/**
 * Generate a config summary for display.
 */
export function configSummary(config) {
    return [
        `Skill Level: ${config.skillLevel}/100`,
        `Strategy: ${config.strategyMode}`,
        `Aggression: ${(config.aggression * 100).toFixed(0)}%`,
        `Bluff Freq: ${(config.bluffFrequency * 100).toFixed(0)}%`,
        `Hand Range: ${(config.startingHandRange * 100).toFixed(0)}%`,
        `Reaction: ${config.reactionTimeMin}-${config.reactionTimeMax}ms`,
    ].join(' | ');
}
//# sourceMappingURL=configExport.js.map