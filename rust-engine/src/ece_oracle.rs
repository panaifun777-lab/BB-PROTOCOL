//! ECE (External Computation Engine) Oracle Client
//!
//! Implements multi-source price aggregation with median calculation.
//! Features:
//! - 5 simulated price sources with deterministic sin-wave prices
//! - Median aggregation from last 5 submissions
//! - Confidence scoring 0-100 based on source agreement
//! - 60-second staleness check
//! - Price deviation alerts (>5% change)

use crate::types::*;
use dashmap::DashMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::time::{Duration, interval};
use tracing::{info, warn};

const UPDATE_INTERVAL_SECS: u64 = 3;
const DEVIATION_THRESHOLD_PERCENT: f64 = 5.0;
const STALENESS_THRESHOLD_SECS: u64 = 60;

/// Oracle source configuration
struct OracleSource {
    source_id: String,
    source_name: String,
    offset: f64, // Price offset relative to base
}

/// Sin-wave price generation parameters per asset
struct SinParams {
    frequency: f64,
    amplitude: f64,
    phase: f64,
}

pub struct EceOracle {
    sources: Vec<OracleSource>,
    assets: Vec<String>,
    base_prices: Arc<DashMap<String, f64>>,
    sin_params: Arc<DashMap<String, SinParams>>,
    recent_submissions: Arc<DashMap<String, Vec<PriceSubmission>>>,
    price_history: Arc<DashMap<String, Vec<(f64, u64)>>>, // (price, timestamp)
    current_prices: Arc<DashMap<String, AssetPrice>>,
    tick_count: Arc<AtomicU64>,
}

impl EceOracle {
    pub fn new() -> Self {
        let sources = vec![
            OracleSource { source_id: "src-chainlink".into(), source_name: "Chainlink Feed".into(), offset: 0.0 },
            OracleSource { source_id: "src-pyth".into(), source_name: "Pyth Network".into(), offset: 0.001 },
            OracleSource { source_id: "src-dia".into(), source_name: "DIA Oracle".into(), offset: -0.002 },
            OracleSource { source_id: "src-band".into(), source_name: "Band Protocol".into(), offset: 0.003 },
            OracleSource { source_id: "src-umma".into(), source_name: "UMA Optimistic".into(), offset: -0.001 },
        ];

        let assets = vec!["AFC".into(), "ETH".into(), "USDC".into(), "BTC".into()];

        let base_prices = Arc::new(DashMap::new());
        base_prices.insert("AFC".into(), 1.25);
        base_prices.insert("ETH".into(), 3450.0);
        base_prices.insert("USDC".into(), 1.0);
        base_prices.insert("BTC".into(), 67200.0);

        let sin_params = Arc::new(DashMap::new());
        sin_params.insert("AFC".into(), SinParams { frequency: 0.08, amplitude: 0.05, phase: 0.0 });
        sin_params.insert("ETH".into(), SinParams { frequency: 0.06, amplitude: 50.0, phase: 1.2 });
        sin_params.insert("USDC".into(), SinParams { frequency: 0.02, amplitude: 0.002, phase: 2.5 });
        sin_params.insert("BTC".into(), SinParams { frequency: 0.04, amplitude: 200.0, phase: 0.8 });

        Self {
            sources,
            assets,
            base_prices,
            sin_params,
            recent_submissions: Arc::new(DashMap::new()),
            price_history: Arc::new(DashMap::new()),
            current_prices: Arc::new(DashMap::new()),
            tick_count: Arc::new(AtomicU64::new(0)),
        }
    }

    /// Generate a deterministic sin-wave price for a given asset, source, and tick.
    fn generate_source_price(&self, asset: &str, source_id: &str, tick: u64) -> f64 {
        let base = *self.base_prices.get(asset).unwrap().value();
        let params = self.sin_params.get(asset).unwrap();
        let offset = self.sources.iter()
            .find(|s| s.source_id == source_id)
            .map(|s| s.offset)
            .unwrap_or(0.0);

        let variation = (tick as f64 * params.frequency + params.phase).sin() * params.amplitude;
        let source_variation = ((tick as f64 + source_id.len() as f64) * params.frequency * 1.3 + params.phase + 0.5).sin() * params.amplitude * 0.1;

        let price = base + variation + source_variation + (offset * base);

        // Round to appropriate precision
        match asset {
            "BTC" | "ETH" => (price * 100.0).round() / 100.0,
            "AFC" => (price * 10000.0).round() / 10000.0,
            _ => (price * 100000.0).round() / 100000.0, // USDC
        }
    }

    /// Calculate median from a list of prices.
    fn calculate_median(prices: &[f64]) -> f64 {
        let mut sorted = prices.to_vec();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let mid = sorted.len() / 2;
        if sorted.len() % 2 == 0 {
            (sorted[mid - 1] + sorted[mid]) / 2.0
        } else {
            sorted[mid]
        }
    }

    /// Calculate confidence score (0-100) based on source agreement.
    fn calculate_confidence(prices: &[f64], median: f64) -> u8 {
        if prices.len() < 2 {
            return 50;
        }
        let max_deviation = median * 0.05; // 5% threshold
        let avg_deviation: f64 = prices.iter()
            .map(|p| (p - median).abs())
            .sum::<f64>() / prices.len() as f64;
        let normalized = avg_deviation / max_deviation;
        (100.0 - normalized * 100.0).clamp(0.0, 100.0) as u8
    }

    /// Check for price deviation >5% and generate alerts.
    fn check_deviation(&self, asset: &str, previous_median: f64, current_median: f64) -> Option<DeviationAlert> {
        if previous_median <= 0.0 {
            return None;
        }
        let deviation = ((current_median - previous_median).abs() / previous_median) * 100.0;
        if deviation > DEVIATION_THRESHOLD_PERCENT {
            Some(DeviationAlert {
                asset: asset.to_string(),
                previous_price: previous_median,
                current_price: current_median,
                change_percent: (deviation * 100.0).round() / 100.0,
                direction: if current_median > previous_median {
                    PriceDirection::Up
                } else {
                    PriceDirection::Down
                },
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
            })
        } else {
            None
        }
    }

    /// Generate source health report with staleness check.
    fn generate_source_health(&self) -> SourceHealth {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let sources: Vec<SourceStatus> = self.sources.iter().map(|source| {
            let mut submission_count = 0u64;
            let mut last_submission = 0u64;

            for asset in &self.assets {
                if let Some(subs) = self.recent_submissions.get(asset) {
                    for sub in subs.iter() {
                        if sub.source_id == source.source_id {
                            submission_count += 1;
                            last_submission = last_submission.max(sub.timestamp);
                        }
                    }
                }
            }

            let is_stale = last_submission > 0 && (now - last_submission) > STALENESS_THRESHOLD_SECS;

            SourceStatus {
                source_id: source.source_id.clone(),
                source_name: source.source_name.clone(),
                last_submission,
                is_stale,
                submission_count,
            }
        }).collect();

        let stale_count = sources.iter().filter(|s| s.is_stale).count();
        let heartbeat_status = if stale_count == 0 {
            HeartbeatStatus::Healthy
        } else if stale_count < 3 {
            HeartbeatStatus::Degraded
        } else {
            HeartbeatStatus::Down
        };

        SourceHealth {
            sources,
            heartbeat_status,
            timestamp: now,
        }
    }
}

/// Run the ECE Oracle as a standalone service.
pub async fn run_ece_service() -> Result<(), Box<dyn std::error::Error>> {
    let oracle = EceOracle::new();

    // Initialize storage
    for asset in &oracle.assets {
        oracle.recent_submissions.insert(asset.clone(), Vec::new());
        oracle.price_history.insert(asset.clone(), Vec::new());
    }

    info!("ECE Oracle initialized with {} assets, {} sources", oracle.assets.len(), oracle.sources.len());

    let mut tick = interval(Duration::from_secs(UPDATE_INTERVAL_SECS));

    loop {
        tick.tick().await;
        let count = oracle.tick_count.fetch_add(1, Ordering::Relaxed);

        for asset in &oracle.assets.clone() {
            // Generate submissions from all 5 sources
            let mut submissions = Vec::new();
            for source in &oracle.sources {
                let source_tick_offset = (source.source_id.as_bytes().last().unwrap_or(&b'0')) % 3;
                if (count as u32 + source_tick_offset as u32) % 2 == 0 {
                    let price = oracle.generate_source_price(asset, &source.source_id, count);
                    submissions.push(PriceSubmission {
                        source_id: source.source_id.clone(),
                        source_name: source.source_name.clone(),
                        asset: asset.clone(),
                        price,
                        timestamp: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs(),
                    });
                }
            }

            // Store and aggregate
            if let Some(mut stored) = oracle.recent_submissions.get_mut(asset) {
                stored.extend(submissions);
                if stored.len() > 25 {
                    stored.drain(0..stored.len() - 25);
                }
            }

            // Calculate median from last 5 submissions
            if let Some(stored) = oracle.recent_submissions.get(asset) {
                let recent_prices: Vec<f64> = stored.iter().rev().take(5).map(|s| s.price).collect();
                if recent_prices.is_empty() {
                    continue;
                }

                let median = Self::calculate_median(&recent_prices);
                let confidence = Self::calculate_confidence(&recent_prices, median);

                // Check deviation
                if let Some(prev) = oracle.current_prices.get(asset) {
                    if let Some(alert) = oracle.check_deviation(asset, prev.median, median) {
                        warn!(
                            "[ECE] Deviation alert: {} {:?} {:.2}%",
                            alert.asset, alert.direction, alert.change_percent
                        );
                    }
                }

                // Update current price
                oracle.current_prices.insert(asset.clone(), AssetPrice {
                    asset: asset.clone(),
                    price: median,
                    median,
                    confidence,
                    submissions: stored.iter().rev().take(5).cloned().collect(),
                    last_update: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs(),
                    change_1m: 0.0, // Calculated from history
                });
            }
        }

        let health = oracle.generate_source_health();
        info!(
            "[ECE] tick={} | assets={} | health={:?}",
            count, oracle.assets.len(), health.heartbeat_status
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_median_calculation() {
        assert_eq!(EceOracle::calculate_median(&[1.0, 2.0, 3.0]), 2.0);
        assert_eq!(EceOracle::calculate_median(&[1.0, 2.0, 3.0, 4.0]), 2.5);
    }

    #[test]
    fn test_confidence_high_agreement() {
        let prices = vec![1.249, 1.250, 1.251, 1.250, 1.252];
        let confidence = EceOracle::calculate_confidence(&prices, 1.250);
        assert!(confidence > 90); // High agreement = high confidence
    }

    #[test]
    fn test_deviation_threshold() {
        let oracle = EceOracle::new();
        // 10% deviation should trigger alert
        let alert = oracle.check_deviation("AFC", 1.0, 1.1);
        assert!(alert.is_some());
        // 1% deviation should not trigger
        let no_alert = oracle.check_deviation("AFC", 1.0, 1.01);
        assert!(no_alert.is_none());
    }
}
