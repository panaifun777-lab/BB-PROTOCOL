// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IMCPRouter — Model Context Protocol routing interface
/// @notice Defines the interface for AI model provider routing and slashing
interface IMCPRouter {
    // ─── Structs ──────────────────────────────────────────────────────

    /// @notice Provider registration data
    struct ProviderInfo {
        bytes32 providerId;     // Unique provider identifier
        address provider;       // Provider address
        uint256 stake;          // Staked tokens
        uint256 reputation;     // Reputation score [0, 10000]
        bool active;            // Whether the provider is active
    }

    /// @notice Request data
    struct RequestContext {
        bytes32 requestId;      // Unique request identifier
        bytes32 modelId;        // Model identifier
        bytes32 providerId;     // Selected provider
        address requester;      // Request origin
        uint256 createdAt;      // Creation timestamp
        bool fulfilled;         // Whether the request has been fulfilled
    }

    // ─── Events ───────────────────────────────────────────────────────

    /// @notice Emitted when a provider registers
    event ProviderRegistered(
        bytes32 indexed providerId,
        address indexed provider,
        uint256 stake
    );

    /// @notice Emitted when a request is routed
    event RequestRouted(
        bytes32 indexed requestId,
        bytes32 indexed modelId,
        bytes32 indexed providerId
    );

    /// @notice Emitted when a provider submits a response
    event ResponseSubmitted(
        bytes32 indexed requestId,
        bytes32 indexed providerId
    );

    /// @notice Emitted when a provider is slashed
    event ProviderSlashed(
        bytes32 indexed providerId,
        uint256 amount,
        bytes32 reason
    );

    // ─── Functions ────────────────────────────────────────────────────

    /// @notice Register as a model provider with stake
    /// @param providerId Unique provider identifier
    /// @param provider Provider address
    /// @param stake Amount of tokens to stake
    function registerProvider(bytes32 providerId, address provider, uint256 stake) external;

    /// @notice Route a request to the best available provider
    /// @param modelId The model to request
    /// @param input The input data (calldata for gas efficiency)
    /// @return requestId The unique request identifier
    function routeRequest(bytes32 modelId, bytes calldata input) external returns (bytes32 requestId);

    /// @notice Submit a response for a routed request
    /// @param requestId The request identifier
    /// @param response The response data
    function submitResponse(bytes32 requestId, bytes calldata response) external;

    /// @notice Slash a provider's stake for bad behavior
    /// @param providerId The provider to slash
    /// @param reason The reason for slashing
    function slashProvider(bytes32 providerId, bytes32 reason) external;
}
