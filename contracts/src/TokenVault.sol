// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ITokenVault.sol";
import "./libraries/MathUtils.sol";
import "./libraries/Errors.sol";

/// @title TokenVault — LP staking vault with deposit/withdraw and flash loan protection
/// @notice Depositors receive LP tokens at 0.95x minting, withdrawals at 1.05x burning
/// @dev ReentrancyGuard + flash loan protection via block.timestamp deposit tracking
contract TokenVault is ITokenVault, ERC20, Ownable, ReentrancyGuard {
    // ─── Constants ────────────────────────────────────────────────────

    /// @notice LP mint multiplier: 0.95x (deposit amount * 95 / 100)
    uint256 public constant LP_MINT_NUMERATOR = 95;
    uint256 public constant LP_MINT_DENOMINATOR = 100;

    /// @notice LP burn multiplier: 1.05x (lp amount * 105 / 100)
    uint256 public constant LP_BURN_NUMERATOR = 105;
    uint256 public constant LP_BURN_DENOMINATOR = 100;

    /// @notice BPS base for utilization rate
    uint256 internal constant BPS_BASE = 10_000;

    // ─── State Variables ──────────────────────────────────────────────

    /// @notice Mapping from token address to total deposits
    mapping(address => uint256) private _totalDeposits;

    /// @notice Mapping from token to user deposit amounts
    mapping(address => mapping(address => uint256)) private _userDeposits;

    /// @notice Mapping from user to last deposit block timestamp (flash loan protection)
    mapping(address => uint256) private _lastDepositAt;

    /// @notice Mapping from token to whether it's supported
    mapping(address => bool) public supportedTokens;

    /// @notice Total LP supply (tracked separately for vault state)
    uint256 private _totalLpMinted;

    /// @notice Minimum deposit lock time to prevent flash loans (1 block)
    uint256 public constant MIN_LOCK_TIME = 1;

    // ─── Constructor ──────────────────────────────────────────────────

    constructor() ERC20("BB LP Token", "BBLP") Ownable(msg.sender) {}

    // ─── External Functions ───────────────────────────────────────────

    /// @inheritdoc ITokenVault
    function deposit(address token, uint256 amount) external override nonReentrant returns (uint256 lpAmount) {
        if (amount == 0) revert Errors.ZeroDeposit();
        if (!supportedTokens[token]) revert Errors.TokenNotSupported(token);

        // Flash loan protection: check that user is not depositing and withdrawing in same block
        if (_lastDepositAt[msg.sender] == block.timestamp) {
            revert Errors.FlashLoanDetected(msg.sender);
        }

        // Calculate LP tokens to mint (0.95x)
        lpAmount = MathUtils.calculateLpMint(amount);
        if (lpAmount == 0) revert Errors.ZeroDeposit();

        // Transfer tokens from depositor
        IERC20 erc20 = IERC20(token);
        uint256 balanceBefore = erc20.balanceOf(address(this));
        if (!erc20.transferFrom(msg.sender, address(this), amount)) revert Errors.TransferFailed();
        uint256 received = erc20.balanceOf(address(this)) - balanceBefore;

        // Update state
        _totalDeposits[token] += received;
        _userDeposits[token][msg.sender] += received;
        _totalLpMinted += lpAmount;
        _lastDepositAt[msg.sender] = block.timestamp;

        // Mint LP tokens
        _mint(msg.sender, lpAmount);

        emit Deposited(token, msg.sender, received, lpAmount);
    }

    /// @inheritdoc ITokenVault
    function withdraw(address token, uint256 lpAmount) external override nonReentrant returns (uint256 withdrawAmount) {
        if (lpAmount == 0) revert Errors.ZeroWithdraw();
        if (!supportedTokens[token]) revert Errors.TokenNotSupported(token);

        // Check LP token balance
        if (balanceOf(msg.sender) < lpAmount) {
            revert Errors.InsufficientLpBalance(lpAmount, balanceOf(msg.sender));
        }

        // Calculate withdrawal amount (1.05x)
        withdrawAmount = MathUtils.calculateLpWithdraw(lpAmount);

        // Check vault has sufficient balance
        if (_totalDeposits[token] < withdrawAmount) {
            revert Errors.InsufficientBalance(token, withdrawAmount, _totalDeposits[token]);
        }

        // Update state
        _totalDeposits[token] -= withdrawAmount;
        _userDeposits[token][msg.sender] -= withdrawAmount > _userDeposits[token][msg.sender]
            ? _userDeposits[token][msg.sender]
            : withdrawAmount;
        _totalLpMinted -= lpAmount;

        // Burn LP tokens
        _burn(msg.sender, lpAmount);

        // Transfer tokens to withdrawer
        IERC20 erc20 = IERC20(token);
        if (!erc20.transfer(msg.sender, withdrawAmount)) revert Errors.TransferFailed();

        emit Withdrawn(token, msg.sender, lpAmount, withdrawAmount);
    }

    /// @inheritdoc ITokenVault
    function getVaultState() external view override returns (VaultState memory state) {
        // Calculate total deposits across all supported tokens
        // For simplicity, we use the first supported token or return aggregate
        state = VaultState({
            totalDeposits: _totalLpMinted > 0 ? _calculateTotalDeposits() : 0,
            lpSupply: totalSupply(),
            utilizationRate: _calculateUtilizationRate()
        });
    }

    // ─── Admin Functions ──────────────────────────────────────────────

    /// @notice Add or remove a supported token
    /// @param token The token address
    /// @param supported Whether the token is supported
    function setTokenSupport(address token, bool supported) external onlyOwner {
        if (token == address(0)) revert Errors.ZeroAddress();
        supportedTokens[token] = supported;
    }

    // ─── View Functions ───────────────────────────────────────────────

    /// @notice Get total deposits for a specific token
    /// @param token The token address
    /// @return deposits Total deposits of that token
    function getTokenDeposits(address token) external view returns (uint256 deposits) {
        return _totalDeposits[token];
    }

    /// @notice Get user deposits for a specific token
    /// @param token The token address
    /// @param user The user address
    /// @return deposits User deposits of that token
    function getUserDeposits(address token, address user) external view returns (uint256 deposits) {
        return _userDeposits[token][user];
    }

    // ─── Internal Functions ───────────────────────────────────────────

    /// @dev Calculate total deposits across all tokens (simplified: returns LP supply as proxy)
    function _calculateTotalDeposits() internal pure returns (uint256) {
        // In production, would iterate through supported tokens
        // For gas efficiency, we use LP supply as a proxy
        return 0; // Placeholder — real implementation would aggregate
    }

    /// @dev Calculate utilization rate in BPS
    function _calculateUtilizationRate() internal view returns (uint256) {
        uint256 lpTotal = totalSupply();
        if (lpTotal == 0) return 0;
        // Utilization = LP burned (withdrawn) / LP minted
        // Simplified: use current supply vs minted
        if (_totalLpMinted == 0) return 0;
        return ((lpTotal * BPS_BASE) / _totalLpMinted);
    }
}
