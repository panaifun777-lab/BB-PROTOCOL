// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISkillVault.sol";
import "./interfaces/ISplitter.sol";
import "./libraries/Errors.sol";

/// @title SkillVault — Skill registry with revenue-gated unlock
/// @notice Manages skill registration and unlocking based on revenue thresholds
/// @dev 5 Tiers with predefined revenue thresholds: Tier1(0), Tier2($500), Tier3($2000), Tier4($8000), Tier5($30000)
contract SkillVault is ISkillVault, Ownable {
    // ─── Constants ────────────────────────────────────────────────────

    /// @notice Maximum tier level (0-indexed)
    uint8 public constant MAX_TIER = 4;

    /// @notice Revenue thresholds for each tier in 18-decimal USD
    uint256[5] public TIER_THRESHOLDS = [
        0,                      // Tier1: Free
        500e18,                 // Tier2: $500
        2000e18,                // Tier3: $2,000
        8000e18,                // Tier4: $8,000
        30000e18                // Tier5: $30,000
    ];

    // ─── State Variables ──────────────────────────────────────────────

    /// @notice Reference to DynamicSplitter for revenue checks
    ISplitter public splitter;

    /// @notice Mapping from skill ID to skill info
    mapping(bytes32 => SkillInfo) private _skills;

    /// @notice Mapping from (avatarId, skillId) to unlock status
    mapping(uint256 => mapping(bytes32 => SkillStatus)) private _avatarSkills;

    /// @notice Count of skills unlocked per avatar
    mapping(uint256 => uint256) public unlockedSkillCount;

    // ─── Constructor ──────────────────────────────────────────────────

    constructor(address _splitter) Ownable(msg.sender) {
        if (_splitter == address(0)) revert Errors.ZeroAddress();
        splitter = ISplitter(_splitter);
    }

    // ─── External Functions ───────────────────────────────────────────

    /// @inheritdoc ISkillVault
    function registerSkill(
        bytes32 skillId,
        uint8 tier,
        uint256 revenueThreshold,
        address developer
    ) external override onlyOwner {
        if (_skills[skillId].registered) revert Errors.SkillAlreadyRegistered(skillId);
        if (tier > MAX_TIER) revert Errors.InvalidTier(tier);
        if (developer == address(0)) revert Errors.ZeroAddress();

        // Validate revenue threshold matches tier requirements
        if (revenueThreshold < TIER_THRESHOLDS[tier]) {
            revert Errors.InvalidRevenueThreshold(tier, revenueThreshold);
        }

        _skills[skillId] = SkillInfo({
            skillId: skillId,
            tier: tier,
            revenueThreshold: revenueThreshold,
            developer: developer,
            registered: true
        });

        emit SkillRegistered(skillId, tier, revenueThreshold, developer);
    }

    /// @inheritdoc ISkillVault
    function unlockSkill(uint256 avatarId, bytes32 skillId) external override {
        if (!_skills[skillId].registered) revert Errors.SkillNotFound(skillId);

        if (_avatarSkills[avatarId][skillId] == SkillStatus.UNLOCKED) {
            revert Errors.SkillAlreadyUnlocked(avatarId, skillId);
        }

        // Check revenue threshold via DynamicSplitter
        uint256 currentRevenue = splitter.getAvatarRevenue(avatarId);
        uint256 threshold = _skills[skillId].revenueThreshold;

        if (currentRevenue < threshold) {
            revert Errors.SkillLocked(skillId, threshold, currentRevenue);
        }

        _avatarSkills[avatarId][skillId] = SkillStatus.UNLOCKED;
        unchecked {
            unlockedSkillCount[avatarId]++;
        }

        emit SkillUnlocked(avatarId, skillId, currentRevenue);
    }

    /// @inheritdoc ISkillVault
    function getSkillStatus(uint256 avatarId, bytes32 skillId) external view override returns (SkillStatus) {
        if (!_skills[skillId].registered) return SkillStatus.LOCKED;
        return _avatarSkills[avatarId][skillId];
    }

    /// @inheritdoc ISkillVault
    function getSkillInfo(bytes32 skillId) external view override returns (SkillInfo memory info) {
        if (!_skills[skillId].registered) revert Errors.SkillNotFound(skillId);
        return _skills[skillId];
    }

    // ─── View Functions ───────────────────────────────────────────────

    /// @notice Get the revenue threshold for a tier
    /// @param tier The tier level (0-4)
    /// @return threshold The revenue threshold for the tier
    function getTierThreshold(uint8 tier) external view returns (uint256 threshold) {
        if (tier > MAX_TIER) revert Errors.InvalidTier(tier);
        return TIER_THRESHOLDS[tier];
    }

    /// @notice Check if an avatar meets the revenue threshold for a skill
    /// @param avatarId The avatar NFT token ID
    /// @param skillId The skill identifier
    /// @return meetsThreshold True if the avatar meets the threshold
    /// @return currentRevenue The avatar's current revenue
    /// @return threshold The required threshold
    function checkUnlockEligibility(
        uint256 avatarId,
        bytes32 skillId
    ) external view returns (bool meetsThreshold, uint256 currentRevenue, uint256 threshold) {
        if (!_skills[skillId].registered) revert Errors.SkillNotFound(skillId);
        threshold = _skills[skillId].revenueThreshold;
        currentRevenue = splitter.getAvatarRevenue(avatarId);
        meetsThreshold = currentRevenue >= threshold;
    }

    /// @notice Update the DynamicSplitter reference
    /// @param newSplitter The new splitter contract address
    function setSplitter(address newSplitter) external onlyOwner {
        if (newSplitter == address(0)) revert Errors.ZeroAddress();
        splitter = ISplitter(newSplitter);
    }
}
