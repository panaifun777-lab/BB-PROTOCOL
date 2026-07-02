//! BB Engine - Off-Chain Computation Engine for AI Avatar DeFi Protocol
//!
//! This is the Rust reference implementation for the 4 off-chain engine modules:
//! 1. IFD Weight Calculator - Delegation graph traversal with weight decay
//! 2. ECE Oracle Client - Multi-source price aggregation
//! 3. PoUE ZK Prover - Zero-knowledge proof verification simulation
//! 4. MCP Router - Model Context Protocol request routing

mod ifd_calculator;
mod ece_oracle;
mod poue_prover;
mod mcp_router;
mod types;

use tokio::signal;
use tracing::{info, error};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_target(false)
        .with_thread_ids(true)
        .init();

    info!("🚀 BB Engine starting...");

    // Spawn all engine modules as concurrent tasks
    let ifd_handle = tokio::spawn(async {
        if let Err(e) = ifd_calculator::run_ifd_service().await {
            error!("IFD Calculator error: {}", e);
        }
    });

    let ece_handle = tokio::spawn(async {
        if let Err(e) = ece_oracle::run_ece_service().await {
            error!("ECE Oracle error: {}", e);
        }
    });

    let poue_handle = tokio::spawn(async {
        if let Err(e) = poue_prover::run_poue_service().await {
            error!("PoUE Prover error: {}", e);
        }
    });

    let mcp_handle = tokio::spawn(async {
        if let Err(e) = mcp_router::run_mcp_service().await {
            error!("MCP Router error: {}", e);
        }
    });

    info!("✅ All 4 engine modules spawned");

    // Wait for shutdown signal
    signal::ctrl_c().await?;
    info!("🛑 Shutdown signal received, stopping all modules...");

    // Abort all tasks
    ifd_handle.abort();
    ece_handle.abort();
    poue_handle.abort();
    mcp_handle.abort();

    info!("✅ BB Engine shutdown complete");
    Ok(())
}
