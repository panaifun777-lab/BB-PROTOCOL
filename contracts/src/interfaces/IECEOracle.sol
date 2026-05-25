// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IECEOracle — Emergent Cognitive Economy price feed interface
/// @notice Defines the interface for multi-oracle aggregated price feeds
interface IECEOracle {
    // ─── Structs ──────────────────────────────────────────────────────

    /// @notice Price data point with confidence
    struct PriceData {
        uint256 price;        // Price in 18 decimals
        uint8 confidence;     // Confidence score [0, 100]
        uint256 updatedAt;    // Last update timestamp
    }

    /// @notice Oracle submission entry
    struct OracleSubmission {
        address oracle;       // Oracle submitter address
        uint256 price;        // Submitted price
        uint8 confidence;     // Submitted confidence
        uint256 timestamp;    // Submission timestamp
    }

    // ─── Events ───────────────────────────────────────────────────────

    /// @notice Emitted when a price update is submitted
    event PriceUpdateSubmitted(
        bytes32 indexed assetId,
        address indexed oracle,
        uint256 price,
        uint8 confidence
    );

    /// @notice Emitted when the aggregated price is updated
    event AggregatedPriceUpdated(
        bytes32 indexed assetId,
        uint256 medianPrice,
        uint8 aggregatedConfidence
    );

    /// @notice Emitted when an oracle's reputation changes
    event OracleReputationUpdated(
        address indexed oracle,
        uint256 oldReputation,
        uint256 newReputation
    );

    // ─── Functions ────────────────────────────────────────────────────

    /// @notice Submit a price update as an oracle
    /// @param assetId The asset identifier
    /// @param price The submitted price
    /// @param confidence The confidence score [0, 100]
    function submitPriceUpdate(bytes32 assetId, uint256 price, uint8 confidence) external;

    /// @notice Get the current price for an asset
    /// @param assetId The asset identifier
    /// @return priceData The current price data
    function getPrice(bytes32 assetId) external view returns (PriceData memory priceData);

    /// @notice Get the aggregated (median) price from last 5 submissions
    /// @param assetId The asset identifier
    /// @return medianPrice The median price
    /// @return confidence The aggregated confidence score
    function getAggregatedPrice(bytes32 assetId)
        external
        view
        returns (uint256 medianPrice, uint8 confidence);

    /// @notice Check if a price is fresh (within heartbeat)
    /// @param assetId The asset identifier
    /// @return isFresh True if the price was updated within the heartbeat period
    function isPriceFresh(bytes32 assetId) external view returns (bool isFresh);
}
