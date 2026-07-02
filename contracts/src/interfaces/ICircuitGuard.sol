// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ICircuitGuard — Cognitive overload protection interface
/// @notice Defines the interface for circuit breaker state management
interface ICircuitGuard {
    // ─── Enums ────────────────────────────────────────────────────────

    /// @notice Circuit breaker states
    enum CircuitState {
        NORMAL,      // resonanceScore >= 70
        SOFT_LIMIT,  // 50 <= resonanceScore < 70
        HARD_PAUSE   // resonanceScore < 50
    }

    /// @notice Action types that can be restricted by circuit guard
    enum ActionType {
        CREATE_AVATAR,      // 0
        UPDATE_COGNITION,   // 1
        EXECUTE_SPLIT,      // 2
        UNLOCK_SKILL,       // 3
        DELEGATE_VOTE,      // 4
        HIGH_RISK_OPERATION // 5
    }

    // ─── Events ───────────────────────────────────────────────────────

    /// @notice Emitted when circuit state changes
    event CircuitStateChanged(
        uint256 indexed avatarId,
        CircuitState fromState,
        CircuitState toState
    );

    /// @notice Emitted when recovery is triggered
    event RecoveryTriggered(
        uint256 indexed avatarId,
        uint256 recoverAt
    );

    /// @notice Emitted when recovery completes
    event RecoveryCompleted(
        uint256 indexed avatarId,
        CircuitState newState
    );

    // ─── Functions ────────────────────────────────────────────────────

    /// @notice Evaluate the circuit state based on resonance score
    /// @param resonanceScore The current resonance score [0, 100]
    /// @return The evaluated circuit state
    function evaluateState(uint256 resonanceScore) external pure returns (CircuitState);

    /// @notice Trigger recovery for an avatar in HARD_PAUSE or SOFT_LIMIT
    /// @param avatarId The avatar NFT token ID
    function triggerRecovery(uint256 avatarId) external;

    /// @notice Check if an action is allowed given a circuit state
    /// @param state The current circuit state
    /// @param action The action type to check
    /// @return allowed True if the action is allowed
    function isActionAllowed(CircuitState state, ActionType action) external pure returns (bool allowed);

    /// @notice Get the circuit state for an avatar
    /// @param avatarId The avatar NFT token ID
    /// @return The current circuit state
    function getCircuitState(uint256 avatarId) external view returns (CircuitState);

    /// @notice Get the cooldown remaining for an avatar's recovery
    /// @param avatarId The avatar NFT token ID
    /// @return remainingSeconds Seconds remaining until recovery can complete
    function getRecoveryCooldown(uint256 avatarId) external view returns (uint256 remainingSeconds);
}
