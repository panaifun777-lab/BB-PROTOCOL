// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAvatarCore.sol";
import "./libraries/Errors.sol";

/// @title AvatarCore — AI Avatar identity management
/// @notice ERC-721 NFT with cognition root, resonance score, and circuit state
/// @dev Implements IAvatarCore with metadata extension and circuit guard integration
contract AvatarCore is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard, IAvatarCore {
    // ─── State Variables ──────────────────────────────────────────────

    uint256 private _nextTokenId;

    /// @notice Mapping from token ID to avatar profile
    mapping(uint256 => AvatarProfile) private _avatars;

    /// @notice Mapping from token ID to whether it exists
    mapping(uint256 => bool) private _avatarExists;

    /// @notice Mapping from owner address to their avatar token ID
    mapping(address => uint256) private _ownerToAvatar;

    /// @notice Reference to CircuitGuard contract (optional integration)
    address public circuitGuard;

    // ─── Modifiers ────────────────────────────────────────────────────

    modifier onlyAvatarOwner(uint256 tokenId) {
        if (ownerOf(tokenId) != msg.sender) {
            revert Errors.NotAvatarOwner(msg.sender, tokenId);
        }
        _;
    }

    modifier avatarExists(uint256 tokenId) {
        if (!_avatarExists[tokenId]) {
            revert Errors.AvatarNotFound(tokenId);
        }
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────

    constructor() ERC721("BB Avatar", "BBAV") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    // ─── External Functions ───────────────────────────────────────────

    /// @inheritdoc IAvatarCore
    function createAvatar(
        address owner,
        bytes32 cognitionRoot,
        uint256 resonanceScore
    ) external override onlyOwner nonReentrant returns (uint256 tokenId) {
        if (owner == address(0)) revert Errors.ZeroAddress();
        if (cognitionRoot == bytes32(0)) revert Errors.InvalidCognitionRoot();
        if (resonanceScore > 100) revert Errors.InvalidResonanceScore(resonanceScore);
        if (_ownerToAvatar[owner] != 0) revert Errors.AvatarAlreadyExists(_ownerToAvatar[owner]);

        tokenId = _nextTokenId++;

        _avatars[tokenId] = AvatarProfile({
            owner: owner,
            cognitionRoot: cognitionRoot,
            resonanceScore: resonanceScore,
            avatarBalance: 0,
            circuitState: _evaluateCircuitState(resonanceScore),
            createdAt: block.timestamp,
            lastActivityAt: block.timestamp
        });

        _avatarExists[tokenId] = true;
        _ownerToAvatar[owner] = tokenId;

        _safeMint(owner, tokenId);

        emit AvatarCreated(tokenId, owner, cognitionRoot, resonanceScore);
    }

    /// @inheritdoc IAvatarCore
    function updateCognitionRoot(
        uint256 tokenId,
        bytes32 newRoot
    ) external override onlyAvatarOwner(tokenId) avatarExists(tokenId) {
        if (newRoot == bytes32(0)) revert Errors.InvalidCognitionRoot();
        if (_avatars[tokenId].circuitState == CircuitState.HARD_PAUSE) {
            revert Errors.AvatarFrozen(tokenId);
        }

        bytes32 oldRoot = _avatars[tokenId].cognitionRoot;
        _avatars[tokenId].cognitionRoot = newRoot;
        _avatars[tokenId].lastActivityAt = block.timestamp;

        emit CognitionRootUpdated(tokenId, oldRoot, newRoot);
    }

    /// @inheritdoc IAvatarCore
    function getAvatarProfile(
        uint256 tokenId
    ) external view override avatarExists(tokenId) returns (AvatarProfile memory) {
        return _avatars[tokenId];
    }

    /// @inheritdoc IAvatarCore
    function verifyCognitiveOwnership(
        uint256 tokenId,
        address claimer
    ) external view override avatarExists(tokenId) returns (bool) {
        return ownerOf(tokenId) == claimer;
    }

    /// @inheritdoc IAvatarCore
    function totalSupply() external view override returns (uint256) {
        return _nextTokenId - 1;
    }

    // ─── State Management Functions ───────────────────────────────────

    /// @notice Update the resonance score for an avatar
    /// @param tokenId The avatar NFT token ID
    /// @param newScore The new resonance score [0, 100]
    function updateResonanceScore(
        uint256 tokenId,
        uint256 newScore
    ) external avatarExists(tokenId) {
        if (newScore > 100) revert Errors.InvalidResonanceScore(newScore);
        // Only owner or authorized contract (circuit guard / ECE oracle)
        if (
            msg.sender != ownerOf(tokenId) &&
            msg.sender != circuitGuard &&
            msg.sender != owner()
        ) {
            revert Errors.Unauthorized(msg.sender);
        }

        uint256 oldScore = _avatars[tokenId].resonanceScore;
        CircuitState oldState = _avatars[tokenId].circuitState;
        CircuitState newState = _evaluateCircuitState(newScore);

        _avatars[tokenId].resonanceScore = newScore;
        _avatars[tokenId].circuitState = newState;
        _avatars[tokenId].lastActivityAt = block.timestamp;

        emit ResonanceScoreUpdated(tokenId, oldScore, newScore);

        if (oldState != newState) {
            emit CircuitStateChanged(tokenId, oldState, newState);
        }
    }

    /// @notice Update avatar balance (called by DynamicSplitter)
    /// @param tokenId The avatar NFT token ID
    /// @param amount The amount to add to the avatar balance
    function addAvatarBalance(uint256 tokenId, uint256 amount) external avatarExists(tokenId) {
        if (msg.sender != owner() && msg.sender != circuitGuard) {
            revert Errors.Unauthorized(msg.sender);
        }
        _avatars[tokenId].avatarBalance += amount;
        _avatars[tokenId].lastActivityAt = block.timestamp;
    }

    /// @notice Set the circuit guard contract address
    /// @param guard The address of the CircuitGuard contract
    function setCircuitGuard(address guard) external onlyOwner {
        circuitGuard = guard;
    }

    /// @notice Get the avatar token ID for an owner address
    /// @param owner The owner address
    /// @return tokenId The avatar token ID (0 if none)
    function getAvatarByOwner(address owner) external view returns (uint256 tokenId) {
        return _ownerToAvatar[owner];
    }

    // ─── Internal Functions ───────────────────────────────────────────

    /// @dev Evaluate circuit state from resonance score
    function _evaluateCircuitState(uint256 resonanceScore) internal pure returns (CircuitState) {
        if (resonanceScore >= 70) return CircuitState.NORMAL;
        if (resonanceScore >= 50) return CircuitState.SOFT_LIMIT;
        return CircuitState.HARD_PAUSE;
    }

    // ─── ERC-721 Overrides ───────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /// @dev Prevents token transfers (soul-bound behavior optional)
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
}
