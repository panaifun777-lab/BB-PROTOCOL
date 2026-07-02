//! Shared types for the BB Engine modules

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── IFD Weight Calculator Types ──────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DelegationNode {
    pub address: String,
    pub delegated_to: Option<String>,
    pub weight: u64,
    pub effective_weight: f64,
    pub depth: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeightUpdate {
    pub timestamp: u64,
    pub total_weight: f64,
    pub nodes: Vec<DelegationNode>,
    pub cycles: Vec<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphChange {
    pub address: String,
    pub old_delegate: Option<String>,
    pub new_delegate: Option<String>,
    pub timestamp: u64,
}

// ── ECE Oracle Client Types ─────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceSubmission {
    pub source_id: String,
    pub source_name: String,
    pub asset: String,
    pub price: f64,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetPrice {
    pub asset: String,
    pub price: f64,
    pub median: f64,
    pub confidence: u8, // 0-100
    pub submissions: Vec<PriceSubmission>,
    pub last_update: u64,
    pub change_1m: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviationAlert {
    pub asset: String,
    pub previous_price: f64,
    pub current_price: f64,
    pub change_percent: f64,
    pub direction: PriceDirection,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PriceDirection {
    Up,
    Down,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceHealth {
    pub sources: Vec<SourceStatus>,
    pub heartbeat_status: HeartbeatStatus,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceStatus {
    pub source_id: String,
    pub source_name: String,
    pub last_submission: u64,
    pub is_stale: bool,
    pub submission_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HeartbeatStatus {
    Healthy,
    Degraded,
    Down,
}

// ── PoUE ZK Prover Types ────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProofStatus {
    Pending,
    Verifying,
    Verified,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofSubmission {
    pub proof_id: String,
    pub task_id: String,
    pub prover: String,
    pub status: ProofStatus,
    pub submitted_at: u64,
    pub verified_at: Option<u64>,
    pub challenge_deadline: Option<u64>,
    pub cpu_time_ms: u64,
    pub memory_used_mb: u64,
    pub quality_score: u8,
    pub reward: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchVerification {
    pub batch_id: String,
    pub proof_ids: Vec<String>,
    pub total_proofs: usize,
    pub verified: usize,
    pub rejected: usize,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewardDistribution {
    pub proof_id: String,
    pub prover: String,
    pub amount: f64,
    pub token: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationMetrics {
    pub total_proofs: usize,
    pub verified: usize,
    pub rejected: usize,
    pub pending: usize,
    pub avg_cpu_time_ms: u64,
    pub avg_memory_mb: u64,
    pub avg_quality_score: u8,
    pub total_rewards: f64,
    pub timestamp: u64,
}

// ── MCP Router Types ────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    pub provider_id: String,
    pub name: String,
    pub stake: u64,
    pub latency_score: u8,
    pub reputation: u8,
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub is_slashed: bool,
    pub slash_count: u32,
    pub registered_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutedRequest {
    pub request_id: String,
    pub task_type: String,
    pub provider_id: String,
    pub provider_name: String,
    pub routed_at: u64,
    pub responded_at: Option<u64>,
    pub response_valid: Option<bool>,
    pub latency_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderSlashing {
    pub provider_id: String,
    pub provider_name: String,
    pub reason: String,
    pub slash_amount: u64,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaderboardEntry {
    pub rank: usize,
    pub provider_id: String,
    pub name: String,
    pub composite_score: f64,
    pub latency_score: u8,
    pub stake_weight: u8,
    pub reputation: u8,
    pub total_requests: u64,
    pub success_rate: u8,
}

// ── Engine Module Status ────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineModuleStatus {
    pub name: String,
    pub port: u16,
    pub status: ModuleStatus,
    pub uptime_seconds: u64,
    pub metrics: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ModuleStatus {
    Online,
    Degraded,
    Offline,
}
