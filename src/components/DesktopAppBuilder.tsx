/**
 * DesktopAppBuilder Component
 * 
 * UI for checking GitHub Releases and building the Tauri desktop app.
 */

import React, { useState, useCallback } from 'react';
import { Download, Package, AlertCircle, CheckCircle, Loader2, ExternalLink, Terminal } from 'lucide-react';
import { checkLatestRelease, downloadDesktopApp, getBuildInstructions } from '../utils/desktopAppBuilder';

// Direct link to the latest release
const LATEST_RELEASE_URL = 'https://github.com/s4lmon778/pokertrainer/releases/tag/v1.0.0';
const WINDOWS_INSTALLER_URL = 'https://github.com/s4lmon778/pokertrainer/releases/download/v1.0.0/PokerTrainer_1.0.0_x64-setup.exe';

const DesktopAppBuilder: React.FC = () => {
  const [releaseInfo, setReleaseInfo] = useState<{ tag: string; url: string; assetName: string } | null>({
    tag: 'v1.0.0',
    url: WINDOWS_INSTALLER_URL,
    assetName: 'PokerTrainer_1.0.0_x64-setup.exe',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  /**
   * Check for latest release (refreshes from GitHub).
   */
  const handleCheckRelease = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await checkLatestRelease();
      
      if (result.url) {
        setReleaseInfo({
          tag: result.tag,
          url: result.url,
          assetName: result.assetName,
        });
      } else {
        setError(result.error || 'No release found');
      }
    } catch {
      setError('Failed to check for releases');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Download the desktop app.
   */
  const handleDownload = useCallback(async () => {
    if (releaseInfo?.url) {
      window.open(releaseInfo.url, '_blank', 'noopener,noreferrer');
    } else {
      setError('No installer available');
    }
  }, [releaseInfo]);

  /**
   * Open GitHub releases page.
   */
  const openGitHubReleases = useCallback(() => {
    window.open(LATEST_RELEASE_URL, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div className="bg-surface rounded-2xl border border-white/10 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-gold" />
          <div>
            <h3 className="text-lg font-bold text-text-primary">Desktop App</h3>
            <p className="text-xs text-text-secondary/60">
              Standalone Tauri desktop application for autonomous poker play
            </p>
          </div>
        </div>
        
        <button
          onClick={handleCheckRelease}
          disabled={loading}
          className="btn-secondary flex items-center gap-1.5 text-sm"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ExternalLink size={14} />
          )}
          Refresh Release
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg p-3">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Release Found */}
      {releaseInfo && (
        <div className="bg-black/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-text-secondary/60">Latest release:</span>
              <span className="text-gold font-bold ml-2">{releaseInfo.tag}</span>
            </div>
            <CheckCircle size={16} className="text-green-400" />
          </div>
          
          <div className="text-xs text-text-secondary/60">
            {releaseInfo.assetName}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <Download size={14} />
              Download Installer
            </button>
            
            <button
              onClick={openGitHubReleases}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <ExternalLink size={14} />
              View on GitHub
            </button>
          </div>
        </div>
      )}

      {/* Build Instructions */}
      <div>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="btn-secondary flex items-center gap-1.5 text-sm w-full justify-center"
        >
          <Terminal size={14} />
          {showInstructions ? 'Hide' : 'Show'} Build Instructions
        </button>
        
        {showInstructions && (
          <div className="mt-2 bg-black/20 rounded-lg p-4 text-xs font-mono text-text-secondary/70 whitespace-pre-wrap">
            {getBuildInstructions()}
          </div>
        )}
      </div>

      {/* Status */}
      {!releaseInfo && !error && (
        <div className="text-center py-4 text-text-secondary/40 text-sm">
          Click "Refresh Release" to find the latest desktop app
        </div>
      )}
    </div>
  );
};

export default DesktopAppBuilder;
