// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IGovernanceToken — Governance and utility token interface
/// @notice Defines the interface for the BB Protocol governance token
interface IGovernanceToken {
    // ─── Enums ────────────────────────────────────────────────────────

    /// @notice Proposal state
    enum ProposalState {
        PENDING,
        ACTIVE,
        CANCELLED,
        DEFEATED,
        SUCCEEDED,
        QUEUED,
        EXPIRED,
        EXECUTED
    }

    // ─── Structs ──────────────────────────────────────────────────────

    /// @notice Proposal data
    struct Proposal {
        uint256 id;                  // Proposal ID
        address proposer;            // Proposal creator
        string description;          // Proposal description
        address[] targets;           // Contract targets for execution
        uint256[] values;            // ETH values for execution
        bytes[] calldatas;           // Calldata for execution
        uint256 voteStart;           // Voting start timestamp
        uint256 voteEnd;             // Voting end timestamp
        uint256 forVotes;            // Votes in favor
        uint256 againstVotes;        // Votes against
        uint256 abstainVotes;        // Abstain votes
        bool executed;               // Whether executed
        bool cancelled;              // Whether cancelled
    }

    // ─── Events ───────────────────────────────────────────────────────

    /// @notice Emitted when a new proposal is created
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description
    );

    /// @notice Emitted when a vote is cast
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint8 support,
        uint256 weight
    );

    /// @notice Emitted when a proposal is executed
    event ProposalExecuted(uint256 indexed proposalId);

    // ─── Functions ────────────────────────────────────────────────────

    /// @notice Create a new governance proposal
    /// @param description Proposal description
    /// @param targets Contract addresses to call
    /// @param values ETH values to send
    /// @param calldatas Function call data
    /// @return proposalId The ID of the new proposal
    function propose(
        string calldata description,
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas
    ) external returns (uint256 proposalId);

    /// @notice Cast a vote on a proposal
    /// @param proposalId The proposal ID
    /// @param support 0=against, 1=for, 2=abstain
    function castVote(uint256 proposalId, uint8 support) external;

    /// @notice Execute a passed proposal
    /// @param proposalId The proposal ID
    function execute(uint256 proposalId) external;

    /// @notice Get the state of a proposal
    /// @param proposalId The proposal ID
    /// @return state The current proposal state
    function state(uint256 proposalId) external view returns (ProposalState state);
}
