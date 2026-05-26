// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IPoUEVerifier.sol";
import "./libraries/Errors.sol";

/// @title PoUEVerifier — Proof of Useful Execution verification
/// @notice Supports both ZK-SNARK and Optimistic proof modes with 7-day challenge period
/// @dev ZK-SNARK proofs are verified immediately; Optimistic proofs require a 7-day challenge window
contract PoUEVerifier is IPoUEVerifier, AccessControl {
    // ─── Constants ────────────────────────────────────────────────────

    /// @notice Challenge period duration for optimistic proofs: 7 days
    uint256 public constant CHALLENGE_PERIOD = 7 days;

    /// @notice Maximum batch size for batchVerify
    uint256 public constant MAX_BATCH_SIZE = 50;

    /// @notice Reward for successful proof verification (18-decimal)
    uint256 public constant VERIFICATION_REWARD = 1e18;

    // ─── Roles ────────────────────────────────────────────────────────

    /// @notice Role for verifiers who can verify ZK-SNARK proofs
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    /// @notice Role for challengers who can challenge optimistic proofs
    bytes32 public constant CHALLENGER_ROLE = keccak256("CHALLENGER_ROLE");

    // ─── State Variables ──────────────────────────────────────────────

    /// @notice Mapping from task ID to proof data
    mapping(bytes32 => ProofData) private _proofs;

    /// @notice Mapping from task ID to whether a proof exists
    mapping(bytes32 => bool) private _proofExists;

    /// @notice Mapping from task ID to challenge data (optimistic mode)
    mapping(bytes32 => bytes32) private _challengeReason;

    /// @notice Total proofs verified
    uint256 public totalVerified;

    /// @notice Total proofs rejected
    uint256 public totalRejected;

    // ─── Constructor ──────────────────────────────────────────────────

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        _grantRole(CHALLENGER_ROLE, msg.sender);
    }

    // ─── External Functions ───────────────────────────────────────────

    /// @inheritdoc IPoUEVerifier
    function submitProof(
        bytes32 taskId,
        bytes32 proofHash,
        bytes calldata proofData
    ) external override {
        if (_proofExists[taskId]) revert Errors.ProofAlreadySubmitted(taskId);
        if (proofHash == bytes32(0)) revert Errors.ProofNotFound(taskId);

        // Determine proof type from the first byte of proofData
        // 0x00 = ZK-SNARK, 0x01 = Optimistic
        ProofType proofType = proofData.length > 0 && uint8(proofData[0]) == 1
            ? ProofType.OPTIMISTIC
            : ProofType.ZK_SNARK;

        _proofs[taskId] = ProofData({
            taskId: taskId,
            proofHash: proofHash,
            proofType: proofType,
            status: ProofStatus.PENDING,
            submitter: msg.sender,
            submittedAt: block.timestamp,
            verifiedAt: 0
        });

        _proofExists[taskId] = true;

        // For ZK-SNARK, auto-verify after submission (simulated)
        // In production, this would call a verifier contract
        if (proofType == ProofType.ZK_SNARK) {
            _verifyZkProof(taskId, proofHash, proofData);
        }
        // For Optimistic, proof remains PENDING until challenge period ends

        emit ProofSubmitted(taskId, proofHash, proofType, msg.sender);
    }

    /// @inheritdoc IPoUEVerifier
    function verifyProof(bytes32 taskId) external view override returns (ProofStatus status) {
        if (!_proofExists[taskId]) revert Errors.ProofNotFound(taskId);

        ProofData storage proof = _proofs[taskId];

        // If already resolved, return status
        if (proof.status != ProofStatus.PENDING) {
            return proof.status;
        }

        // For optimistic proofs, check if challenge period has passed
        if (proof.proofType == ProofType.OPTIMISTIC) {
            if (block.timestamp >= proof.submittedAt + CHALLENGE_PERIOD) {
                return ProofStatus.VERIFIED; // Challenge period passed, considered verified
            }
            return ProofStatus.PENDING; // Still in challenge period
        }

        // For ZK-SNARK proofs, status is already set
        return proof.status;
    }

    /// @inheritdoc IPoUEVerifier
    function batchVerify(bytes32[] calldata taskIds) external view override returns (ProofStatus[] memory statuses) {
        if (taskIds.length > MAX_BATCH_SIZE) revert Errors.BatchSizeExceeded(taskIds.length);

        statuses = new ProofStatus[](taskIds.length);
        for (uint256 i = 0; i < taskIds.length; i++) {
            if (!_proofExists[taskIds[i]]) {
                statuses[i] = ProofStatus.REJECTED;
            } else {
                statuses[i] = verifyProof(taskIds[i]);
            }
        }
    }

    // ─── Extended Functions ───────────────────────────────────────────

    /// @notice Challenge an optimistic proof during the challenge period
    /// @param taskId The task identifier
    /// @param reason The reason for the challenge
    function challengeProof(bytes32 taskId, bytes32 reason) external onlyRole(CHALLENGER_ROLE) {
        if (!_proofExists[taskId]) revert Errors.ProofNotFound(taskId);

        ProofData storage proof = _proofs[taskId];
        if (proof.proofType != ProofType.OPTIMISTIC) revert Errors.InvalidProofType(uint8(proof.proofType));
        if (proof.status != ProofStatus.PENDING) revert Errors.ProofRejected(taskId);

        // Check challenge period is still active
        if (block.timestamp >= proof.submittedAt + CHALLENGE_PERIOD) {
            revert Errors.ChallengePeriodActive(taskId, 0);
        }

        proof.status = ProofStatus.REJECTED;
        _challengeReason[taskId] = reason;
        totalRejected++;

        emit ProofRejected(taskId, reason);
    }

    /// @notice Finalize an optimistic proof after the challenge period
    /// @param taskId The task identifier
    function finalizeProof(bytes32 taskId) external {
        if (!_proofExists[taskId]) revert Errors.ProofNotFound(taskId);

        ProofData storage proof = _proofs[taskId];
        if (proof.status != ProofStatus.PENDING) revert Errors.ProofRejected(taskId);

        // Check challenge period has ended
        if (block.timestamp < proof.submittedAt + CHALLENGE_PERIOD) {
            revert Errors.ChallengePeriodActive(
                taskId,
                proof.submittedAt + CHALLENGE_PERIOD - block.timestamp
            );
        }

        proof.status = ProofStatus.VERIFIED;
        proof.verifiedAt = block.timestamp;
        totalVerified++;

        emit ProofVerified(taskId, proof.submitter, VERIFICATION_REWARD);
    }

    /// @notice Get the full proof data for a task
    /// @param taskId The task identifier
    /// @return proofData The complete proof data
    function getProofData(bytes32 taskId) external view returns (ProofData memory proofData) {
        if (!_proofExists[taskId]) revert Errors.ProofNotFound(taskId);
        return _proofs[taskId];
    }

    /// @notice Get the challenge reason for a task
    /// @param taskId The task identifier
    /// @return reason The challenge reason
    function getChallengeReason(bytes32 taskId) external view returns (bytes32 reason) {
        return _challengeReason[taskId];
    }

    /// @notice Get remaining challenge period for a task
    /// @param taskId The task identifier
    /// @return remaining Seconds remaining in challenge period (0 if expired)
    function getChallengeRemaining(bytes32 taskId) external view returns (uint256 remaining) {
        if (!_proofExists[taskId]) return 0;
        ProofData storage proof = _proofs[taskId];
        if (proof.proofType != ProofType.OPTIMISTIC) return 0;
        if (proof.status != ProofStatus.PENDING) return 0;

        uint256 endTime = proof.submittedAt + CHALLENGE_PERIOD;
        if (block.timestamp >= endTime) return 0;
        return endTime - block.timestamp;
    }

    // ─── Internal Functions ───────────────────────────────────────────

    /// @dev Simulate ZK-SNARK verification
    /// @notice In production, this would call a Groth16/Plonk verifier contract
    function _verifyZkProof(bytes32 taskId, bytes32 proofHash, bytes calldata proofData) internal {
        // Simulated verification: accept if proofHash is non-zero and proofData is non-empty
        // Real implementation would verify the proof against a verification key
        ProofData storage proof = _proofs[taskId];

        if (proofHash != bytes32(0) && proofData.length >= 4) {
            proof.status = ProofStatus.VERIFIED;
            proof.verifiedAt = block.timestamp;
            totalVerified++;
            emit ProofVerified(taskId, proof.submitter, VERIFICATION_REWARD);
        } else {
            proof.status = ProofStatus.REJECTED;
            totalRejected++;
            emit ProofRejected(taskId, bytes32("invalid_proof"));
        }
    }
}
