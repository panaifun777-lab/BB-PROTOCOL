// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IGovernance.sol";
import "./libraries/Errors.sol";

/// @title GovernanceToken — ERC-20Votes governance token with proposal system
/// @notice ERC-20 token with voting weight, proposal creation, voting, and timelock execution
/// @dev Quorum 4%, voting period 3 days, timelock 2 days
contract GovernanceToken is ERC20, ERC20Permit, IGovernance, Ownable {
    // ─── Constants ────────────────────────────────────────────────────

    /// @notice Voting period: 3 days
    uint256 public constant VOTING_PERIOD = 3 days;

    /// @notice Timelock period: 2 days
    uint256 public constant TIMELOCK_PERIOD = 2 days;

    /// @notice Quorum required: 4% of total supply (in BPS)
    uint256 public constant QUORUM_BPS = 400;

    /// @notice BPS base
    uint256 internal constant BPS_BASE = 10_000;

    /// @notice Proposal threshold: 0.1% of total supply required to propose
    uint256 public constant PROPOSAL_BPS = 10;

    /// @notice Maximum number of targets in a single proposal
    uint256 public constant MAX_OPERATIONS = 10;

    // ─── State Variables ──────────────────────────────────────────────

    /// @notice Mapping from proposal ID to proposal data
    mapping(uint256 => Proposal) private _proposals;

    /// @notice Mapping from proposal ID to voter's vote record
    mapping(uint256 => mapping(address => bool)) private _hasVoted;

    /// @notice Total number of proposals
    uint256 private _proposalCount;

    /// @notice Guardian address that can cancel proposals
    address public guardian;

    // ─── Constructor ──────────────────────────────────────────────────

    constructor(uint256 initialSupply) ERC20("BB Governance Token", "BBGOV") ERC20Permit("BB Governance Token") Ownable(msg.sender) {
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
        guardian = msg.sender;
    }

    // ─── External Functions ───────────────────────────────────────────

    /// @inheritdoc IGovernance
    function propose(
        string calldata description,
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas
    ) external override returns (uint256 proposalId) {
        if (targets.length == 0) revert Errors.EmptyProposal();
        if (targets.length != values.length || targets.length != calldatas.length) {
            revert Errors.ArrayLengthMismatch();
        }
        if (targets.length > MAX_OPERATIONS) revert Errors.EmptyProposal();

        // Check proposal threshold
        uint256 proposerVotes = balanceOf(msg.sender);
        uint256 threshold = (totalSupply() * PROPOSAL_BPS) / BPS_BASE;
        if (proposerVotes < threshold) {
            revert Errors.InsufficientVotingPower(msg.sender, threshold, proposerVotes);
        }

        _proposalCount++;
        proposalId = _proposalCount;

        uint256 voteStart = block.timestamp + 1; // Start voting next block
        uint256 voteEnd = voteStart + VOTING_PERIOD;

        _proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            description: description,
            targets: targets,
            values: values,
            calldatas: calldatas,
            voteStart: voteStart,
            voteEnd: voteEnd,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            executed: false,
            cancelled: false
        });

        emit ProposalCreated(proposalId, msg.sender, description, targets, values, calldatas, voteStart, voteEnd);
    }

    /// @inheritdoc IGovernance
    function castVote(uint256 proposalId, uint8 support) external override {
        _castVote(proposalId, support, "");
    }

    /// @inheritdoc IGovernance
    function castVoteWithReason(uint256 proposalId, uint8 support, string calldata reason) external override {
        _castVote(proposalId, support, reason);
    }

    /// @inheritdoc IGovernance
    function execute(uint256 proposalId) external override {
        ProposalState currentState = state(proposalId);

        if (currentState != ProposalState.SUCCEEDED && currentState != ProposalState.QUEUED) {
            revert Errors.VoteNotSuccessful(proposalId);
        }

        Proposal storage proposal = _proposals[proposalId];
        proposal.executed = true;

        // Execute all operations
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            (bool success,) = proposal.targets[i].call{value: proposal.values[i]}(proposal.calldatas[i]);
            if (!success) revert Errors.VoteNotSuccessful(proposalId);
        }

        emit ProposalExecuted(proposalId);
    }

    /// @inheritdoc IGovernance
    function cancel(uint256 proposalId) external override {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.id == 0) revert Errors.ProposalNotFound(proposalId);
        if (msg.sender != proposal.proposer && msg.sender != guardian && msg.sender != owner()) {
            revert Errors.Unauthorized(msg.sender);
        }

        ProposalState currentState = state(proposalId);
        if (currentState == ProposalState.EXECUTED) revert Errors.InvalidProposalState(uint8(currentState));

        proposal.cancelled = true;

        emit ProposalCancelled(proposalId);
    }

    /// @inheritdoc IGovernance
    function state(uint256 proposalId) public view override returns (ProposalState) {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.id == 0) revert Errors.ProposalNotFound(proposalId);

        if (proposal.cancelled) return ProposalState.CANCELLED;
        if (proposal.executed) return ProposalState.EXECUTED;

        if (block.timestamp < proposal.voteStart) return ProposalState.PENDING;
        if (block.timestamp < proposal.voteEnd) return ProposalState.ACTIVE;

        // Voting ended — check results
        uint256 quorumRequired = (totalSupply() * QUORUM_BPS) / BPS_BASE;
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;

        if (totalVotes < quorumRequired) return ProposalState.DEFEATED;
        if (proposal.forVotes <= proposal.againstVotes) return ProposalState.DEFEATED;

        // Check timelock
        uint256 timelockEnd = proposal.voteEnd + TIMELOCK_PERIOD;
        if (block.timestamp < timelockEnd) return ProposalState.QUEUED;

        // Check expiration (grace period of 14 days after timelock)
        uint256 expiration = timelockEnd + 14 days;
        if (block.timestamp > expiration) return ProposalState.EXPIRED;

        return ProposalState.SUCCEEDED;
    }

    /// @inheritdoc IGovernance
    function getProposal(uint256 proposalId) external view override returns (Proposal memory) {
        if (_proposals[proposalId].id == 0) revert Errors.ProposalNotFound(proposalId);
        return _proposals[proposalId];
    }

    // ─── View Functions ───────────────────────────────────────────────

    /// @notice Get the quorum required for a proposal
    /// @return quorum The quorum in token units
    function quorum() public view returns (uint256) {
        return (totalSupply() * QUORUM_BPS) / BPS_BASE;
    }

    /// @notice Get the proposal threshold to create proposals
    /// @return threshold The threshold in token units
    function proposalThreshold() public view returns (uint256) {
        return (totalSupply() * PROPOSAL_BPS) / BPS_BASE;
    }

    /// @notice Get the total number of proposals
    /// @return count The proposal count
    function proposalCount() external view returns (uint256) {
        return _proposalCount;
    }

    /// @notice Check if an address has voted on a proposal
    /// @param proposalId The proposal ID
    /// @param voter The voter address
    /// @return True if the voter has voted
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return _hasVoted[proposalId][voter];
    }

    // ─── Admin Functions ──────────────────────────────────────────────

    /// @notice Update the guardian address
    /// @param newGuardian The new guardian address
    function setGuardian(address newGuardian) external onlyOwner {
        if (newGuardian == address(0)) revert Errors.ZeroAddress();
        guardian = newGuardian;
    }

    /// @notice Mint tokens (owner only, for initial distribution)
    /// @param to The recipient address
    /// @param amount The amount to mint
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // ─── Internal Functions ───────────────────────────────────────────

    /// @dev Internal vote casting logic
    function _castVote(uint256 proposalId, uint8 support, string memory reason) internal {
        ProposalState currentState = state(proposalId);
        if (currentState != ProposalState.ACTIVE) revert Errors.ProposalNotActive(proposalId);
        if (_hasVoted[proposalId][msg.sender]) revert Errors.AlreadyVoted(msg.sender, proposalId);

        uint256 weight = balanceOf(msg.sender);
        if (weight == 0) revert Errors.InsufficientVotingPower(msg.sender, 1, 0);

        Proposal storage proposal = _proposals[proposalId];

        if (support == 0) {
            proposal.againstVotes += weight;
        } else if (support == 1) {
            proposal.forVotes += weight;
        } else if (support == 2) {
            proposal.abstainVotes += weight;
        } else {
            revert Errors.InvalidProposalState(support);
        }

        _hasVoted[proposalId][msg.sender] = true;

        emit VoteCast(proposalId, msg.sender, support, weight, reason);
    }

    // ─── Receive ─────────────────────────────────────────────────────

    /// @notice Allow contract to receive ETH for proposal execution
    receive() external payable {}
}
