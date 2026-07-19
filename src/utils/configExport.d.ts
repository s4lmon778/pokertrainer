/**
 * Config Export/Import — Download and load Training Bot configurations
 *
 * Enables users to:
 * - Download their bot config as a JSON file
 * - Import configs from files (share with friends, version control)
 * - Export configs for the standalone desktop app
 */
import type { TrainingBotConfig } from '../engine/trainingBot';
/**
 * Export config as a downloadable JSON file.
 * Triggers a browser download with the config filename.
 */
export declare function downloadConfig(config: TrainingBotConfig, filename?: string): void;
/**
 * Import config from a JSON file.
 * Returns the parsed config or null if invalid.
 */
export declare function importConfig(file: File): Promise<TrainingBotConfig | null>;
/**
 * Export config as a JSON string (for clipboard, API, etc.)
 */
export declare function exportConfigJson(config: TrainingBotConfig): string;
/**
 * Parse config from a JSON string.
 * Throws if invalid.
 */
export declare function parseConfigJson(json: string): TrainingBotConfig;
/**
 * Generate a config summary for display.
 */
export declare function configSummary(config: TrainingBotConfig): string;
//# sourceMappingURL=configExport.d.ts.map