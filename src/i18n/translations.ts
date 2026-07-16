/**
 * Internationalization (i18n) translation structure.
 *
 * All user-facing strings are centralized here to enable future
 * multi-language support. To add a new language:
 * 1. Add a new key to the `Translations` type
 * 2. Create a translations object for the language
 * 3. Register it in the `translations` map
 *
 * Currently only English is implemented. This structure is designed
 * to be compatible with react-i18next or a custom lightweight hook.
 */

export type SupportedLocale = 'en';

export interface Translations {
  // App header
  appTitle: string;
  appSubtitle: string;
  quitGame: string;

  // Tabs
  tabPlay: string;
  tabStats: string;
  tabRules: string;
  tabAbout: string;
  tabSettings: string;

  // Game status bar
  handLabel: string;
  blindsLabel: string;
  phaseLabel: string;
  autoPlayLabel: string;
  keysLabel: string;
  rebuyLabel: string;
  bankrollLabel: string;
  nextHand: string;

  // Landing page
  landingTitle: string;
  landingSubtitle: string;
  startPlaying: string;
  quickTips: string;

  // Player controls
  fold: string;
  call: string;
  check: string;
  raise: string;
  allIn: string;
  yourTurn: string;
  waiting: string;
  acting: string;
  toCallLabel: string;
  winRateLabel: string;
  raiseAmount: string;
  minLabel: string;
  maxLabel: string;
  potLabel: string;

  // Poker table
  potLabel_table: string;
  sidePotLabel: string;
  dealerLabel: string;
  smallBlindLabel: string;
  bigBlindLabel: string;
  trainingBotLabel: string;
  youWin: string;
  wins: string;

  // Stats
  totalHands: string;
  winRate: string;
  roi: string;
  biggestWin: string;
  biggestLoss: string;
  bankroll: string;
  botPerformance: string;
  positionStats: string;
  handStrengthStats: string;

  // Rules
  rulesTitle: string;
  rulesDescription: string;
  handRankings: string;
  startingHands: string;
  bettingRounds: string;
  actions: string;

  // Settings
  settingsTitle: string;
  trainingBot: string;
  opponentBots: string;
  tableSettings: string;
  displaySettings: string;

  // Error
  errorTitle: string;
  errorMessage: string;
  retry: string;
  dismissError: string;
  reloadPage: string;

  // Coach tips
  coachTip_title: string;

  // Shortcuts modal
  shortcutsTitle: string;
  shortcutsDescription: string;

  // Common
  loading: string;
  probability: string;
  score: string;
  confidence: string;
  profit: string;
  netChange: string;
}

const en: Translations = {
  appTitle: 'PokerTrainer',
  appSubtitle: 'PRACTICE & TRAIN YOUR BOT',
  quitGame: 'Quit',

  tabPlay: 'Play',
  tabStats: 'Stats',
  tabRules: 'Rules',
  tabAbout: 'About',
  tabSettings: 'Settings',

  handLabel: 'Hand',
  blindsLabel: 'Blinds',
  phaseLabel: 'Phase',
  autoPlayLabel: 'AUTO',
  keysLabel: 'KEYS',
  rebuyLabel: 'Rebuy:',
  bankrollLabel: 'Bankroll',
  nextHand: 'Next Hand',

  landingTitle: 'PokerTrainer',
  landingSubtitle: 'Practice Texas Hold\'em against AI opponents. Train your custom bot, track stats, sharpen your game.',
  startPlaying: 'Start Playing',
  quickTips: 'Quick Tips',

  fold: 'Fold',
  call: 'Call',
  check: 'Check',
  raise: 'Raise',
  allIn: 'All In',
  yourTurn: 'Your Turn',
  waiting: 'Waiting',
  acting: 'Acting...',
  toCallLabel: 'To Call',
  winRateLabel: 'Win Rate',
  raiseAmount: 'Raise Amount',
  minLabel: 'Min',
  maxLabel: 'Max',
  potLabel: 'Pot',

  potLabel_table: 'Pot',
  sidePotLabel: 'Side',
  dealerLabel: 'D',
  smallBlindLabel: 'SB',
  bigBlindLabel: 'BB',
  trainingBotLabel: 'TRAIN',
  youWin: 'You Win!',
  wins: 'Wins',

  totalHands: 'Total Hands',
  winRate: 'Win Rate',
  roi: 'ROI',
  biggestWin: 'Biggest Win',
  biggestLoss: 'Biggest Loss',
  bankroll: 'Bankroll',
  botPerformance: 'Bot Performance',
  positionStats: 'Position Stats',
  handStrengthStats: 'Hand Strength',

  rulesTitle: "Texas Hold'em Rules",
  rulesDescription: 'Each player gets 2 hole cards. 5 community cards are dealt: Flop (3), Turn (1), River (1). Make the best 5-card hand from any combination of your 2 hole cards and the 5 community cards.',
  handRankings: 'Hand Rankings Chart',
  startingHands: 'Preflop Starting Hands',
  bettingRounds: 'Betting Rounds',
  actions: 'Actions',

  settingsTitle: 'Settings',
  trainingBot: 'Training Bot',
  opponentBots: 'Opponent Bots',
  tableSettings: 'Table Settings',
  displaySettings: 'Display',

  errorTitle: 'Something Went Wrong',
  errorMessage: 'An unexpected error occurred. Your game state and statistics have been preserved.',
  retry: 'Recover',
  dismissError: 'Dismiss Error',
  reloadPage: 'Reload Page',

  coachTip_title: 'Coach Tip',

  shortcutsTitle: 'Keyboard Shortcuts',
  shortcutsDescription: 'Shortcuts only work when it\'s your turn and no input is focused.',

  loading: 'Loading...',
  probability: 'probability',
  score: 'Score',
  confidence: 'confidence',
  profit: 'Profit',
  netChange: 'Net Change',
};

export const translations: Record<SupportedLocale, Translations> = {
  en,
};

/**
 * Get the current locale's translations.
 * Currently always returns English. In the future, this could read from
 * a Zustand store, browser preference, or URL parameter.
 */
export function getTranslations(): Translations {
  // Future: detect locale from navigator.language, URL, or store
  return en;
}

/**
 * Hook-friendly way to get translations.
 * Usage: const { t } = useTranslation();
 * Then: <span>{t('fold')}</span>
 */
export function useTranslation() {
  return { t: getTranslations(), locale: 'en' as SupportedLocale };
}
