use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// DOM selectors and layout params for a known poker site.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SiteConfig {
    /// Human-readable name (e.g. "GGPoker")
    pub name: String,
    /// URL patterns that match this site (e.g. "ggpoker.com", "ggpoker.net")
    pub url_patterns: Vec<String>,
    /// CSS selectors for hero hole cards
    pub hero_cards: CardSelectors,
    /// CSS selectors for community cards
    pub community_cards: CommunityCardSelectors,
    /// CSS selectors for action buttons
    pub buttons: ButtonSelectors,
    /// CSS selector for pot size display
    pub pot_display: String,
    /// CSS selector for hero stack display
    pub hero_stack: String,
    /// CSS selectors for phase detection (preflop indicator elements)
    pub phase_indicators: PhaseSelectors,
    /// CSS selector for the "hero turn" indicator (e.g. glowing border, timer)
    pub hero_turn_indicator: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CardSelectors {
    /// Selector for hero hole card containers (list matched, indexed)
    pub container: String,
    /// How to extract rank from a card element (attribute name or "textContent")
    pub rank_attr: String,
    /// How to extract suit from a card element
    pub suit_attr: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommunityCardSelectors {
    /// Selector for community card containers
    pub container: String,
    pub rank_attr: String,
    pub suit_attr: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ButtonSelectors {
    /// Selector for the fold button (or empty string if not directly accessible)
    pub fold: String,
    pub call: String,
    pub raise: String,
    pub all_in: String,
    pub check: String,
    /// Selector for the bet amount input field
    pub bet_input: String,
    /// Selector for the bet slider (range input, optional)
    pub bet_slider: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PhaseSelectors {
    /// Selector for community card area — used to count visible cards
    pub community_area: String,
    /// Alternative: selectors visible only in specific phases
    pub flop_indicator: String,
    pub turn_indicator: String,
    pub river_indicator: String,
}

/// Registry of all known poker site configs.
pub struct SiteRegistry {
    sites: HashMap<String, SiteConfig>,
}

impl SiteRegistry {
    pub fn new() -> Self {
        let mut sites = HashMap::new();

        // ── GGPoker ──
        sites.insert("ggpoker".to_string(), SiteConfig {
            name: "GGPoker".to_string(),
            url_patterns: vec!["ggpoker.com".to_string(), "ggpoker.net".to_string(), "ggpoker".to_string()],
            hero_cards: CardSelectors {
                container: ".seat-1 .card, .player-card .card, [class*='hero'] .card, .my-card .card, .hole-card".to_string(),
                rank_attr: "class".to_string(),
                suit_attr: "class".to_string(),
            },
            community_cards: CommunityCardSelectors {
                container: ".community-cards .card, .board .card, [class*='community'] .card, .table-community .card".to_string(),
                rank_attr: "class".to_string(),
                suit_attr: "class".to_string(),
            },
            buttons: ButtonSelectors {
                fold: ".action-btn.fold, [data-action='fold'], button.fold, .btn-fold".to_string(),
                call: ".action-btn.call, [data-action='call'], button.call, .btn-call".to_string(),
                raise: ".action-btn.raise, [data-action='raise'], button.raise, .btn-raise".to_string(),
                all_in: ".action-btn.allin, [data-action='allin'], button.allin, .btn-allin".to_string(),
                check: ".action-btn.check, [data-action='check'], button.check, .btn-check".to_string(),
                bet_input: ".bet-input input, .raise-input input, [class*='bet'] input, input.bet-amount".to_string(),
                bet_slider: ".bet-slider input[type=range], .raise-slider".to_string(),
            },
            pot_display: ".pot-amount, .pot .value, [class*='pot'] .amount, .table-pot".to_string(),
            hero_stack: ".seat-1 .stack, .my-stack .value, [class*='hero'] .chips, .my-chips".to_string(),
            phase_indicators: PhaseSelectors {
                community_area: ".community-cards, .board, [class*='community']".to_string(),
                flop_indicator: ".community-cards .card:nth-child(1)".to_string(),
                turn_indicator: ".community-cards .card:nth-child(4)".to_string(),
                river_indicator: ".community-cards .card:nth-child(5)".to_string(),
            },
            hero_turn_indicator: ".turn-indicator.visible, .my-turn, [class*='hero-turn'], .time-bar.visible, .timer-visible".to_string(),
        });

        // ── Ignition / Bovada ──
        sites.insert("ignition".to_string(), SiteConfig {
            name: "Ignition / Bovada".to_string(),
            url_patterns: vec!["ignitioncasino.eu".to_string(), "bovada.lv".to_string(), "ignitioncasino".to_string(), "bovada".to_string()],
            hero_cards: CardSelectors {
                container: ".player-cards .card, .hand-cards .card, [class*='player-hand'] .card, .poker-card.face-up".to_string(),
                rank_attr: "class".to_string(),
                suit_attr: "class".to_string(),
            },
            community_cards: CommunityCardSelectors {
                container: ".community-cards .card, .board-cards .card, .table-cards .card, .poker-board .card".to_string(),
                rank_attr: "class".to_string(),
                suit_attr: "class".to_string(),
            },
            buttons: ButtonSelectors {
                fold: "#fold-button, .fold-button, [data-action='fold'], button:contains('Fold')".to_string(),
                call: "#call-button, .call-button, [data-action='call'], button:contains('Call')".to_string(),
                raise: "#raise-button, .raise-button, [data-action='raise'], button:contains('Raise')".to_string(),
                all_in: "#all-in-button, .all-in-button, [data-action='allin']".to_string(),
                check: "#check-button, .check-button, [data-action='check'], button:contains('Check')".to_string(),
                bet_input: "#bet-amount, .bet-amount input, .raise-amount input, input[type='number']".to_string(),
                bet_slider: "#bet-slider, .bet-slider input[type=range]".to_string(),
            },
            pot_display: "#pot-amount, .pot-amount, .pot .value".to_string(),
            hero_stack: "#player-chips, .player-stack .value, .chip-count".to_string(),
            phase_indicators: PhaseSelectors {
                community_area: ".community-cards, .board-cards".to_string(),
                flop_indicator: ".community-cards .card:nth-child(1)".to_string(),
                turn_indicator: ".community-cards .card:nth-child(4)".to_string(),
                river_indicator: ".community-cards .card:nth-child(5)".to_string(),
            },
            hero_turn_indicator: ".turn-timer.visible, .action-indicator.active, .player-active [class*='turn']".to_string(),
        });

        // ── CoinPoker ──
        sites.insert("coinpoker".to_string(), SiteConfig {
            name: "CoinPoker".to_string(),
            url_patterns: vec!["coinpoker.com".to_string(), "coinpoker".to_string()],
            hero_cards: CardSelectors {
                container: ".player-cards .card, .hand-cards .card, .hole-cards .card".to_string(),
                rank_attr: "class".to_string(),
                suit_attr: "class".to_string(),
            },
            community_cards: CommunityCardSelectors {
                container: ".community-cards .card, .board-cards .card, .table-cards .card".to_string(),
                rank_attr: "class".to_string(),
                suit_attr: "class".to_string(),
            },
            buttons: ButtonSelectors {
                fold: ".action-btn.fold, button[data-action='fold'], .fold-btn".to_string(),
                call: ".action-btn.call, button[data-action='call'], .call-btn".to_string(),
                raise: ".action-btn.raise, button[data-action='raise'], .raise-btn".to_string(),
                all_in: ".action-btn.allin, button[data-action='allin'], .allin-btn".to_string(),
                check: ".action-btn.check, button[data-action='check'], .check-btn".to_string(),
                bet_input: ".bet-input, .raise-input, input.bet-slider-value".to_string(),
                bet_slider: ".bet-slider input, input[type=range].bet".to_string(),
            },
            pot_display: ".pot-value, .pot .amount, .pot-display".to_string(),
            hero_stack: ".player-stack .value, .stack .amount, .chip-stack-display".to_string(),
            phase_indicators: PhaseSelectors {
                community_area: ".community-cards, .board-cards".to_string(),
                flop_indicator: ".community-cards .card:nth-child(1)".to_string(),
                turn_indicator: ".community-cards .card:nth-child(4)".to_string(),
                river_indicator: ".community-cards .card:nth-child(5)".to_string(),
            },
            hero_turn_indicator: ".turn-timer, .active-player [class*='turn'], .timebank-bar.visible".to_string(),
        });

        SiteRegistry { sites }
    }

    /// Look up a site config by URL match.
    #[allow(dead_code)]
    pub fn find_by_url(&self, url: &str) -> Option<&SiteConfig> {
        let lower = url.to_lowercase();
        self.sites.values().find(|cfg| {
            cfg.url_patterns.iter().any(|p| lower.contains(p.as_str()))
        })
    }

    /// Look up a site config by name.
    #[allow(dead_code)]
    pub fn find_by_name(&self, name: &str) -> Option<&SiteConfig> {
        self.sites.get(&name.to_lowercase())
    }

    /// All registered site names.
    #[allow(dead_code)]
    pub fn site_names(&self) -> Vec<&str> {
        self.sites.keys().map(|k| k.as_str()).collect()
    }

    /// Serialize all configs to send to the browser extension.
    pub fn to_json(&self) -> String {
        let configs: HashMap<&String, &SiteConfig> = self.sites.iter().collect();
        serde_json::to_string(&configs).unwrap_or_else(|_| "{}".to_string())
    }
}

impl Default for SiteRegistry {
    fn default() -> Self {
        Self::new()
    }
}
