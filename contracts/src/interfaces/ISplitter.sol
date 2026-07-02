// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ISplitter — Dynamic revenue splitting interface
/// @notice Defines the interface for the 70/20/10 dynamic revenue splitter
interface ISplitter {
    // ─── Structs ──────────────────────────────────────────────────────

    /// @notice Split configuration with BPS ratios
    struct SplitConfig {
        uint256 humanBps;     // Human share in basis points
        uint256 avatarBps;    // Avatar vault share in basis points
        uint256 protocolBps;  // Protocol share in basis points
    }

    /// @notice Result of a revenue split execution
    struct SplitResult {
        uint256 humanAmount;     // Amount sent to human
        uint256 avatarAmount;    // Amount sent to avatar vault
        uint256 protocolAmount;  // Amount sent to protocol
        SplitConfig config;      // The BPS config used for this split
    }

    // ─── Events ───────────────────────────────────────────────────────

    /// @notice Emitted when revenue is split
    event RevenueSplit(
        address indexed token,
        uint256 amount,
        uint256 humanBps,
        uint256 avatarBps,
        uint256 protocolBps
    );

    /// @notice Emitted when split config is updated for an avatar
    event SplitConfigUpdated(
        uint256 indexed avatarId,
        uint256 humanBps,
        uint256 avatarBps,
        uint256 protocolBps
    );

    // ─── Functions ────────────────────────────────────────────────────

    /// @notice Execute a revenue split for an avatar
    /// @param token The ERC-20 token address (address(0) for ETH)
    /// @param amount The total amount to split
    /// @param avatarId The avatar NFT token ID
    /// @return result The split result with amounts and config
    function executeSplit(address token, uint256 amount, uint256 avatarId)
        external
        returns (SplitResult memory result);

    /// @notice Get the current split configuration for an avatar
    /// @param avatarId The avatar NFT token ID
    /// @return config The current BPS split configuration
    function getSplitConfig(uint256 avatarId) external view returns (SplitConfig memory config);

    /// @notice Get the total revenue accumulated for an avatar
    /// @param avatarId The avatar NFT token ID
    /// @return totalRevenue The total revenue in wei
    function getAvatarRevenue(uint256 avatarId) external view returns (uint256 totalRevenue);
}
