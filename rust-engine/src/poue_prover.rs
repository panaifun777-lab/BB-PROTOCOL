//! PoUE (Proof of Useful Execution) ZK Prover
//!
//! Implements zero-knowledge proof verification simulation.
//! Features:
//! - Proof queue with states: pending/verifying/verified/rejected
//! - Simulated ZK proof generation (deterministic, counter-based)
//! - Optimistic mode with 7-day challenge period
//! - Batch verification support
//! - Proof reward distribution

use crate::types::*;
use dashmap::DashMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::time::{Duration, interval};
use tracing::{info, warn};

const PROOF_INTERVAL_SECS: u64 = 8;
const CHALLENGE_PERIOD_DAYS: u64 = 7;
const QUALITY_THRESHOLD: u8 = 70;

/// Deterministic prover addresses
const PROVERS: &[&str] = &[
    "0xaa11...prover1",
    "0xbb22...prover2",
    "0xcc33...prover3",
];

/// Task types for proof generation
const TASK_TYPES: &[&str] = &[
    "cognition_update",
    "skill_execution",
    "delegation_proof",
    "revenue_verification",
    "circuit_check",
];

pub struct PoueProver {
    proofs: Arc<DashMap<String, ProofSubmission>>,
    recent_batches: Arc<tokio::sync::Mutex<Vec<BatchVerification>>>,
    recent_rewards: Arc<tokio::sync::Mutex<Vec<RewardDistribution>>>,
    proof_counter: Arc<AtomicU64>,
    batch_counter: Arc<AtomicU64>,
    tick_count: Arc<AtomicU64>,
}

impl PoueProver {
    pub fn new() -> Self {
        Self {
            proofs: Arc::new(DashMap::new()),
            recent_batches: Arc::new(tokio::sync::Mutex::new(Vec::new())),
            recent_rewards: Arc::new(tokio::sync::Mutex::new(Vec::new())),
            proof_counter: Arc::new(AtomicU64::new(0)),
            batch_counter: Arc::new(AtomicU64::new(0)),
            tick_count: Arc::new(AtomicU64::new(0)),
        }
    }

    /// Deterministic seeded value generation (no external randomness).
    fn seeded_value(seed: u64, min: f64, max: f64) -> f64 {
        let x = ((seed as f64 * 9301.0 + 49297.0).sin()) * 49297.0;
        let normalized = x - x.floor();
        min + normalized * (max - min)
    }

    /// Generate a unique proof ID.
    fn generate_proof_id(counter: u64) -> String {
        format!("proof-0x{:06x}", counter)
    }

    /// Generate a unique batch ID.
    fn generate_batch_id(counter: u64) -> String {
        format!("batch-{:04}", counter)
    }

    /// Submit a new proof to the queue.
    pub async fn submit_proof(&self) -> ProofSubmission {
        let count = self.proof_counter.fetch_add(1, Ordering::Relaxed) + 1;
        let proof_id = Self::generate_proof_id(count);
        let task_id = TASK_TYPES[(count as usize) % TASK_TYPES.len()].to_string();
        let prover = PROVERS[(count as usize) % PROVERS.len()].to_string();

        // Deterministic metrics based on counter
        let cpu_time = Self::seeded_value(count, 200.0, 5000.0) as u64;
        let memory_used = Self::seeded_value(count + 100, 50.0, 512.0) as u64;
        let quality_score = Self::seeded_value(count + 200, 60.0, 100.0) as u8;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let proof = ProofSubmission {
            proof_id: proof_id.clone(),
            task_id: task_id.clone(),
            prover: prover.clone(),
            status: ProofStatus::Pending,
            submitted_at: now,
            verified_at: None,
            challenge_deadline: None,
            cpu_time_ms: cpu_time,
            memory_used_mb: memory_used,
            quality_score,
            reward: 0.0,
        };

        self.proofs.insert(proof_id.clone(), proof.clone());

        info!(
            "[PoUE] Proof submitted: {} task: {} prover: {}",
            proof_id, task_id, prover
        );

        // Simulate verification lifecycle
        let proofs = self.proofs.clone();
        let recent_rewards = self.recent_rewards.clone();

        tokio::spawn(async move {
            // Move to verifying after 1 second
            tokio::time::sleep(Duration::from_secs(1)).await;
            if let Some(mut p) = proofs.get_mut(&proof_id) {
                p.status = ProofStatus::Verifying;
            }

            // Complete verification after deterministic delay (2-5s)
            let delay = Self::seeded_value(count + 300, 2000.0, 5000.0) as u64;
            tokio::time::sleep(Duration::from_millis(delay)).await;

            if let Some(mut p) = proofs.get_mut(&proof_id) {
                let passed = p.quality_score >= QUALITY_THRESHOLD;
                let verified_at = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs();

                if passed {
                    p.status = ProofStatus::Verified;
                    p.verified_at = Some(verified_at);
                    // 7-day challenge period (optimistic mode)
                    p.challenge_deadline = Some(verified_at + CHALLENGE_PERIOD_DAYS * 24 * 3600);
                    // Reward calculation
                    p.reward = ((p.quality_score as f64 * 0.1 + p.cpu_time_ms as f64 * 0.001) * 100.0).round() / 100.0;

                    // Distribute reward
                    let reward = RewardDistribution {
                        proof_id: proof_id.clone(),
                        prover: p.prover.clone(),
                        amount: p.reward,
                        token: "AFC".to_string(),
                        timestamp: verified_at,
                    };

                    let mut rewards = recent_rewards.lock().await;
                    rewards.push(reward);
                    if rewards.len() > 20 {
                        rewards.remove(0);
                    }

                    info!(
                        "[PoUE] Proof verified: {} reward: {:.2} AFC (quality: {})",
                        proof_id, p.reward, p.quality_score
                    );
                } else {
                    p.status = ProofStatus::Rejected;
                    p.verified_at = Some(verified_at);

                    warn!(
                        "[PoUE] Proof rejected: {} quality: {} < {}",
                        proof_id, p.quality_score, QUALITY_THRESHOLD
                    );
                }
            }
        });

        proof
    }

    /// Perform batch verification on verified proofs.
    pub async fn perform_batch_verification(&self) -> Option<BatchVerification> {
        let verified_proofs: Vec<ProofSubmission> = self.proofs.iter()
            .filter(|e| e.value().status == ProofStatus::Verified)
            .map(|e| e.value().clone())
            .collect();

        if verified_proofs.len() < 2 {
            return None;
        }

        let batch_proofs: Vec<_> = verified_proofs.into_iter().take(5).collect();
        let batch_count = self.batch_counter.fetch_add(1, Ordering::Relaxed) + 1;
        let batch_id = Self::generate_batch_id(batch_count);

        let batch = BatchVerification {
            batch_id,
            proof_ids: batch_proofs.iter().map(|p| p.proof_id.clone()).collect(),
            total_proofs: batch_proofs.len(),
            verified: batch_proofs.len(), // All are verified
            rejected: 0,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };

        let mut batches = self.recent_batches.lock().await;
        batches.push(batch.clone());
        if batches.len() > 10 {
            batches.remove(0);
        }

        info!(
            "[PoUE] Batch verification: {} with {} proofs",
            batch.batch_id, batch.total_proofs
        );

        Some(batch)
    }

    /// Get current verification metrics.
    pub fn get_metrics(&self) -> VerificationMetrics {
        let all: Vec<ProofSubmission> = self.proofs.iter().map(|e| e.value().clone()).collect();
        let verified: Vec<_> = all.iter().filter(|p| p.status == ProofStatus::Verified).collect();
        let rejected: Vec<_> = all.iter().filter(|p| p.status == ProofStatus::Rejected).collect();
        let pending: Vec<_> = all.iter().filter(|p| matches!(p.status, ProofStatus::Pending | ProofStatus::Verifying)).collect();

        let avg_cpu = if verified.is_empty() { 0 } else {
            verified.iter().map(|p| p.cpu_time_ms).sum::<u64>() / verified.len() as u64
        };
        let avg_mem = if verified.is_empty() { 0 } else {
            verified.iter().map(|p| p.memory_used_mb).sum::<u64>() / verified.len() as u64
        };
        let avg_quality = if verified.is_empty() { 0 } else {
            verified.iter().map(|p| p.quality_score as u64).sum::<u64>() / verified.len() as u64
        };
        let total_rewards = (verified.iter().map(|p| p.reward).sum::<f64>() * 100.0).round() / 100.0;

        VerificationMetrics {
            total_proofs: all.len(),
            verified: verified.len(),
            rejected: rejected.len(),
            pending: pending.len(),
            avg_cpu_time_ms: avg_cpu,
            avg_memory_mb: avg_mem,
            avg_quality_score: avg_quality as u8,
            total_rewards,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }
}

/// Run the PoUE ZK Prover as a standalone service.
pub async fn run_poue_service() -> Result<(), Box<dyn std::error::Error>> {
    let prover = PoueProver::new();

    info!(
        "PoUE ZK Prover initialized with {} provers, {} task types, {}-day challenge period",
        PROVERS.len(),
        TASK_TYPES.len(),
        CHALLENGE_PERIOD_DAYS
    );

    let mut tick = interval(Duration::from_secs(PROOF_INTERVAL_SECS));
    let mut batch_tick = 0u64;

    loop {
        tick.tick().await;
        let count = prover.tick_count.fetch_add(1, Ordering::Relaxed);

        // Submit a new proof every 8s
        prover.submit_proof().await;

        // Batch verification every 4 ticks (32s)
        batch_tick += 1;
        if batch_tick % 4 == 0 {
            prover.perform_batch_verification().await;
        }

        // Broadcast metrics every 2 ticks (16s)
        if count % 2 == 0 {
            let metrics = prover.get_metrics();
            info!(
                "[PoUE] Metrics: total={} verified={} rejected={} rewards={:.2} AFC",
                metrics.total_proofs, metrics.verified, metrics.rejected, metrics.total_rewards
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_seeded_value_determinism() {
        let v1 = PoueProver::seeded_value(42, 0.0, 100.0);
        let v2 = PoueProver::seeded_value(42, 0.0, 100.0);
        assert_eq!(v1, v2); // Same seed = same value
    }

    #[test]
    fn test_proof_id_format() {
        assert_eq!(PoueProver::generate_proof_id(1), "proof-0x000001");
        assert_eq!(PoueProver::generate_proof_id(255), "proof-0x0000ff");
    }

    #[test]
    fn test_quality_threshold() {
        assert!(QUALITY_THRESHOLD == 70);
        assert!(69 < QUALITY_THRESHOLD);
        assert!(70 >= QUALITY_THRESHOLD);
    }

    #[test]
    fn test_challenge_period() {
        assert_eq!(CHALLENGE_PERIOD_DAYS, 7);
    }
}
