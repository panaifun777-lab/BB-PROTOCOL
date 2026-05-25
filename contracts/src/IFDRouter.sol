// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IIFDRouter.sol";
import "./libraries/MathUtils.sol";
import "./libraries/Errors.sol";

/// @title IFDRouter — Interactive Fluid Democracy delegation router
/// @notice Implements weighted vote delegation with depth-limited transitive delegation and weight decay
/// @dev Max depth 3, weight decay 0.8^n, BPS-based weight system
contract IFDRouter is IIFDRouter, Ownable {
    // ─── Constants ────────────────────────────────────────────────────

    /// @notice Maximum delegation depth (transitive chain length)
    uint256 public constant MAX_DEPTH = 3;

    /// @notice Weight decay denominator (0.8 = 8/10)
    uint256 public constant DECAY_NUMERATOR = 8;
    uint256 public constant DECAY_DENOMINATOR = 10;

    /// @notice BPS base for weight calculations
    uint256 public constant WEIGHT_BPS = 10_000;

    // ─── State Variables ──────────────────────────────────────────────

    /// @notice Mapping from delegator to their active delegations
    mapping(address => mapping(address => Delegation)) private _delegations;

    /// @notice Mapping from delegator to list of delegate addresses
    mapping(address => address[]) private _delegateList;

    /// @notice Mapping from delegate to accumulated incoming weight
    mapping(address => uint256) private _incomingWeight;

    /// @notice Mapping from voter to whether they have voted on a proposal
    mapping(uint256 => mapping(address => bool)) private _hasVoted;

    /// @notice Mapping from proposal to vote results
    mapping(uint256 => uint256) private _proposalForVotes;
    mapping(uint256 => uint256) private _proposalAgainstVotes;

    /// @notice Total proposals tracked
    uint256 public proposalCount;

    /// @notice Mapping from delegator to delegate for quick lookup
    mapping(address => address) private _primaryDelegate;

    // ─── Constructor ──────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── External Functions ───────────────────────────────────────────

    /// @inheritdoc IIFDRouter
    function delegateVote(address delegate, uint256 weight) external override {
        if (delegate == msg.sender) revert Errors.SelfDelegation();
        if (delegate == address(0)) revert Errors.ZeroAddress();
        if (weight == 0 || weight > WEIGHT_BPS) revert Errors.InvalidWeight(weight);

        // Check for circular delegation (delegate → delegator)
        if (_primaryDelegate[delegate] == msg.sender) {
            revert Errors.CircularDelegation(msg.sender, delegate);
        }

        // Check delegation depth would not exceed max
        _checkDelegationDepth(delegate, 1);

        Delegation storage existing = _delegations[msg.sender][delegate];

        if (!existing.active) {
            // New delegation
            _delegateList[msg.sender].push(delegate);
            _delegations[msg.sender][delegate] = Delegation({
                delegate: delegate,
                weight: weight,
                active: true
            });
            _incomingWeight[delegate] += weight;
        } else {
            // Update existing delegation
            uint256 oldWeight = existing.weight;
            _incomingWeight[delegate] = _incomingWeight[delegate] - oldWeight + weight;
            existing.weight = weight;
        }

        _primaryDelegate[msg.sender] = delegate;

        emit VoteDelegated(msg.sender, delegate, weight);
    }

    /// @inheritdoc IIFDRouter
    function revokeDelegation(address delegate) external override {
        Delegation storage existing = _delegations[msg.sender][delegate];
        if (!existing.active) revert Errors.DelegationNotFound(msg.sender, delegate);

        uint256 weight = existing.weight;
        _incomingWeight[delegate] -= weight;

        delete _delegations[msg.sender][delegate];
        _primaryDelegate[msg.sender] = address(0);

        // Remove from delegate list
        _removeFromDelegateList(msg.sender, delegate);

        emit DelegationRevoked(msg.sender, delegate);
    }

    /// @inheritdoc IIFDRouter
    function executeRoutedVote(uint256 proposalId, bool support) external override {
        if (_hasVoted[proposalId][msg.sender]) {
            revert Errors.AlreadyVoted(msg.sender, proposalId);
        }

        // Calculate effective weight including delegated weight with decay
        uint256 effectiveWeight = getEffectiveWeight(msg.sender);

        _hasVoted[proposalId][msg.sender] = true;

        if (support) {
            _proposalForVotes[proposalId] += effectiveWeight;
        } else {
            _proposalAgainstVotes[proposalId] += effectiveWeight;
        }

        emit RoutedVoteExecuted(proposalId, msg.sender, support, effectiveWeight);
    }

    /// @inheritdoc IIFDRouter
    function getDelegationGraph(address voter) external view override returns (DelegationNode[] memory chain) {
        // Build delegation chain up to MAX_DEPTH
        DelegationNode[] memory tempChain = new DelegationNode[](MAX_DEPTH);
        uint256 count;
        address current = voter;

        for (uint256 i = 0; i < MAX_DEPTH; i++) {
            address primary = _primaryDelegate[current];
            if (primary == address(0)) break;

            Delegation storage del = _delegations[current][primary];
            if (!del.active) break;

            uint256 decayedWeight = MathUtils.applyWeightDecay(del.weight, i + 1);
            tempChain[i] = DelegationNode({
                delegate: primary,
                weight: decayedWeight,
                level: i + 1
            });
            count++;
            current = primary;
        }

        chain = new DelegationNode[](count);
        for (uint256 i = 0; i < count; i++) {
            chain[i] = tempChain[i];
        }
    }

    /// @inheritdoc IIFDRouter
    function getEffectiveWeight(address voter) public view returns (uint256 totalWeight) {
        // Base weight is 1 unit (10_000 BPS = 1 full vote)
        totalWeight = WEIGHT_BPS;

        // Add incoming delegated weight with decay
        // Direct delegators (level 1): 0.8x decay
        // Transitive delegators (level 2): 0.64x decay
        // Transitive delegators (level 3): 0.512x decay
        totalWeight += _calculateIncomingWeight(voter, 1);
    }

    // ─── View Functions ───────────────────────────────────────────────

    /// @notice Get the vote counts for a proposal
    /// @param proposalId The proposal ID
    /// @return forVotes Votes in favor
    /// @return againstVotes Votes against
    function getProposalVotes(uint256 proposalId) external view returns (uint256 forVotes, uint256 againstVotes) {
        return (_proposalForVotes[proposalId], _proposalAgainstVotes[proposalId]);
    }

    /// @notice Check if an address has voted on a proposal
    /// @param proposalId The proposal ID
    /// @param voter The voter address
    /// @return voted True if the voter has voted
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return _hasVoted[proposalId][voter];
    }

    /// @notice Get the primary delegate for a delegator
    /// @param delegator The delegator address
    /// @return delegate The primary delegate address (address(0) if none)
    function getPrimaryDelegate(address delegator) external view returns (address) {
        return _primaryDelegate[delegator];
    }

    /// @notice Get the incoming weight for a delegate
    /// @param delegate The delegate address
    /// @return weight The accumulated incoming weight
    function getIncomingWeight(address delegate) external view returns (uint256) {
        return _incomingWeight[delegate];
    }

    // ─── Internal Functions ───────────────────────────────────────────

    /// @dev Recursively calculate incoming delegated weight with decay
    function _calculateIncomingWeight(address delegate, uint256 level) internal view returns (uint256 weight) {
        if (level > MAX_DEPTH) return 0;

        // Check all delegators to this delegate
        // For gas efficiency, we use _incomingWeight which tracks direct delegations
        // and apply decay based on level
        uint256 directWeight = _incomingWeight[delegate];
        if (directWeight == 0) return 0;

        weight = MathUtils.applyWeightDecay(directWeight, level);

        // Recurse for transitive delegations
        address primaryDel = _primaryDelegate[delegate];
        if (primaryDel != address(0) && level < MAX_DEPTH) {
            weight += _calculateIncomingWeight(primaryDel, level + 1);
        }
    }

    /// @dev Check that delegation chain depth does not exceed MAX_DEPTH
    function _checkDelegationDepth(address delegate, uint256 currentDepth) internal view {
        if (currentDepth > MAX_DEPTH) {
            revert Errors.MaxDelegationDepthExceeded(currentDepth);
        }

        address primary = _primaryDelegate[delegate];
        if (primary != address(0)) {
            _checkDelegationDepth(primary, currentDepth + 1);
        }
    }

    /// @dev Remove a delegate from the delegate list
    function _removeFromDelegateList(address delegator, address delegate) internal {
        address[] storage list = _delegateList[delegator];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == delegate) {
                list[i] = list[list.length - 1];
                list.pop();
                return;
            }
        }
    }
}
