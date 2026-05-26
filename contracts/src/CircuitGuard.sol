// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ICircuitGuard.sol";
import "./libraries/Errors.sol";

/// @title CircuitGuard — Cognitive overload protection
/// @notice Implements circuit breaker state machine with cooldown-based recovery
/// @dev NORMAL (≥70), SOFT_LIMIT (50-69), HARD_PAUSE (<50)
contract CircuitGuard is ICircuitGuard, Ownable {
    // ─── Constants ────────────────────────────────────────────────────

    /// @notice Cooldown for SOFT_LIMIT recovery: 1 hour
    uint256 public constant SOFT_LIMIT_COOLDOWN = 1 hours;

    /// @notice Cooldown for HARD_PAUSE recovery: 24 hours
    uint256 public constant HARD_PAUSE_COOLDOWN = 24 hours;

    /// @notice Resonance threshold for NORMAL state
    uint256 public constant NORMAL_THRESHOLD = 70;

    /// @notice Resonance threshold for SOFT_LIMIT state
    uint256 public constant SOFT_LIMIT_THRESHOLD = 50;

    // ─── State Variables ──────────────────────────────────────────────

    /// @notice Mapping from avatar ID to current circuit state
    mapping(uint256 => CircuitState) private _circuitStates;

    /// @notice Mapping from avatar ID to recovery initiation timestamp
    mapping(uint256 => uint256) private _recoveryInitiatedAt;

    /// @notice Mapping from avatar ID to target recovery state
    mapping(uint256 => CircuitState) private _recoveryTargetState;

    /// @notice Multi-signature guardian addresses (for HARD_PAUSE recovery)
    mapping(address => bool) public guardians;

    /// @notice Number of guardian confirmations for HARD_PAUSE recovery
    mapping(uint256 => mapping(address => bool)) private _recoveryConfirmations;

    /// @notice Count of confirmations for an avatar's recovery
    mapping(uint256 => uint256) private _recoveryConfirmationCount;

    /// @notice Required confirmations for HARD_PAUSE recovery
    uint256 public requiredConfirmations;

    // ─── Constructor ──────────────────────────────────────────────────

    constructor(uint256 _requiredConfirmations) Ownable(msg.sender) {
        if (_requiredConfirmations == 0) revert Errors.InvalidCircuitState(0);
        requiredConfirmations = _requiredConfirmations;
    }

    // ─── External Functions ───────────────────────────────────────────

    /// @inheritdoc ICircuitGuard
    function evaluateState(uint256 resonanceScore) external pure override returns (CircuitState) {
        return _evaluateState(resonanceScore);
    }

    /// @inheritdoc ICircuitGuard
    function triggerRecovery(uint256 avatarId) external override {
        CircuitState currentState = _circuitStates[avatarId];

        if (currentState == CircuitState.NORMAL) {
            revert Errors.AlreadyInState(avatarId, uint8(CircuitState.NORMAL));
        }

        if (currentState == CircuitState.HARD_PAUSE) {
            // HARD_PAUSE requires multi-sig confirmation
            if (!guardians[msg.sender] && msg.sender != owner()) {
                revert Errors.HardPauseRequiresMultiSig(avatarId);
            }
            if (!_recoveryConfirmations[avatarId][msg.sender]) {
                _recoveryConfirmations[avatarId][msg.sender] = true;
                _recoveryConfirmationCount[avatarId]++;
            }
            if (_recoveryConfirmationCount[avatarId] < requiredConfirmations) {
                return; // Wait for more confirmations
            }
        }

        // Initiate recovery with cooldown
        uint256 cooldown = currentState == CircuitState.SOFT_LIMIT
            ? SOFT_LIMIT_COOLDOWN
            : HARD_PAUSE_COOLDOWN;

        _recoveryInitiatedAt[avatarId] = block.timestamp;
        _recoveryTargetState[avatarId] = CircuitState.NORMAL;

        emit RecoveryTriggered(avatarId, block.timestamp + cooldown);
    }

    /// @inheritdoc ICircuitGuard
    function isActionAllowed(CircuitState state, ActionType action) external pure override returns (bool) {
        return _isActionAllowed(state, action);
    }

    /// @inheritdoc ICircuitGuard
    function getCircuitState(uint256 avatarId) external view override returns (CircuitState) {
        return _circuitStates[avatarId];
    }

    /// @inheritdoc ICircuitGuard
    function getRecoveryCooldown(uint256 avatarId) external view override returns (uint256) {
        if (_recoveryInitiatedAt[avatarId] == 0) return 0;

        CircuitState currentState = _circuitStates[avatarId];
        uint256 cooldown = currentState == CircuitState.SOFT_LIMIT
            ? SOFT_LIMIT_COOLDOWN
            : HARD_PAUSE_COOLDOWN;

        uint256 elapsed = block.timestamp - _recoveryInitiatedAt[avatarId];
        if (elapsed >= cooldown) return 0;
        return cooldown - elapsed;
    }

    // ─── State Management Functions ───────────────────────────────────

    /// @notice Update circuit state for an avatar (called by AvatarCore or authorized)
    /// @param avatarId The avatar NFT token ID
    /// @param resonanceScore The new resonance score
    function updateCircuitState(uint256 avatarId, uint256 resonanceScore) external {
        CircuitState newState = _evaluateState(resonanceScore);
        CircuitState oldState = _circuitStates[avatarId];

        if (oldState != newState) {
            _circuitStates[avatarId] = newState;
            emit CircuitStateChanged(avatarId, oldState, newState);
        }
    }

    /// @notice Complete recovery after cooldown period
    /// @param avatarId The avatar NFT token ID
    function completeRecovery(uint256 avatarId) external {
        uint256 cooldown = _circuitStates[avatarId] == CircuitState.SOFT_LIMIT
            ? SOFT_LIMIT_COOLDOWN
            : HARD_PAUSE_COOLDOWN;

        if (_recoveryInitiatedAt[avatarId] == 0) revert Errors.RecoveryOnCooldown(avatarId, 0);
        if (block.timestamp - _recoveryInitiatedAt[avatarId] < cooldown) {
            revert Errors.RecoveryOnCooldown(
                avatarId,
                cooldown - (block.timestamp - _recoveryInitiatedAt[avatarId])
            );
        }

        CircuitState oldState = _circuitStates[avatarId];
        _circuitStates[avatarId] = CircuitState.NORMAL;

        // Clear recovery state
        _recoveryInitiatedAt[avatarId] = 0;
        _recoveryTargetState[avatarId] = CircuitState.NORMAL;
        _recoveryConfirmationCount[avatarId] = 0;

        emit RecoveryCompleted(avatarId, CircuitState.NORMAL);
        emit CircuitStateChanged(avatarId, oldState, CircuitState.NORMAL);
    }

    /// @notice Add a guardian address
    /// @param guardian The address to add as guardian
    function addGuardian(address guardian) external onlyOwner {
        if (guardian == address(0)) revert Errors.ZeroAddress();
        guardians[guardian] = true;
    }

    /// @notice Remove a guardian address
    /// @param guardian The address to remove
    function removeGuardian(address guardian) external onlyOwner {
        guardians[guardian] = false;
    }

    /// @notice Update required confirmations for HARD_PAUSE recovery
    /// @param newRequired The new required confirmation count
    function setRequiredConfirmations(uint256 newRequired) external onlyOwner {
        if (newRequired == 0) revert Errors.InvalidCircuitState(0);
        requiredConfirmations = newRequired;
    }

    // ─── Internal Functions ───────────────────────────────────────────

    /// @dev Evaluate circuit state from resonance score
    function _evaluateState(uint256 resonanceScore) internal pure returns (CircuitState) {
        if (resonanceScore >= NORMAL_THRESHOLD) return CircuitState.NORMAL;
        if (resonanceScore >= SOFT_LIMIT_THRESHOLD) return CircuitState.SOFT_LIMIT;
        return CircuitState.HARD_PAUSE;
    }

    /// @dev Check if an action is allowed in a given circuit state
    function _isActionAllowed(CircuitState state, ActionType action) internal pure returns (bool) {
        if (state == CircuitState.NORMAL) {
            return true; // All actions allowed in NORMAL
        }

        if (state == CircuitState.SOFT_LIMIT) {
            // Only high-risk operations blocked in SOFT_LIMIT
            return action != ActionType.HIGH_RISK_OPERATION;
        }

        // HARD_PAUSE: only basic view-like operations allowed
        return action == ActionType.CREATE_AVATAR;
    }
}
