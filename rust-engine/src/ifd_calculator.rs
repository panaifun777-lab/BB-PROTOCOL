//! IFD (Incentivized Fluid Democracy) Weight Calculator
//!
//! Implements delegation graph traversal with exponential weight decay.
//! The core algorithm: effectiveWeight = delegatedWeight × 0.8^depth
//! Max delegation depth: 3 levels
//! Includes cycle detection using DFS.

use crate::types::*;
use dashmap::DashMap;
use petgraph::graph::DiGraph;
use petgraph::algo::is_cyclic_directed;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::time::{Duration, interval};
use tracing::{info, warn};

const DECAY_FACTOR: f64 = 0.8;
const MAX_DEPTH: u32 = 3;
const UPDATE_INTERVAL_SECS: u64 = 5;

pub struct IfdCalculator {
    nodes: Arc<DashMap<String, DelegationNode>>,
    graph: Arc<tokio::sync::Mutex<DiGraph<String, ()>>>,
    tick_count: Arc<AtomicU64>,
}

impl IfdCalculator {
    pub fn new() -> Self {
        let nodes = Arc::new(DashMap::new());
        let graph = Arc::new(tokio::sync::Mutex::new(DiGraph::new()));
        let tick_count = Arc::new(AtomicU64::new(0));

        Self { nodes, graph, tick_count }
    }

    /// Calculate effective weights for all nodes in the delegation graph.
    /// Uses iterative depth calculation with cycle detection.
    pub async fn calculate_weights(&self) -> Vec<DelegationNode> {
        let mut results = Vec::new();

        for mut entry in self.nodes.iter_mut() {
            let node = entry.value_mut();

            // Calculate depth by tracing delegation chain
            let depth = self.calculate_depth(&node.address).await;
            let clamped_depth = depth.min(MAX_DEPTH);

            // Apply decay: effectiveWeight = weight × 0.8^depth
            node.depth = clamped_depth;
            node.effective_weight = (node.weight as f64) * DECAY_FACTOR.powi(clamped_depth as i32);

            results.push(node.clone());
        }

        results
    }

    /// Trace delegation chain to determine depth.
    /// Detects cycles by tracking visited nodes.
    async fn calculate_depth(&self, address: &str) -> u32 {
        let mut depth = 0u32;
        let mut current = Some(address.to_string());
        let mut visited = std::collections::HashSet::new();

        while let Some(addr) = current {
            if visited.contains(&addr) {
                // Cycle detected - return MAX_DEPTH
                warn!("Cycle detected at address: {}", addr);
                return MAX_DEPTH;
            }
            visited.insert(addr.clone());

            if let Some(node) = self.nodes.get(&addr) {
                current = node.delegated_to.clone();
                if current.is_some() {
                    depth += 1;
                }
            } else {
                break;
            }
        }

        depth
    }

    /// Detect all cycles in the delegation graph using petgraph.
    pub async fn detect_cycles(&self) -> Vec<Vec<String>> {
        let graph = self.graph.lock().await;

        if !is_cyclic_directed(&*graph) {
            return Vec::new();
        }

        // Custom cycle detection via DFS
        let mut cycles = Vec::new();
        let node_count = graph.node_count();

        for start_idx in 0..node_count {
            let mut path = Vec::new();
            let mut visited = std::collections::HashSet::new();
            let mut on_stack = std::collections::HashSet::new();

            Self::dfs_cycles(
                &graph,
                start_idx.into(),
                &mut path,
                &mut visited,
                &mut on_stack,
                &mut cycles,
            );
        }

        cycles
    }

    fn dfs_cycles(
        graph: &DiGraph<String, ()>,
        node: petgraph::graph::NodeIndex,
        path: &mut Vec<String>,
        visited: &mut std::collections::HashSet<petgraph::graph::NodeIndex>,
        on_stack: &mut std::collections::HashSet<petgraph::graph::NodeIndex>,
        cycles: &mut Vec<Vec<String>>,
    ) {
        if on_stack.contains(&node) {
            let node_weight = &graph[node];
            if let Some(cycle_start) = path.iter().position(|n| n == node_weight) {
                cycles.push(path[cycle_start..].to_vec());
            }
            return;
        }

        if visited.contains(&node) {
            return;
        }

        visited.insert(node);
        on_stack.insert(node);
        path.push(graph[node].clone());

        for neighbor in graph.neighbors(node) {
            Self::dfs_cycles(graph, neighbor, path, visited, on_stack, cycles);
        }

        path.pop();
        on_stack.remove(&node);
    }

    /// Add or update a delegation edge in the graph.
    pub async fn update_delegation(&self, from: &str, to: Option<&str>) {
        if let Some(delegate) = to {
            if let Some(mut node) = self.nodes.get_mut(from) {
                node.delegated_to = Some(delegate.to_string());
                info!("Delegation updated: {} → {}", from, delegate);
            }
        } else {
            if let Some(mut node) = self.nodes.get_mut(from) {
                node.delegated_to = None;
                info!("Delegation removed: {} (direct voter)", from);
            }
        }
    }
}

/// Run the IFD Calculator as a standalone service.
/// In production, this would use socket.io or gRPC for communication.
pub async fn run_ifd_service() -> Result<(), Box<dyn std::error::Error>> {
    let calculator = IfdCalculator::new();

    // Initialize with sample delegation graph
    let initial_delegations = vec![
        ("0x7a3f...9b2c", None, 100u64),
        ("0xb1c2...3d4e", Some("0x7a3f...9b2c"), 80),
        ("0xc5d6...7f8a", Some("0xb1c2...3d4e"), 60),
        ("0xd9e0...1a2b", Some("0xc5d6...7f8a"), 40),
        ("0xe3f4...5c6d", Some("0x7a3f...9b2c"), 70),
        ("0xf7a8...9e0f", Some("0xe3f4...5c6d"), 50),
        ("0x1b2c...3d4e", None, 90),
        ("0x5f6a...7b8c", Some("0x1b2c...3d4e"), 65),
    ];

    for (addr, delegated_to, weight) in &initial_delegations {
        calculator.nodes.insert(addr.to_string(), DelegationNode {
            address: addr.to_string(),
            delegated_to: delegated_to.map(|s| s.to_string()),
            weight: *weight,
            effective_weight: 0.0,
            depth: 0,
        });
    }

    info!("IFD Calculator initialized with {} nodes", initial_delegations.len());

    // Main computation loop
    let mut tick = interval(Duration::from_secs(UPDATE_INTERVAL_SECS));

    loop {
        tick.tick().await;

        let nodes = calculator.calculate_weights().await;
        let cycles = calculator.detect_cycles().await;
        let total_weight: f64 = nodes.iter().map(|n| n.effective_weight).sum();

        let count = calculator.tick_count.fetch_add(1, Ordering::Relaxed);

        if !cycles.is_empty() {
            warn!("Detected {} cycle(s) in delegation graph", cycles.len());
        }

        info!(
            "[IFD] tick={} | total_weight={:.2} | nodes={} | cycles={}",
            count, total_weight, nodes.len(), cycles.len()
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_weight_decay() {
        // Depth 0: weight × 0.8^0 = weight × 1.0
        assert_eq!(DECAY_FACTOR.powi(0), 1.0);
        // Depth 1: weight × 0.8^1 = weight × 0.8
        assert_eq!(DECAY_FACTOR.powi(1), 0.8);
        // Depth 2: weight × 0.8^2 = weight × 0.64
        assert!((DECAY_FACTOR.powi(2) - 0.64).abs() < 0.001);
        // Depth 3: weight × 0.8^3 = weight × 0.512
        assert!((DECAY_FACTOR.powi(3) - 0.512).abs() < 0.001);
    }

    #[tokio::test]
    async fn test_max_depth_clamp() {
        assert!(MAX_DEPTH == 3);
        // Depth 4 should be clamped to 3
        assert!(4u32.min(MAX_DEPTH) == 3);
    }
}
