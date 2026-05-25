// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IPoUEVerifier — Proof of Useful Execution verification interface
/// @notice Defines the interface for ZK-SNARK and Optimistic proof verification
interface IPoUEVerifier {
    // ─── Enums ────────────────────────────────────────────────────────

    /// @notice Proof verification status
    enum ProofStatus {
        PENDING,
        VERIFIED,
        REJECTED
    }

    /// @notice Proof type
    enum ProofType {
        ZK_SNARK,   // Zero-knowledge succinct non-interactive argument
        OPTIMISTIC   // Optimistic with challenge period
    }

    // ─── Structs ──────────────────────────────────────────────────────

    /// @notice Proof submission data
    struct ProofData {
        bytes32 taskId;       // Task identifier
        bytes32 proofHash;    // Hash of the proof
        ProofType proofType;  // Type of proof
        ProofStatus status;   // Current verification status
        address submitter;    // Proof submitter
        uint256 submittedAt;  // Submission timestamp
        uint256 verifiedAt;   // Verification timestamp (0 if pending)
    }

    // ─── Events ───────────────────────────────────────────────────────

    /// @notice Emitted when a proof is submitted
    event ProofSubmitted(
        bytes32 indexed taskId,
        bytes32 proofHash,
        ProofType proofType,
        address indexed submitter
    );

    /// @notice Emitted when a proof is verified
    event ProofVerified(
        bytes32 indexed taskId,
        address indexed submitter,
        uint256 reward
    );

    /// @notice Emitted when a proof is rejected
    event ProofRejected(
        bytes32 indexed taskId,
        bytes32 reason
    );

    // ─── Functions ────────────────────────────────────────────────────

    /// @notice Submit a ZK proof for a task
    /// @param taskId The task identifier
    /// @param proofHash The hash of the proof
    /// @param proofData The raw proof data (calldata for gas efficiency)
    function submitProof(
        bytes32 taskId,
        bytes32 proofHash,
        bytes calldata proofData
    ) external;

    /// @notice Verify a submitted proof
    /// @param taskId The task identifier
    /// @return status The verification status
    function verifyProof(bytes32 taskId) external view returns (ProofStatus status);

    /// @notice Batch verify multiple proofs
    /// @param taskIds Array of task identifiers
    /// @return statuses Array of verification statuses
    function batchVerify(bytes32[] calldata taskIds) external view returns (ProofStatus[] memory statuses);
}
