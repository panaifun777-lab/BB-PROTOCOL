// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISplitter.sol";
import "./interfaces/IAvatarCore.sol";
import "./libraries/MathUtils.sol";
import "./libraries/Errors.sol";

/// @title DynamicSplitter — Revenue splitting with dynamic adjustment
/// @notice Splits revenue 70/20/10 (human/avatar/protocol) with dynamic avatar BPS
/// @dev Avatar BPS adjusts based on resonance score: avatarAdj = clamp((70 - score) × 50, 1500, 2500)
contract DynamicSplitter is ISplitter, Ownable, ReentrancyGuard {
    // ─── State Variables ──────────────────────────────────────────────

    /// @notice Reference to AvatarCore contract
    IAvatarCore public avatarCore;

    /// @notice Protocol treasury address
    address public protocolTreasury;

    /// @notice Total revenue accumulated per avatar
    mapping(uint256 => uint256) public avatarRevenue;

    /// @notice Total revenue accumulated per token address
    mapping(address => uint256) public totalTokenRevenue;

    /// @notice Supported tokens for splitting (address(0) = ETH)
    mapping(address => bool) public supportedTokens;

    // ─── Constructor ──────────────────────────────────────────────────

    constructor(address _avatarCore, address _protocolTreasury) Ownable(msg.sender) {
        if (_avatarCore == address(0) || _protocolTreasury == address(0)) {
            revert Errors.ZeroAddress();
        }
        avatarCore = IAvatarCore(_avatarCore);
        protocolTreasury = _protocolTreasury;
        // ETH is supported by default
        supportedTokens[address(0)] = true;
    }

    // ─── External Functions ───────────────────────────────────────────

    /// @inheritdoc ISplitter
    function executeSplit(
        address token,
        uint256 amount,
        uint256 avatarId
    ) external override nonReentrant returns (SplitResult memory result) {
        if (amount == 0) revert Errors.ZeroAmount();
        if (!supportedTokens[token]) revert Errors.TokenNotSupported(token);

        // Verify avatar exists and get resonance score
        IAvatarCore.AvatarProfile memory profile;
        try avatarCore.getAvatarProfile(avatarId) returns (IAvatarCore.AvatarProfile memory p) {
            profile = p;
        } catch {
            revert Errors.AvatarNotFoundForSplit(avatarId);
        }

        // Check circuit state — SOFT_LIMIT blocks high-risk, HARD_PAUSE blocks all
        if (profile.circuitState == IAvatarCore.CircuitState.HARD_PAUSE) {
            revert Errors.AvatarFrozen(avatarId);
        }

        // Calculate dynamic split config based on resonance score
        (uint256 humanBps, uint256 avatarBps, uint256 protocolBps) =
            MathUtils.calculateSplitConfig(profile.resonanceScore);

        result.config = SplitConfig({
            humanBps: humanBps,
            avatarBps: avatarBps,
            protocolBps: protocolBps
        });

        // Split amounts with conservation invariant
        (uint256 humanAmount, uint256 avatarAmount, uint256 protocolAmount) =
            MathUtils.splitAmount(amount, humanBps, avatarBps, protocolBps);

        result.humanAmount = humanAmount;
        result.avatarAmount = avatarAmount;
        result.protocolAmount = protocolAmount;

        // Transfer funds
        if (token == address(0)) {
            // ETH split
            (bool hOk,) = payable(profile.owner).call{value: humanAmount}("");
            if (!hOk) revert Errors.TransferFailed();
            (bool pOk,) = payable(protocolTreasury).call{value: protocolAmount}("");
            if (!pOk) revert Errors.TransferFailed();
            // Avatar amount stays in contract for avatar vault
        } else {
            // ERC-20 split
            IERC20 erc20 = IERC20(token);
            if (!erc20.transfer(profile.owner, humanAmount)) revert Errors.TransferFailed();
            if (!erc20.transfer(protocolTreasury, protocolAmount)) revert Errors.TransferFailed();
            // Avatar amount stays in contract for avatar vault
        }

        // Update revenue tracking
        avatarRevenue[avatarId] += amount;
        totalTokenRevenue[token] += amount;

        emit RevenueSplit(token, amount, humanBps, avatarBps, protocolBps);
        emit SplitConfigUpdated(avatarId, humanBps, avatarBps, protocolBps);
    }

    /// @inheritdoc ISplitter
    function getSplitConfig(uint256 avatarId) external view override returns (SplitConfig memory config) {
        // Verify avatar exists
        IAvatarCore.AvatarProfile memory profile = avatarCore.getAvatarProfile(avatarId);

        (uint256 humanBps, uint256 avatarBps, uint256 protocolBps) =
            MathUtils.calculateSplitConfig(profile.resonanceScore);

        config = SplitConfig({
            humanBps: humanBps,
            avatarBps: avatarBps,
            protocolBps: protocolBps
        });
    }

    /// @inheritdoc ISplitter
    function getAvatarRevenue(uint256 avatarId) external view override returns (uint256) {
        return avatarRevenue[avatarId];
    }

    // ─── Admin Functions ──────────────────────────────────────────────

    /// @notice Add or remove a supported token
    /// @param token The token address
    /// @param supported Whether the token is supported
    function setTokenSupport(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
    }

    /// @notice Update the protocol treasury address
    /// @param newTreasury The new treasury address
    function setProtocolTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert Errors.ZeroAddress();
        protocolTreasury = newTreasury;
    }

    /// @notice Update the AvatarCore contract reference
    /// @param newAvatarCore The new AvatarCore contract address
    function setAvatarCore(address newAvatarCore) external onlyOwner {
        if (newAvatarCore == address(0)) revert Errors.ZeroAddress();
        avatarCore = IAvatarCore(newAvatarCore);
    }

    /// @notice Allow the contract to receive ETH
    receive() external payable {}
}
