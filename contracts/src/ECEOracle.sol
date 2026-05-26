// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IECEOracle.sol";
import "./libraries/Errors.sol";

/// @title ECEOracle — Emergent Cognitive Economy price feed
/// @notice Multi-oracle aggregated price feeds with median aggregation and staleness checks
/// @dev 60-second heartbeat, 5-oracle median, confidence-weighted
contract ECEOracle is IECEOracle, AccessControl {
    // ─── Constants ────────────────────────────────────────────────────

    /// @notice Price heartbeat: 60 seconds
    uint256 public constant HEARTBEAT = 60 seconds;

    /// @notice Minimum number of submissions for aggregation
    uint8 public constant MIN_SUBMISSIONS = 3;

    /// @notice Maximum number of submissions stored per round
    uint8 public constant MAX_SUBMISSIONS = 5;

    /// @notice Maximum allowed price deviation from previous price (20%)
    uint256 public constant MAX_DEVIATION_BPS = 2_000;

    /// @notice BPS base
    uint256 internal constant BPS_BASE = 10_000;

    // ─── Roles ────────────────────────────────────────────────────────

    /// @notice Role for authorized oracle submitters
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // ─── State Variables ──────────────────────────────────────────────

    /// @notice Mapping from asset ID to current aggregated price data
    mapping(bytes32 => PriceData) private _prices;

    /// @notice Mapping from asset ID to current round submissions
    mapping(bytes32 => OracleSubmission[]) private _currentRoundSubmissions;

    /// @notice Mapping from asset ID to round ID
    mapping(bytes32 => uint256) private _roundIds;

    /// @notice Mapping from oracle address to reputation score
    mapping(address => uint256) public oracleReputation;

    /// @notice Mapping from asset ID to previous price (for deviation check)
    mapping(bytes32 => uint256) private _previousPrices;

    // ─── Constructor ──────────────────────────────────────────────────

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    // ─── External Functions ───────────────────────────────────────────

    /// @inheritdoc IECEOracle
    function submitPriceUpdate(bytes32 assetId, uint256 price, uint8 confidence) external override onlyRole(ORACLE_ROLE) {
        if (confidence > 100) revert Errors.InvalidConfidence(confidence);
        if (price == 0) revert Errors.StalePrice(assetId, 0);

        // Check deviation from previous price if exists
        uint256 prevPrice = _previousPrices[assetId];
        if (prevPrice > 0) {
            uint256 deviation = _calculateDeviation(prevPrice, price);
            if (deviation > MAX_DEVIATION_BPS) {
                revert Errors.PriceDeviationTooHigh(assetId, deviation);
            }
        }

        OracleSubmission[] storage submissions = _currentRoundSubmissions[assetId];

        // Check if oracle already submitted this round
        for (uint256 i = 0; i < submissions.length; i++) {
            if (submissions[i].oracle == msg.sender) {
                // Update existing submission
                submissions[i].price = price;
                submissions[i].confidence = confidence;
                submissions[i].timestamp = block.timestamp;

                emit PriceUpdateSubmitted(assetId, msg.sender, price, confidence);
                return;
            }
        }

        // Add new submission
        if (submissions.length >= MAX_SUBMISSIONS) {
            // Replace oldest submission
            uint256 oldestIdx = 0;
            for (uint256 i = 1; i < submissions.length; i++) {
                if (submissions[i].timestamp < submissions[oldestIdx].timestamp) {
                    oldestIdx = i;
                }
            }
            submissions[oldestIdx] = OracleSubmission({
                oracle: msg.sender,
                price: price,
                confidence: confidence,
                timestamp: block.timestamp
            });
        } else {
            submissions.push(OracleSubmission({
                oracle: msg.sender,
                price: price,
                confidence: confidence,
                timestamp: block.timestamp
            }));
        }

        emit PriceUpdateSubmitted(assetId, msg.sender, price, confidence);

        // If enough submissions, aggregate
        if (submissions.length >= MIN_SUBMISSIONS) {
            _aggregatePrice(assetId);
        }
    }

    /// @inheritdoc IECEOracle
    function getPrice(bytes32 assetId) external view override returns (PriceData memory priceData) {
        priceData = _prices[assetId];
        if (priceData.updatedAt == 0) revert Errors.StalePrice(assetId, 0);
        return priceData;
    }

    /// @inheritdoc IECEOracle
    function getAggregatedPrice(bytes32 assetId) external view override returns (uint256 medianPrice, uint8 confidence) {
        OracleSubmission[] storage submissions = _currentRoundSubmissions[assetId];
        if (submissions.length < MIN_SUBMISSIONS) {
            revert Errors.InsufficientOracleSubmissions(assetId);
        }

        // Calculate median
        medianPrice = _calculateMedian(submissions);

        // Calculate weighted average confidence
        uint256 totalConfidence;
        for (uint256 i = 0; i < submissions.length; i++) {
            totalConfidence += submissions[i].confidence;
        }
        confidence = uint8(totalConfidence / submissions.length);
    }

    /// @inheritdoc IECEOracle
    function isPriceFresh(bytes32 assetId) external view override returns (bool isFresh) {
        PriceData storage priceData = _prices[assetId];
        if (priceData.updatedAt == 0) return false;
        return (block.timestamp - priceData.updatedAt) <= HEARTBEAT;
    }

    // ─── Admin Functions ──────────────────────────────────────────────

    /// @notice Grant oracle role to a new address
    /// @param oracle The oracle address
    function addOracle(address oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (oracle == address(0)) revert Errors.ZeroAddress();
        grantRole(ORACLE_ROLE, oracle);
        oracleReputation[oracle] = 100; // Initial reputation
    }

    /// @notice Remove oracle role from an address
    /// @param oracle The oracle address
    function removeOracle(address oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ORACLE_ROLE, oracle);
    }

    /// @notice Update oracle reputation (admin only)
    /// @param oracle The oracle address
    /// @param newReputation The new reputation score
    function updateReputation(address oracle, uint256 newReputation) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldReputation = oracleReputation[oracle];
        oracleReputation[oracle] = newReputation;
        emit OracleReputationUpdated(oracle, oldReputation, newReputation);
    }

    // ─── Internal Functions ───────────────────────────────────────────

    /// @dev Aggregate submissions into a single price using median
    function _aggregatePrice(bytes32 assetId) internal {
        OracleSubmission[] storage submissions = _currentRoundSubmissions[assetId];

        uint256 medianPrice = _calculateMedian(submissions);

        // Calculate confidence-weighted average
        uint256 totalWeight;
        uint256 weightedConfidence;
        for (uint256 i = 0; i < submissions.length; i++) {
            uint256 weight = uint256(submissions[i].confidence) + 1; // +1 to avoid zero weight
            totalWeight += weight;
            weightedConfidence += weight * submissions[i].confidence;
        }

        uint8 aggConfidence = uint8(weightedConfidence / totalWeight);

        // Update price data
        _previousPrices[assetId] = _prices[assetId].price;
        _prices[assetId] = PriceData({
            price: medianPrice,
            confidence: aggConfidence,
            updatedAt: block.timestamp
        });

        _roundIds[assetId]++;

        emit AggregatedPriceUpdated(assetId, medianPrice, aggConfidence);
    }

    /// @dev Calculate median price from submissions (insertion sort for small arrays)
    function _calculateMedian(OracleSubmission[] storage submissions) internal view returns (uint256) {
        uint256 n = submissions.length;
        if (n == 0) return 0;
        if (n == 1) return submissions[0].price;

        // Copy prices to memory array and sort
        uint256[] memory prices = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            prices[i] = submissions[i].price;
        }

        // Insertion sort (efficient for small arrays, n <= 5)
        for (uint256 i = 1; i < n; i++) {
            uint256 key = prices[i];
            uint256 j = i;
            while (j > 0 && prices[j - 1] > key) {
                prices[j] = prices[j - 1];
                j--;
            }
            prices[j] = key;
        }

        // Median: middle value for odd, average of two middle for even
        if (n % 2 == 1) {
            return prices[n / 2];
        }
        return (prices[n / 2 - 1] + prices[n / 2]) / 2;
    }

    /// @dev Calculate price deviation in BPS
    function _calculateDeviation(uint256 oldPrice, uint256 newPrice) internal pure returns (uint256) {
        if (oldPrice == 0) return 0;
        if (newPrice > oldPrice) {
            return ((newPrice - oldPrice) * BPS_BASE) / oldPrice;
        }
        return ((oldPrice - newPrice) * BPS_BASE) / oldPrice;
    }
}
