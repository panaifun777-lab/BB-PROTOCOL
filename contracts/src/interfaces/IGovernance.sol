// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IGovernance — Governance interface for the BB Protocol
/// @notice Defines the interface for proposal creation, voting, and execution with timelock
interface IGovernance {
    // ─── Enums ────────────────────────────────────────────────────────

    /// @notice Proposal state lifecycle
    enum ProposalState {
        PENDING,     // Created, waiting for voting period start
        ACTIVE,      // Voting is open
        CANCELLED,   // Cancelled by proposer or guardian
        DEFEATED,    // Voting ended, quorum not reached or majority against
        SUCCEEDED,   // Voting ended, quorum reached and majority for
        QUEUED,      // In timelock, waiting for execution
        EXPIRED,     // Timelock expired without execution
        EXECUTED     // Successfully executed
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
        uint256 forVotes;            // Votes in favor (18-decimal)
        uint256 againstVotes;        // Votes against (18-decimal)
        uint256 abstainVotes;        // Abstain votes (18-decimal)
        bool executed;               // Whether executed
        bool cancelled;              // Whether cancelled
    }

    // ─── Events ───────────────────────────────────────────────────────

    /// @notice Emitted when a new proposal is created
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        address[] targets,
        uint256[] values,
        bytes[] calldatas,
        uint256 voteStart,
        uint256 voteEnd
    );

    /// @notice Emitted when a vote is cast
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint8 support,
        uint256 weight,
        string reason
    );

    /// @notice Emitted when a proposal is executed
    event ProposalExecuted(uint256 indexed proposalId);

    /// @notice Emitted when a proposal is cancelled
    event ProposalCancelled(uint256 indexed proposalId);

    /// @notice Emitted when a proposal is queued in timelock
    event ProposalQueued(uint256 indexed proposalId, uint256 eta);

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

    /// @notice Cast a vote with a reason
    /// @param proposalId The proposal ID
    /// @param support 0=against, 1=for, 2=abstain
    /// @param reason The reason for the vote
    function castVoteWithReason(uint256 proposalId, uint8 support, string calldata reason) external;

    /// @notice Execute a passed proposal after timelock
    /// @param proposalId The proposal ID
    function execute(uint256 proposalId) external;

    /// @notice Cancel a proposal
    /// @param proposalId The proposal ID
    function cancel(uint256 proposalId) external;

    /// @notice Get the state of a proposal
    /// @param proposalId The proposal ID
    /// @return state The current proposal state
    function state(uint256 proposalId) external view returns (ProposalState state);

    /// @notice Get the proposal details
    /// @param proposalId The proposal ID
    /// @return proposal The proposal data
    function getProposal(uint256 proposalId) external view returns (Proposal memory proposal);
}
