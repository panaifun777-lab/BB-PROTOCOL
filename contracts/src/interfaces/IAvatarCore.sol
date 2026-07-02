// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAvatarCore — AI Avatar identity management interface
/// @notice Defines the core interface for AI Avatar NFT creation and management
interface IAvatarCore {
    // ─── Structs ──────────────────────────────────────────────────────

    /// @notice Circuit state for cognitive overload protection
    enum CircuitState {
        NORMAL,      // resonanceScore >= 70 — no restrictions
        SOFT_LIMIT,  // 50 <= resonanceScore < 70 — high-risk actions blocked
        HARD_PAUSE   // resonanceScore < 50 — full pause, multi-sig recovery
    }

    /// @notice Complete avatar profile data
    struct AvatarProfile {
        address owner;           // Human owner address
        bytes32 cognitionRoot;   // Cognitive state root hash
        uint256 resonanceScore;  // Emotional resonance index [0, 100]
        uint256 avatarBalance;   // Avatar autonomous vault balance (wei)
        CircuitState circuitState; // Current circuit breaker state
        uint256 createdAt;       // Creation timestamp
        uint256 lastActivityAt;  // Last activity timestamp
    }

    // ─── Events ───────────────────────────────────────────────────────

    /// @notice Emitted when a new avatar is created
    event AvatarCreated(
        uint256 indexed tokenId,
        address indexed owner,
        bytes32 cognitionRoot,
        uint256 resonanceScore
    );

    /// @notice Emitted when a cognition root is updated
    event CognitionRootUpdated(
        uint256 indexed tokenId,
        bytes32 indexed oldRoot,
        bytes32 indexed newRoot
    );

    /// @notice Emitted when a resonance score changes
    event ResonanceScoreUpdated(
        uint256 indexed tokenId,
        uint256 oldScore,
        uint256 newScore
    );

    /// @notice Emitted when circuit state changes
    event CircuitStateChanged(
        uint256 indexed tokenId,
        CircuitState fromState,
        CircuitState toState
    );

    // ─── Functions ────────────────────────────────────────────────────

    /// @notice Create a new AI Avatar NFT
    /// @param owner The address that will own the avatar
    /// @param cognitionRoot Initial cognitive state root hash
    /// @param resonanceScore Initial resonance score [0, 100]
    /// @return tokenId The ID of the newly minted avatar NFT
    function createAvatar(
        address owner,
        bytes32 cognitionRoot,
        uint256 resonanceScore
    ) external returns (uint256 tokenId);

    /// @notice Update the cognition root of an avatar
    /// @param tokenId The avatar NFT token ID
    /// @param newRoot The new cognitive state root hash
    function updateCognitionRoot(uint256 tokenId, bytes32 newRoot) external;

    /// @notice Get the full avatar profile
    /// @param tokenId The avatar NFT token ID
    /// @return The complete avatar profile struct
    function getAvatarProfile(uint256 tokenId) external view returns (AvatarProfile memory);

    /// @notice Verify cognitive ownership of an avatar
    /// @param tokenId The avatar NFT token ID
    /// @param claimer The address claiming ownership
    /// @return True if the claimer is the avatar owner
    function verifyCognitiveOwnership(uint256 tokenId, address claimer) external view returns (bool);

    /// @notice Get the total number of avatars minted
    /// @return The total supply of avatar NFTs
    function totalSupply() external view returns (uint256);
}
