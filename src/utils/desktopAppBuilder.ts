/**
 * Desktop App Builder & Downloader
 * 
 * Features:
 * 1. Check for latest GitHub Release
 * 2. Download Tauri desktop installer
 * 3. Show build instructions
 */

// GitHub repo config
const GITHUB_REPO = 's4lmon778/pokertrainer';
const RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

/**
 * Interface for GitHub release asset.
 */
export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  updated_at: string;
}

/**
 * Interface for GitHub release.
 */
export interface GitHubRelease {
  tag_name: string;
  published_at: string;
  assets: GitHubReleaseAsset[];
  body: string;
}

/**
 * Check for latest GitHub release and return installer URL.
 */
export async function checkLatestRelease(): Promise<{
  tag: string;
  url: string | null;
  assetName: string;
  error?: string;
}> {
  try {
    const response = await fetch(RELEASES_URL);
    if (!response.ok) {
      return {
        tag: '',
        url: null,
        assetName: '',
        error: `GitHub API returned ${response.status}`,
      };
    }
    
    const release: GitHubRelease = await response.json();
    const tag = release.tag_name;
    
    // Find Windows installer
    const asset = release.assets.find(a => a.name.toLowerCase().includes('.exe'));
    
    if (!asset) {
      return { tag, url: null, assetName: '', error: 'No Windows installer found in release' };
    }
    
    return { tag, url: asset.browser_download_url, assetName: asset.name };
  } catch (error) {
    return {
      tag: '',
      url: null,
      assetName: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download the latest desktop app from GitHub Releases.
 */
export async function downloadDesktopApp(): Promise<{
  success: boolean;
  url: string | null;
  error?: string;
}> {
  const result = await checkLatestRelease();
  
  if (result.error) {
    return { success: false, url: null, error: result.error };
  }
  
  if (!result.url) {
    return { success: false, url: null, error: 'No installer available' };
  }
  
  // Open download in new tab
  window.open(result.url, '_blank', 'noopener,noreferrer');
  
  return { success: true, url: result.url };
}

/**
 * Get build instructions.
 */
export function getBuildInstructions(): string {
  return `To build the desktop app:

1. Install Rust: https://rustup.rs/
2. Install Tauri CLI: cargo install tauri-cli --version "^2"
3. Navigate to packages/desktop/
4. Run: cargo tauri build

Output: packages/desktop/src-tauri/target/release/bundle/windows/PokerTrainer_*.exe`;
}
