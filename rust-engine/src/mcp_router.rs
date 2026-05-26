//! MCP (Model Context Protocol) Router
//!
//! Implements request routing with weighted provider selection.
//! Features:
//! - 3 providers: CognitionCore, NeuralPath, SynapticLink
//! - Routing: latency(40%) + stake(30%) + reputation(30%)
//! - Request/response simulation
//! - Provider slashing simulation
//! - Leaderboard ranking

use crate::types::*;
use dashmap::DashMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::time::{Duration, interval};
use tracing::{info, warn};

const LEADERBOARD_INTERVAL_SECS: u64 = 7;
const SLASH_PERCENTAGE: f64 = 0.05; // 5% stake slash
const SLASH_THRESHOLD: u32 = 5; // Slash after 5 failures
const SLASH_COOLDOWN_SECS: u64 = 30;

/// Task types for routing
const TASK_TYPES: &[&str] = &[
    "cognition_inference",
    "skill_execution",
    "data_aggregation",
    "model_training",
    "response_generation",
];

/// Provider configuration
struct ProviderConfig {
    provider_id: String,
    name: String,
    stake: u64,
    latency_score: u8,
    reputation: u8,
}

const PROVIDER_CONFIGS: [ProviderConfig; 3] = [
    ProviderConfig {
        provider_id: String::new(), // Placeholder - will be constructed in new()
        name: String::new(),
        stake: 0,
        latency_score: 0,
        reputation: 0,
    },
    ProviderConfig {
        provider_id: String::new(),
        name: String::new(),
        stake: 0,
        latency_score: 0,
        reputation: 0,
    },
    ProviderConfig {
        provider_id: String::new(),
        name: String::new(),
        stake: 0,
        latency_score: 0,
        reputation: 0,
    },
];

pub struct McpRouter {
    providers: Arc<DashMap<String, Provider>>,
    recent_requests: Arc<tokio::sync::Mutex<Vec<RoutedRequest>>>,
    recent_slashings: Arc<tokio::sync::Mutex<Vec<ProviderSlashing>>>,
    tick_count: Arc<AtomicU64>,
    request_counter: Arc<AtomicU64>,
}

impl McpRouter {
    pub fn new() -> Self {
        let providers = Arc::new(DashMap::new());

        // Initialize 3 providers
        let configs = [
            ("provider-cognition-core", "CognitionCore", 50000u64, 85u8, 92u8),
            ("provider-neural-path", "NeuralPath", 35000u64, 78u8, 88u8),
            ("provider-synaptic-link", "SynapticLink", 25000u64, 72u8, 75u8),
        ];

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        for (id, name, stake, latency, reputation) in &configs {
            providers.insert((*id).to_string(), Provider {
                provider_id: (*id).to_string(),
                name: (*name).to_string(),
                stake: *stake,
                latency_score: *latency,
                reputation: *reputation,
                total_requests: 0,
                successful_requests: 0,
                failed_requests: 0,
                is_slashed: false,
                slash_count: 0,
                registered_at: now,
            });
        }

        Self {
            providers,
            recent_requests: Arc::new(tokio::sync::Mutex::new(Vec::new())),
            recent_slashings: Arc::new(tokio::sync::Mutex::new(Vec::new())),
            tick_count: Arc::new(AtomicU64::new(0)),
            request_counter: Arc::new(AtomicU64::new(0)),
        }
    }

    /// Calculate composite score: latency(40%) + stake(30%) + reputation(30%).
    pub fn calculate_composite_score(provider: &Provider) -> f64 {
        let stake_weight = (provider.stake as f64 / 50000.0).min(1.0) * 100.0;
        let composite = provider.latency_score as f64 * 0.4
            + stake_weight * 0.3
            + provider.reputation as f64 * 0.3;
        (composite * 100.0).round() / 100.0
    }

    /// Select a provider based on composite score with deterministic rotation.
    pub fn select_provider(&self, tick: u64) -> Option<Provider> {
        let active: Vec<Provider> = self.providers.iter()
            .filter(|e| !e.value().is_slashed)
            .map(|e| e.value().clone())
            .collect();

        if active.is_empty() {
            return None;
        }

        // Sort by composite score descending
        let mut scored: Vec<(Provider, f64)> = active.into_iter()
            .map(|p| {
                let score = Self::calculate_composite_score(&p);
                (p, score)
            })
            .collect();
        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        // Deterministic rotation based on tick
        let index = (tick as usize) % scored.len();
        Some(scored[index].0.clone())
    }

    /// Generate leaderboard from current provider state.
    pub fn get_leaderboard(&self) -> Vec<LeaderboardEntry> {
        let mut entries: Vec<LeaderboardEntry> = self.providers.iter()
            .map(|e| {
                let p = e.value();
                let composite = Self::calculate_composite_score(p);
                let success_rate = if p.total_requests > 0 {
                    ((p.successful_requests as f64 / p.total_requests as f64) * 100.0) as u8
                } else {
                    0
                };
                let stake_weight = ((p.stake as f64 / 50000.0).min(1.0) * 100.0) as u8;

                LeaderboardEntry {
                    rank: 0,
                    provider_id: p.provider_id.clone(),
                    name: p.name.clone(),
                    composite_score: composite,
                    latency_score: p.latency_score,
                    stake_weight,
                    reputation: p.reputation,
                    total_requests: p.total_requests,
                    success_rate,
                }
            })
            .collect();

        entries.sort_by(|a, b| b.composite_score.partial_cmp(&a.composite_score).unwrap());
        for (i, entry) in entries.iter_mut().enumerate() {
            entry.rank = i + 1;
        }

        entries
    }

    /// Update provider scores with sin-wave variation.
    pub fn update_provider_scores(&self, tick: u64) {
        let original_stakes: Vec<(String, u64)> = vec![
            ("provider-cognition-core".into(), 50000),
            ("provider-neural-path".into(), 35000),
            ("provider-synaptic-link".into(), 25000),
        ];

        for (id, original_stake) in &original_stakes {
            if let Some(mut provider) = self.providers.get_mut(id) {
                // Sin-wave latency fluctuation
                let wave = (tick as f64 * 0.15 + id.len() as f64).sin() * 3.0;
                let new_latency = (provider.latency_score as f64 + wave).clamp(50.0, 100.0);
                provider.latency_score = new_latency.round() as u8;

                // Slow stake recovery
                if !provider.is_slashed && provider.stake < *original_stake {
                    provider.stake = (*original_stake).min(provider.stake + 10);
                }
            }
        }
    }
}

/// Run the MCP Router as a standalone service.
pub async fn run_mcp_service() -> Result<(), Box<dyn std::error::Error>> {
    let router = McpRouter::new();

    info!(
        "MCP Router initialized with {} providers, {} task types",
        router.providers.len(),
        TASK_TYPES.len()
    );

    let mut tick = interval(Duration::from_secs(LEADERBOARD_INTERVAL_SECS));

    loop {
        tick.tick().await;
        let count = router.tick_count.fetch_add(1, Ordering::Relaxed);
        let req_count = router.request_counter.fetch_add(1, Ordering::Relaxed) + 1;

        // Route a request
        let task_type = TASK_TYPES[(count as usize) % TASK_TYPES.len()];
        if let Some(provider) = router.select_provider(count) {
            let request_id = format!("req-{:05}", req_count);

            info!(
                "[MCP] Request routed: {} → {} ({})",
                request_id, provider.name, task_type
            );

            // Simulate response
            let response_delay = 1000 + (100 - provider.latency_score as i64) * 20;

            // Deterministic quality check
            let quality_threshold = provider.reputation as f64 / 100.0;
            let sin_val = (req_count as f64 * 0.3).sin();
            let is_valid = sin_val > -0.9 || quality_threshold > 0.7;

            if is_valid {
                if let Some(mut p) = router.providers.get_mut(&provider.provider_id) {
                    p.total_requests += 1;
                    p.successful_requests += 1;
                    p.reputation = (p.reputation as f64 + 0.1).min(100.0) as u8;
                }
            } else {
                if let Some(mut p) = router.providers.get_mut(&provider.provider_id) {
                    p.total_requests += 1;
                    p.failed_requests += 1;

                    // Provider slashing: 5% stake
                    let slash_amount = (p.stake as f64 * SLASH_PERCENTAGE) as u64;
                    p.stake = p.stake.saturating_sub(slash_amount);
                    p.reputation = p.reputation.saturating_sub(5);
                    p.slash_count += 1;

                    if p.slash_count > SLASH_THRESHOLD {
                        p.is_slashed = true;
                        warn!("[MCP] Provider {} slashed due to {} failures", p.name, p.slash_count);
                    }

                    let slashing = ProviderSlashing {
                        provider_id: p.provider_id.clone(),
                        provider_name: p.name.clone(),
                        reason: format!("Invalid response for task {}", task_type),
                        slash_amount,
                        timestamp: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs(),
                    };

                    let mut slashings = router.recent_slashings.lock().await;
                    slashings.push(slashing);
                    if slashings.len() > 10 {
                        slashings.remove(0);
                    }
                }
            }
        }

        // Update provider scores with sin-wave (every 3 ticks)
        if count % 3 == 0 {
            router.update_provider_scores(count);
        }

        // Broadcast leaderboard every tick (7s)
        let leaderboard = router.get_leaderboard();
        let lb_str: Vec<String> = leaderboard.iter()
            .map(|l| format!("#{} {}({:.1})", l.rank, l.name, l.composite_score))
            .collect();
        info!("[MCP] Leaderboard: {}", lb_str.join(" | "));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_composite_score_weights() {
        // Perfect provider: latency=100, stake=50000(100%), reputation=100
        let perfect = Provider {
            provider_id: "test".into(),
            name: "Test".into(),
            stake: 50000,
            latency_score: 100,
            reputation: 100,
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            is_slashed: false,
            slash_count: 0,
            registered_at: 0,
        };
        let score = McpRouter::calculate_composite_score(&perfect);
        // 100*0.4 + 100*0.3 + 100*0.3 = 100.0
        assert_eq!(score, 100.0);
    }

    #[test]
    fn test_slash_percentage() {
        assert!((SLASH_PERCENTAGE - 0.05).abs() < 0.001);
    }

    #[test]
    fn test_slash_threshold() {
        assert_eq!(SLASH_THRESHOLD, 5);
    }

    #[test]
    fn test_routing_weights() {
        // Verify weight distribution: latency=40%, stake=30%, reputation=30%
        let provider = Provider {
            provider_id: "test".into(),
            name: "Test".into(),
            stake: 25000, // 50% of max
            latency_score: 80,
            reputation: 90,
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            is_slashed: false,
            slash_count: 0,
            registered_at: 0,
        };
        let score = McpRouter::calculate_composite_score(&provider);
        // 80*0.4 + 50*0.3 + 90*0.3 = 32 + 15 + 27 = 74.0
        assert_eq!(score, 74.0);
    }
}
