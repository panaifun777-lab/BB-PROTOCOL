// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Errors — Custom errors for the BB Protocol
/// @notice Centralized error definitions to reduce bytecode size and improve DX
library Errors {
    // ─── AvatarCore ───────────────────────────────────────────────────
    error AvatarNotFound(uint256 tokenId);
    error NotAvatarOwner(address caller, uint256 tokenId);
    error AvatarFrozen(uint256 tokenId);
    error InvalidCognitionRoot();
    error InvalidResonanceScore(uint256 score);
    error AvatarAlreadyExists(uint256 tokenId);

    // ─── DynamicSplitter ──────────────────────────────────────────────
    error SplitBpsInvalid(uint256 totalBps);
    error ZeroAmount();
    error TransferFailed();
    error AvatarNotFoundForSplit(uint256 avatarId);
    error TokenNotSupported(address token);

    // ─── CircuitGuard ─────────────────────────────────────────────────
    error ActionNotAllowed(uint8 actionType, uint8 circuitState);
    error RecoveryOnCooldown(uint256 avatarId, uint256 remainingTime);
    error AlreadyInState(uint256 avatarId, uint8 state);
    error InvalidCircuitState(uint8 state);
    error HardPauseRequiresMultiSig(uint256 avatarId);

    // ─── SkillVault ───────────────────────────────────────────────────
    error SkillNotFound(bytes32 skillId);
    error SkillAlreadyRegistered(bytes32 skillId);
    error SkillLocked(bytes32 skillId, uint256 revenueThreshold, uint256 currentRevenue);
    error SkillAlreadyUnlocked(uint256 avatarId, bytes32 skillId);
    error InvalidTier(uint8 tier);
    error InvalidRevenueThreshold(uint8 tier, uint256 threshold);

    // ─── IFDRouter ────────────────────────────────────────────────────
    error MaxDelegationDepthExceeded(uint256 depth);
    error SelfDelegation();
    error DelegationNotFound(address delegator, address delegate);
    error CircularDelegation(address delegator, address delegate);
    error InvalidWeight(uint256 weight);
    error ProposalNotFound(uint256 proposalId);
    error AlreadyVoted(address voter, uint256 proposalId);

    // ─── ECEOracle ────────────────────────────────────────────────────
    error StalePrice(bytes32 assetId, uint256 updatedAt);
    error InvalidConfidence(uint8 confidence);
    error InsufficientOracleSubmissions(bytes32 assetId);
    error NotAuthorizedOracle(address caller);
    error PriceDeviationTooHigh(bytes32 assetId, uint256 deviation);

    // ─── TokenVault ───────────────────────────────────────────────────
    error InsufficientBalance(address token, uint256 requested, uint256 available);
    error FlashLoanDetected(address depositor);
    error InsufficientLpBalance(uint256 requested, uint256 available);
    error ZeroDeposit();
    error ZeroWithdraw();

    // ─── PoUEVerifier ─────────────────────────────────────────────────
    error ProofNotFound(bytes32 taskId);
    error ProofAlreadySubmitted(bytes32 taskId);
    error ChallengePeriodActive(bytes32 taskId, uint256 remainingTime);
    error ProofRejected(bytes32 taskId);
    error InvalidProofType(uint8 proofType);
    error BatchSizeExceeded(uint256 size);

    // ─── MCPRouter ────────────────────────────────────────────────────
    error ProviderNotFound(bytes32 providerId);
    error ProviderAlreadyRegistered(bytes32 providerId);
    error InsufficientStake(bytes32 providerId, uint256 required, uint256 actual);
    error RequestNotFound(bytes32 requestId);
    error ResponseAlreadySubmitted(bytes32 requestId);
    error SlashingFailed(bytes32 providerId);
    error NoProviderAvailable(bytes32 modelId);

    // ─── GovernanceToken ──────────────────────────────────────────────
    error ProposalNotActive(uint256 proposalId);
    error QuorumNotReached(uint256 proposalId);
    error VoteNotSuccessful(uint256 proposalId);
    error TimelockActive(uint256 proposalId, uint256 remainingTime);
    error InsufficientVotingPower(address voter, uint256 required, uint256 actual);
    error InvalidProposalState(uint8 state);
    error EmptyProposal();

    // ─── Common ───────────────────────────────────────────────────────
    error ZeroAddress();
    error Unauthorized(address caller);
    error Paused();
    error ArrayLengthMismatch();
}
