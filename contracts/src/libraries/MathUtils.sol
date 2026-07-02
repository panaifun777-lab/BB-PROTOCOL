// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MathUtils — BPS calculations and clamping utilities for the BB Protocol
/// @notice Provides gas-optimized math helpers used across multiple contracts
library MathUtils {
    // ─── Constants ────────────────────────────────────────────────────
    uint256 internal constant BPS_BASE = 10_000;   // Basis points denominator
    uint256 internal constant BPS_HUMAN_DEFAULT = 7_000;
    uint256 internal constant BPS_AVATAR_DEFAULT = 2_000;
    uint256 internal constant BPS_PROTOCOL_DEFAULT = 1_000;
    uint256 internal constant BPS_AVATAR_MIN = 1_500;
    uint256 internal constant BPS_AVATAR_MAX = 2_500;
    uint256 internal constant RESONANCE_NEUTRAL = 70;
    uint256 internal constant RESONANCE_MULTIPLIER = 50;

    // ─── Clamp ────────────────────────────────────────────────────────

    /// @notice Clamp a value between a minimum and maximum (inclusive)
    /// @param value The value to clamp
    /// @param min The minimum bound
    /// @param max The maximum bound
    /// @return The clamped value
    function clamp(uint256 value, uint256 min, uint256 max) internal pure returns (uint256) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    // ─── BPS Split Calculation ────────────────────────────────────────

    /// @notice Calculate the dynamic avatar BPS based on resonance score
    /// @dev avatarAdj = clamp((70 - resonanceScore) × 50, 1500, 2500)
    ///      When resonance is low, avatar vault share increases to incentivize iteration
    /// @param resonanceScore The avatar's current resonance score [0, 100]
    /// @return avatarBps The dynamic avatar BPS share
    function calculateDynamicAvatarBps(uint256 resonanceScore) internal pure returns (uint256 avatarBps) {
        // Underflow-safe: if resonanceScore > 70, the subtraction wraps
        // but we treat it as avatarBps = min (since score > neutral → less vault needed)
        if (resonanceScore >= RESONANCE_NEUTRAL) {
            avatarBps = BPS_AVATAR_MIN;
        } else {
            uint256 rawBps = (RESONANCE_NEUTRAL - resonanceScore) * RESONANCE_MULTIPLIER;
            avatarBps = clamp(rawBps, BPS_AVATAR_MIN, BPS_AVATAR_MAX);
        }
    }

    /// @notice Calculate the full split configuration given a resonance score
    /// @param resonanceScore The avatar's current resonance score [0, 100]
    /// @return humanBps Human share in BPS
    /// @return avatarBps Avatar vault share in BPS
    /// @return protocolBps Protocol share in BPS
    /// @dev Invariant: humanBps + avatarBps + protocolBps == 10_000
    function calculateSplitConfig(uint256 resonanceScore)
        internal
        pure
        returns (uint256 humanBps, uint256 avatarBps, uint256 protocolBps)
    {
        avatarBps = calculateDynamicAvatarBps(resonanceScore);
        protocolBps = BPS_PROTOCOL_DEFAULT;
        // Human receives the remainder to ensure conservation
        humanBps = BPS_BASE - avatarBps - protocolBps;
    }

    // ─── Amount Split ─────────────────────────────────────────────────

    /// @notice Split an amount according to BPS ratios
    /// @param amount The total amount to split
    /// @param humanBps Human share in BPS
    /// @param avatarBps Avatar share in BPS
    /// @param protocolBps Protocol share in BPS
    /// @return humanAmount Amount for human
    /// @return avatarAmount Amount for avatar vault
    /// @return protocolAmount Amount for protocol
    /// @dev Invariant: humanAmount + avatarAmount + protocolAmount == amount
    function splitAmount(uint256 amount, uint256 humanBps, uint256 avatarBps, uint256 protocolBps)
        internal
        pure
        returns (uint256 humanAmount, uint256 avatarAmount, uint256 protocolAmount)
    {
        humanAmount = (amount * humanBps) / BPS_BASE;
        avatarAmount = (amount * avatarBps) / BPS_BASE;
        // Protocol gets remainder to ensure conservation invariant
        protocolAmount = amount - humanAmount - avatarAmount;
    }

    // ─── Weight Decay ─────────────────────────────────────────────────

    /// @notice Calculate weight with decay factor for IFD delegation
    /// @dev Weight decays by 0.8^n per delegation level (max depth 3)
    /// @param weight The original delegation weight
    /// @param level The delegation depth level (0 = direct)
    /// @return The decayed weight
    function applyWeightDecay(uint256 weight, uint256 level) internal pure returns (uint256) {
        if (level == 0) return weight;
        if (level == 1) return (weight * 8) / 10;    // 0.8x
        if (level == 2) return (weight * 64) / 100;   // 0.64x
        if (level == 3) return (weight * 512) / 1000;  // 0.512x
        return 0; // Beyond max depth
    }

    // ─── LP Calculations ──────────────────────────────────────────────

    /// @notice Calculate LP tokens to mint for a deposit (0.95x multiplier)
    /// @param depositAmount The amount of tokens deposited
    /// @return lpAmount The LP tokens to mint
    function calculateLpMint(uint256 depositAmount) internal pure returns (uint256) {
        return (depositAmount * 95) / 100;
    }

    /// @notice Calculate tokens to return for LP burn (1.05x multiplier)
    /// @param lpAmount The LP tokens to burn
    /// @return withdrawAmount The tokens to return
    function calculateLpWithdraw(uint256 lpAmount) internal pure returns (uint256) {
        return (lpAmount * 105) / 100;
    }
}
