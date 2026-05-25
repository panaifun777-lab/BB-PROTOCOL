// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IIFDRouter — Interactive Fluid Democracy delegation interface
/// @notice Defines the interface for weighted vote delegation with decay
interface IIFDRouter {
    // ─── Structs ──────────────────────────────────────────────────────

    /// @notice Delegation entry
    struct Delegation {
        address delegate;     // The delegate address
        uint256 weight;       // Delegation weight in BPS
        bool active;          // Whether the delegation is active
    }

    /// @notice Delegation chain node
    struct DelegationNode {
        address delegate;
        uint256 weight;
        uint256 level;
    }

    // ─── Events ───────────────────────────────────────────────────────

    /// @notice Emitted when a vote is delegated
    event VoteDelegated(
        address indexed delegator,
        address indexed delegate,
        uint256 weight
    );

    /// @notice Emitted when a delegation is revoked
    event DelegationRevoked(
        address indexed delegator,
        address indexed delegate
    );

    /// @notice Emitted when a routed vote is executed
    event RoutedVoteExecuted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 totalWeight
    );

    // ─── Functions ────────────────────────────────────────────────────

    /// @notice Delegate vote weight to another address
    /// @param delegate The address to delegate to
    /// @param weight The delegation weight
    function delegateVote(address delegate, uint256 weight) external;

    /// @notice Revoke an existing delegation
    /// @param delegate The delegate to revoke
    function revokeDelegation(address delegate) external;

    /// @notice Execute a vote with accumulated delegated weight
    /// @param proposalId The proposal to vote on
    /// @param support True for yes, false for no
    function executeRoutedVote(uint256 proposalId, bool support) external;

    /// @notice Get the full delegation graph for a voter
    /// @param voter The voter address
    /// @return chain The delegation chain (up to 3 levels)
    function getDelegationGraph(address voter) external view returns (DelegationNode[] memory chain);

    /// @notice Get the effective voting weight for an address (including delegated)
    /// @param voter The voter address
    /// @return totalWeight The total effective voting weight
    function getEffectiveWeight(address voter) external view returns (uint256 totalWeight);
}
