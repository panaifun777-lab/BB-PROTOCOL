// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ISkillVault — Skill registry with revenue-gated unlock interface
/// @notice Defines the interface for skill management and unlock mechanics
interface ISkillVault {
    // ─── Enums ────────────────────────────────────────────────────────

    /// @notice Skill unlock status
    enum SkillStatus {
        LOCKED,
        UNLOCKED
    }

    // ─── Structs ──────────────────────────────────────────────────────

    /// @notice Skill registration data
    struct SkillInfo {
        bytes32 skillId;           // Unique skill identifier
        uint8 tier;                // Tier level (0-4)
        uint256 revenueThreshold;  // Revenue required to unlock (USD, 18 decimals)
        address developer;         // Skill developer address
        bool registered;           // Whether the skill is registered
    }

    // ─── Events ───────────────────────────────────────────────────────

    /// @notice Emitted when a new skill is registered
    event SkillRegistered(
        bytes32 indexed skillId,
        uint8 tier,
        uint256 revenueThreshold,
        address indexed developer
    );

    /// @notice Emitted when a skill is unlocked for an avatar
    event SkillUnlocked(
        uint256 indexed avatarId,
        bytes32 indexed skillId,
        uint256 revenueAtUnlock
    );

    // ─── Functions ────────────────────────────────────────────────────

    /// @notice Register a new skill in the vault
    /// @param skillId Unique identifier for the skill
    /// @param tier Tier level (0=Tier1, 1=Tier2, 2=Tier3, 3=Tier4, 4=Tier5)
    /// @param revenueThreshold Revenue threshold to unlock (0 for Tier1)
    /// @param developer Address of the skill developer
    function registerSkill(
        bytes32 skillId,
        uint8 tier,
        uint256 revenueThreshold,
        address developer
    ) external;

    /// @notice Unlock a skill for an avatar (requires meeting revenue threshold)
    /// @param avatarId The avatar NFT token ID
    /// @param skillId The skill to unlock
    function unlockSkill(uint256 avatarId, bytes32 skillId) external;

    /// @notice Check if a skill is unlocked for an avatar
    /// @param avatarId The avatar NFT token ID
    /// @param skillId The skill to check
    /// @return status The current unlock status
    function getSkillStatus(uint256 avatarId, bytes32 skillId) external view returns (SkillStatus status);

    /// @notice Get skill information
    /// @param skillId The skill identifier
    /// @return info The skill registration data
    function getSkillInfo(bytes32 skillId) external view returns (SkillInfo memory info);
}
