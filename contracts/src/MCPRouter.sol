// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IMCPRouter.sol";
import "./libraries/Errors.sol";

/// @title MCPRouter — Model Context Protocol routing contract
/// @notice Routes AI model inference requests to the best available provider, with slashing
/// @dev Provider selection based on reputation + stake; slashing for bad responses
contract MCPRouter is IMCPRouter, AccessControl {
    // ─── Constants ────────────────────────────────────────────────────

    /// @notice Minimum stake required to register as a provider (18-decimal)
    uint256 public constant MIN_STAKE = 1_000e18;

    /// @notice Slashing percentage in BPS (50% = 5000 BPS)
    uint256 public constant SLASH_BPS = 5_000;

    /// @notice BPS base
    uint256 internal constant BPS_BASE = 10_000;

    /// @notice Maximum request timeout (1 hour)
    uint256 public constant MAX_REQUEST_TIMEOUT = 1 hours;

    // ─── Roles ────────────────────────────────────────────────────────

    /// @notice Role for slashing authority
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");

    // ─── State Variables ──────────────────────────────────────────────

    /// @notice Mapping from provider ID to provider info
    mapping(bytes32 => ProviderInfo) private _providers;

    /// @notice Mapping from provider address to provider ID
    mapping(address => bytes32) private _addressToProviderId;

    /// @notice Mapping from request ID to request context
    mapping(bytes32 => RequestContext) private _requests;

    /// @notice Mapping from model ID to array of provider IDs
    mapping(bytes32 => bytes32[]) private _modelProviders;

    /// @notice Total requests routed
    uint256 public totalRequests;

    /// @notice Total providers slashed
    uint256 public totalSlashed;

    /// @notice Staking token address
    IERC20 public stakeToken;

    /// @notice Slashed funds recipient
    address public slashRecipient;

    /// @notice Nonce for request ID generation
    uint256 private _requestNonce;

    // ─── Constructor ──────────────────────────────────────────────────

    constructor(address _stakeToken, address _slashRecipient) {
        if (_stakeToken == address(0) || _slashRecipient == address(0)) revert Errors.ZeroAddress();
        stakeToken = IERC20(_stakeToken);
        slashRecipient = _slashRecipient;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SLASHER_ROLE, msg.sender);
    }

    // ─── External Functions ───────────────────────────────────────────

    /// @inheritdoc IMCPRouter
    function registerProvider(bytes32 providerId, address provider, uint256 stake) external override {
        if (_providers[providerId].active) revert Errors.ProviderAlreadyRegistered(providerId);
        if (provider == address(0)) revert Errors.ZeroAddress();
        if (stake < MIN_STAKE) revert Errors.InsufficientStake(providerId, MIN_STAKE, stake);
        if (_addressToProviderId[provider] != bytes32(0)) revert Errors.ProviderAlreadyRegistered(providerId);

        // Transfer stake tokens
        uint256 balanceBefore = stakeToken.balanceOf(address(this));
        if (!stakeToken.transferFrom(msg.sender, address(this), stake)) revert Errors.TransferFailed();
        uint256 received = stakeToken.balanceOf(address(this)) - balanceBefore;

        _providers[providerId] = ProviderInfo({
            providerId: providerId,
            provider: provider,
            stake: received,
            reputation: 5_000, // Start at 50% reputation (out of 10_000)
            active: true
        });

        _addressToProviderId[provider] = providerId;

        emit ProviderRegistered(providerId, provider, received);
    }

    /// @inheritdoc IMCPRouter
    function routeRequest(bytes32 modelId, bytes calldata input) external override returns (bytes32 requestId) {
        // Select best provider
        bytes32 bestProvider = _selectProvider(modelId);
        if (bestProvider == bytes32(0)) revert Errors.NoProviderAvailable(modelId);

        // Generate unique request ID
        requestId = keccak256(abi.encodePacked(
            modelId,
            bestProvider,
            msg.sender,
            block.timestamp,
            _requestNonce++
        ));

        _requests[requestId] = RequestContext({
            requestId: requestId,
            modelId: modelId,
            providerId: bestProvider,
            requester: msg.sender,
            createdAt: block.timestamp,
            fulfilled: false
        });

        // Track model providers
        _modelProviders[modelId].push(bestProvider);

        totalRequests++;

        emit RequestRouted(requestId, modelId, bestProvider);
    }

    /// @inheritdoc IMCPRouter
    function submitResponse(bytes32 requestId, bytes calldata response) external override {
        if (_requests[requestId].requestId == bytes32(0)) revert Errors.RequestNotFound(requestId);
        if (_requests[requestId].fulfilled) revert Errors.ResponseAlreadySubmitted(requestId);

        RequestContext storage request = _requests[requestId];
        bytes32 providerId = request.providerId;

        // Verify caller is the assigned provider
        if (_providers[providerId].provider != msg.sender) {
            revert Errors.Unauthorized(msg.sender);
        }

        // Check request hasn't timed out
        if (block.timestamp > request.createdAt + MAX_REQUEST_TIMEOUT) {
            revert Errors.RequestNotFound(requestId);
        }

        request.fulfilled = true;

        // Increase provider reputation on successful response
        if (_providers[providerId].reputation < 10_000) {
            _providers[providerId].reputation += 100; // Small reputation boost
        }

        emit ResponseSubmitted(requestId, providerId);
    }

    /// @inheritdoc IMCPRouter
    function slashProvider(bytes32 providerId, bytes32 reason) external override onlyRole(SLASHER_ROLE) {
        if (!_providers[providerId].active) revert Errors.ProviderNotFound(providerId);

        ProviderInfo storage provider = _providers[providerId];

        uint256 slashAmount = (provider.stake * SLASH_BPS) / BPS_BASE;
        if (slashAmount == 0) revert Errors.SlashingFailed(providerId);

        provider.stake -= slashAmount;

        // Decrease reputation
        if (provider.reputation > 1_000) {
            provider.reputation -= 1_000;
        } else {
            provider.reputation = 0;
            provider.active = false; // Deactivate if reputation drops too low
        }

        // If stake drops below minimum, deactivate
        if (provider.stake < MIN_STAKE) {
            provider.active = false;
        }

        // Transfer slashed funds to recipient
        if (!stakeToken.transfer(slashRecipient, slashAmount)) revert Errors.TransferFailed();

        totalSlashed++;

        emit ProviderSlashed(providerId, slashAmount, reason);
    }

    // ─── View Functions ───────────────────────────────────────────────

    /// @notice Get provider information
    /// @param providerId The provider identifier
    /// @return info The provider information
    function getProvider(bytes32 providerId) external view returns (ProviderInfo memory info) {
        if (!_providers[providerId].active && _providers[providerId].stake == 0) {
            revert Errors.ProviderNotFound(providerId);
        }
        return _providers[providerId];
    }

    /// @notice Get request context
    /// @param requestId The request identifier
    /// @return context The request context
    function getRequest(bytes32 requestId) external view returns (RequestContext memory context) {
        if (_requests[requestId].requestId == bytes32(0)) revert Errors.RequestNotFound(requestId);
        return _requests[requestId];
    }

    /// @notice Get providers for a model
    /// @param modelId The model identifier
    /// @return providerIds Array of provider IDs
    function getModelProviders(bytes32 modelId) external view returns (bytes32[] memory providerIds) {
        return _modelProviders[modelId];
    }

    /// @notice Get provider ID by address
    /// @param provider The provider address
    /// @return providerId The provider ID
    function getProviderByAddress(address provider) external view returns (bytes32 providerId) {
        return _addressToProviderId[provider];
    }

    // ─── Internal Functions ───────────────────────────────────────────

    /// @dev Select the best provider for a model based on reputation and stake
    function _selectProvider(bytes32 modelId) internal view returns (bytes32 bestProvider) {
        bytes32[] storage providers = _modelProviders[modelId];

        if (providers.length == 0) {
            // No model-specific providers; select from all active providers
            // For gas efficiency, we use a simplified selection
            return bytes32(0);
        }

        uint256 bestScore;
        for (uint256 i = 0; i < providers.length; i++) {
            ProviderInfo storage info = _providers[providers[i]];
            if (!info.active) continue;

            // Score = reputation * (stake / MIN_STAKE)
            uint256 stakeMultiplier = info.stake / MIN_STAKE;
            if (stakeMultiplier == 0) stakeMultiplier = 1;
            uint256 score = info.reputation * stakeMultiplier;

            if (score > bestScore) {
                bestScore = score;
                bestProvider = providers[i];
            }
        }
    }
}
