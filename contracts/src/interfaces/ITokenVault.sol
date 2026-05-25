// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ITokenVault — LP staking and token management interface
/// @notice Defines the interface for deposit/withdraw with LP token minting
interface ITokenVault {
    // ─── Structs ──────────────────────────────────────────────────────

    /// @notice Vault state information
    struct VaultState {
        uint256 totalDeposits;    // Total tokens deposited
        uint256 lpSupply;         // Total LP tokens in circulation
        uint256 utilizationRate;  // Utilization rate in BPS
    }

    // ─── Events ───────────────────────────────────────────────────────

    /// @notice Emitted when a deposit is made
    event Deposited(
        address indexed token,
        address indexed depositor,
        uint256 amount,
        uint256 lpMinted
    );

    /// @notice Emitted when a withdrawal is made
    event Withdrawn(
        address indexed token,
        address indexed withdrawer,
        uint256 lpBurned,
        uint256 amountWithdrawn
    );

    /// @notice Emitted when a flash loan attempt is detected
    event FlashLoanBlocked(
        address indexed depositor,
        uint256 blockNumber
    );

    // ─── Functions ────────────────────────────────────────────────────

    /// @notice Deposit tokens and receive LP tokens (0.95x multiplier)
    /// @param token The ERC-20 token address
    /// @param amount The amount to deposit
    /// @return lpAmount The LP tokens minted
    function deposit(address token, uint256 amount) external returns (uint256 lpAmount);

    /// @notice Withdraw tokens by burning LP tokens (1.05x multiplier)
    /// @param token The ERC-20 token address
    /// @param lpAmount The LP tokens to burn
    /// @return withdrawAmount The tokens withdrawn
    function withdraw(address token, uint256 lpAmount) external returns (uint256 withdrawAmount);

    /// @notice Get the current vault state
    /// @return state The vault state information
    function getVaultState() external view returns (VaultState memory state);
}
