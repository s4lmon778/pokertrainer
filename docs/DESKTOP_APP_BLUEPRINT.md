# Training Bot Desktop App — Design Blueprint

## Vision

The Training Bot Desktop App is a standalone downloadable application that shares the same poker engine as the web application. It enables users to play against a configurable AI opponent on real online poker sites, with coaching, analysis, and learning features.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Training Bot Desktop App                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 Presentation Layer                   │    │
│  │  • React Desktop UI (Tauri/Electron)                │    │
│  │  • Settings Dashboard                                │    │
│  │  • Session Viewer                                    │    │
│  │  • Hand Replay                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 Core Engine Layer                    │    │
│  │  • poker-engine (shared npm package)                 │    │
│  │  • strategy-module (GTO, exploitative, adaptive)     │    │
│  │  • equity-calculator                                 │    │
│  │  • hand-evaluator                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Desktop-Specific Modules                │    │
│  │  • screen-capture (OCR card recognition)             │    │
│  │  • input-simulator (mouse/keyboard)                  │    │
│  │  • multi-table-orchestrator                          │    │
│  │  • session-recorder                                  │    │
│  │  • coaching-engine                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Recommended: Tauri (not Electron)
- **Rust backend** for screen capture and input simulation
- **React frontend** for UI (shares code with web app)
- **Smaller binary** (~5MB vs ~150MB for Electron)
- **Better performance** for desktop operations
- **Native OS integration** (macOS, Windows, Linux)

### Alternative: Electron
- Larger but more mature ecosystem
- Better documentation for screen capture
- More npm packages available

## Desktop-Specific Modules

### 1. Screen Capture Module (`src/desktop/screenCapture.ts`)

```typescript
/**
 * Captures the poker table area and extracts:
 * - Player positions and names
 * - Hole cards (via OCR or image recognition)
 * - Community cards
 * - Chip counts
 * - Current pot size
 * - Betting actions
 * - Timer information
 */

interface TableSnapshot {
  /** The poker client being monitored */
  client: string; // 'winpoker', 'pokerstars', 'ggpoker', etc.
  /** Detected table stakes */
  stakes: string;
  /** Detected number of players */
  playerCount: number;
  /** Player states at the table */
  players: PlayerState[];
  /** Community cards on the table */
  communityCards: Card[];
  /** Current pot size */
  potSize: number;
  /** Current betting round */
  currentPhase: GamePhase;
  /** Whose turn is it */
  currentPlayerIndex: number;
  /** Timer countdown */
  timerSeconds: number;
}

interface PlayerState {
  seatIndex: number;
  name: string;
  chips: number;
  holeCards?: Card[]; // If we can read them
  isHero: boolean;
  lastAction?: string;
  lastActionAmount?: number;
}

/**
 * Initialize screen capture for a given poker client
 */
function initScreenCapture(client: string): Promise<void>;

/**
 * Take a snapshot of the current table state
 */
function captureTable(): Promise<TableSnapshot>;

/**
 * Stop screen capture
 */
function stopScreenCapture(): void;
```

### 2. Input Simulator Module (`src/desktop/inputSimulator.ts`)

```typescript
/**
 * Simulates mouse clicks and keyboard presses on the poker client.
 * This is how the bot "plays" — by controlling the mouse and keyboard.
 */

interface MousePosition {
  x: number;
  y: number;
}

/**
 * Click at screen coordinates
 */
function click(x: number, y: number, button?: 'left' | 'right'): Promise<void>;

/**
 * Type a key or key combination
 */
function typeKey(keys: string[]): Promise<void>;

/**
 * Move mouse to position with natural human-like motion
 */
function moveMouse(natural: boolean, targetX: number, targetY: number): Promise<void>;

/**
 * Execute a poker action (fold, call, raise, all-in)
 * Maps abstract actions to screen coordinates for the specific client
 */
function executeAction(action: PokerAction, client: string): Promise<void>;

/**
 * Place a bet using the slider
 */
function placeBet(amount: number, client: string): Promise<void>;
```

### 3. Multi-Table Orchestrator (`src/desktop/multiTable.ts`)

```typescript
/**
 * Manages multiple poker tables simultaneously.
 * Each table runs an independent engine instance.
 */

interface TableSession {
  tableId: string;
  client: string;
  stakes: string;
  engine: PokerEngine; // Independent engine instance
  status: 'idle' | 'playing' | 'paused' | 'error';
  lastActionTime: number;
}

class MultiTableOrchestrator {
  /** Start playing on N tables simultaneously */
  start(tableConfigs: TableConfig[]): Promise<void>;
  
  /** Pause all tables */
  pauseAll(): void;
  
  /** Resume all tables */
  resumeAll(): void;
  
  /** Stop all tables and clean up */
  stopAll(): Promise<void>;
  
  /** Get status of all tables */
  getStatus(): TableStatus[];
  
  /** Process actions in order (handles simultaneous turns) */
  processActions(actions: Action[]): Promise<void>;
}
```

### 4. Session Recorder (`src/desktop/sessionRecorder.ts`)

```typescript
/**
 * Records complete poker sessions for later analysis.
 */

interface SessionRecord {
  sessionId: string;
  startTime: number;
  endTime: number;
  client: string;
  stakes: string;
  tables: number;
  hands: HandRecord[];
  results: SessionResults;
}

interface HandRecord {
  handId: string;
  timestamp: number;
  heroSeat: number;
  holeCards: Card[];
  communityCards: Card[];
  actions: ActionRecord[];
  result: 'won' | 'lost' | 'pushed';
  amount: number;
  mistakes: MistakeRecord[];
  gtoComparison?: GtoComparison;
}
```

### 5. Coaching Engine (`src/desktop/coachingEngine.ts`)

```typescript
/**
 * Analyzes hands in real-time and provides coaching feedback.
 */

interface CoachingFeedback {
  handId: string;
  decisionPoint: number;
  actionTaken: string;
  gtoRecommended: string;
  evLoss: number; // How much EV lost by not playing GTO
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  explanation: string;
  suggestion: string;
}

class CoachingEngine {
  /** Analyze a hand and return coaching feedback */
  analyze(hand: HandRecord): CoachingFeedback[];
  
  /** Generate a session summary */
  summarize(session: SessionRecord): SessionSummary;
  
  /** Track progress over time */
  trackProgress(userId: string): ProgressReport;
}
```

## Installation & Distribution

### Build Targets
- **macOS**: .dmg installer (Apple Silicon + Intel)
- **Windows**: .exe installer (NSIS)
- **Linux**: .AppImage + .deb

### Code Signing
- macOS: Apple Developer Certificate
- Windows: Code signing certificate
- Linux: GPG signature

### Auto-Updates
- Tauri: Built-in update mechanism
- Electron: Squirrel/electron-updater

## Security & Ethics

### Important Considerations

1. **Terms of Service**: Many poker sites prohibit automated play. The Training Bot should include:
   - Clear warnings about ToS violations
   - Option to disable desktop automation features
   - Web-only mode for training (no automation)

2. **Privacy**: Screen capture reads data from other applications:
   - No data stored about other users
   - Local processing only
   - Clear privacy policy

3. **Responsible Use**: 
   - Built-in session time limits
   - Loss limits
   - Break reminders
   - Self-exclusion options

## Development Roadmap

### Phase 1: Foundation (Months 1-2)
- [ ] Set up Tauri project structure
- [ ] Share engine code via npm workspace
- [ ] Build desktop settings UI
- [ ] Implement basic screen capture

### Phase 2: Core Features (Months 3-4)
- [ ] Card recognition (OCR)
- [ ] Input simulation
- [ ] Single-table play
- [ ] Session recording

### Phase 3: Advanced Features (Months 5-6)
- [ ] Multi-table support
- [ ] Coaching engine
- [ ] Hand analysis tools
- [ ] Solver integration

### Phase 4: Polish (Months 7-8)
- [ ] UI/UX refinement
- [ ] Performance optimization
- [ ] Bug fixing
- [ ] Documentation
- [ ] Beta testing

### Phase 5: Release (Month 9+)
- [ ] Code signing
- [ ] Installer packages
- [ ] Auto-update system
- [ ] Public release

## Shared Code Strategy

### npm Workspace Approach
```
pokertrainer/
├── packages/
│   ├── poker-engine/        # Shared engine (npm package)
│   │   ├── src/
│   │   │   ├── deck.ts
│   │   │   ├── handEvaluator.ts
│   │   │   ├── botEngine.ts
│   │   │   └── trainingBot.ts
│   │   └── package.json
│   ├── web-app/             # Current React web app
│   │   └── src/
│   └── desktop-app/         # Future Tauri desktop app
│       └── src/
├── package.json
└── turbo.json               # Turborepo for monorepo management
```

### Benefits
- Single source of truth for poker logic
- Desktop app gets engine updates automatically
- Web app and desktop app stay in sync
- Easier testing (unit tests run against shared engine)

## Future Enhancements

### AI/ML Integration
- Neural network for hand evaluation
- Reinforcement learning for strategy improvement
- Pattern recognition for opponent profiling

### Cloud Features
- Cloud hand database
- Community strategy sharing
- Remote solver access
- Multi-user training rooms

### Advanced CV
- Real-time card recognition
- Chip counting via computer vision
- Face detection for player reads
- Table layout detection

## Conclusion

The Training Bot Desktop App represents the natural evolution of this project — from a web-based poker trainer to a comprehensive poker learning platform with real-world application. The shared engine architecture ensures that improvements to the web app benefit the desktop app and vice versa.

The most critical first step is setting up the Tauri project and sharing the engine code via npm workspaces. Everything else builds on that foundation.
