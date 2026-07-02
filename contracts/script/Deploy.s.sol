// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AvatarCore.sol";
import "../src/DynamicSplitter.sol";
import "../src/CircuitGuard.sol";
import "../src/SkillVault.sol";
import "../src/IFDRouter.sol";
import "../src/ECEOracle.sol";
import "../src/TokenVault.sol";
import "../src/PoUEVerifier.sol";
import "../src/MCPRouter.sol";
import "../src/GovernanceToken.sol";

/// @title Deploy — Deployment script for all BB Protocol contracts on Base L2
/// @notice Deploys all 10 contracts with proper initialization and integration
/// @dev Run with: forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
contract DeployScript is Script {
    // ─── Deployed Contract Addresses ─────────────────────────────────
    AvatarCore public avatarCore;
    DynamicSplitter public splitter;
    CircuitGuard public circuitGuard;
    SkillVault public skillVault;
    IFDRouter public ifdRouter;
    ECEOracle public oracle;
    TokenVault public vault;
    PoUEVerifier public poue;
    MCPRouter public mcpRouter;
    GovernanceToken public govToken;

    // ─── Configuration ───────────────────────────────────────────────
    address public protocolTreasury;
    address public stakeToken;
    uint256 public initialGovSupply = 1_000_000e18;

    function setUp() public {
        // Read from environment variables
        protocolTreasury = vm.envOr("PROTOCOL_TREASURY", msg.sender);
        stakeToken = vm.envOr("STAKE_TOKEN", address(0));
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        address deployer;

        if (deployerPrivateKey != 0) {
            vm.startBroadcast(deployerPrivateKey);
            deployer = vm.addr(deployerPrivateKey);
        } else {
            vm.startBroadcast();
            deployer = msg.sender;
        }

        console.log("=== BB Protocol Deployment on Base L2 ===");
        console.log("Deployer:", deployer);
        console.log("Treasury:", protocolTreasury);

        // ─── 1. AvatarCore ────────────────────────────────────────────
        console.log("\n--- Deploying AvatarCore ---");
        avatarCore = new AvatarCore();
        console.log("AvatarCore:", address(avatarCore));

        // ─── 2. CircuitGuard ──────────────────────────────────────────
        console.log("\n--- Deploying CircuitGuard ---");
        circuitGuard = new CircuitGuard(2); // 2 guardian confirmations for HARD_PAUSE
        console.log("CircuitGuard:", address(circuitGuard));

        // ─── 3. DynamicSplitter ───────────────────────────────────────
        console.log("\n--- Deploying DynamicSplitter ---");
        splitter = new DynamicSplitter(address(avatarCore), protocolTreasury);
        console.log("DynamicSplitter:", address(splitter));

        // ─── 4. SkillVault ────────────────────────────────────────────
        console.log("\n--- Deploying SkillVault ---");
        skillVault = new SkillVault(address(splitter));
        console.log("SkillVault:", address(skillVault));

        // ─── 5. IFDRouter ─────────────────────────────────────────────
        console.log("\n--- Deploying IFDRouter ---");
        ifdRouter = new IFDRouter();
        console.log("IFDRouter:", address(ifdRouter));

        // ─── 6. ECEOracle ─────────────────────────────────────────────
        console.log("\n--- Deploying ECEOracle ---");
        oracle = new ECEOracle();
        console.log("ECEOracle:", address(oracle));

        // ─── 7. TokenVault ────────────────────────────────────────────
        console.log("\n--- Deploying TokenVault ---");
        vault = new TokenVault();
        console.log("TokenVault:", address(vault));

        // ─── 8. PoUEVerifier ──────────────────────────────────────────
        console.log("\n--- Deploying PoUEVerifier ---");
        poue = new PoUEVerifier();
        console.log("PoUEVerifier:", address(poue));

        // ─── 9. MCPRouter ─────────────────────────────────────────────
        console.log("\n--- Deploying MCPRouter ---");
        // If no stake token is configured, deploy a mock or use address(0)
        if (stakeToken == address(0)) {
            console.log("WARNING: No STAKE_TOKEN configured, using GovernanceToken as stake");
            // Deploy governance token first for MCP staking
            govToken = new GovernanceToken(initialGovSupply);
            console.log("GovernanceToken:", address(govToken));
            stakeToken = address(govToken);
        }
        mcpRouter = new MCPRouter(stakeToken, protocolTreasury);
        console.log("MCPRouter:", address(mcpRouter));

        // ─── 10. GovernanceToken (if not already deployed) ────────────
        if (address(govToken) == address(0)) {
            console.log("\n--- Deploying GovernanceToken ---");
            govToken = new GovernanceToken(initialGovSupply);
            console.log("GovernanceToken:", address(govToken));
        }

        // ─── Post-Deployment Setup ────────────────────────────────────

        console.log("\n=== Post-Deployment Setup ===");

        // Set CircuitGuard on AvatarCore
        avatarCore.setCircuitGuard(address(circuitGuard));
        console.log("AvatarCore.circuitGuard set to:", address(circuitGuard));

        // Add supported tokens to splitter (ETH is default)
        // Add supported token to vault
        if (stakeToken != address(0)) {
            vault.setTokenSupport(stakeToken, true);
            console.log("TokenVault: supported token", stakeToken);
        }

        // Register initial skills
        bytes32 skillT1 = keccak256("COGNITIVE_CORE");
        bytes32 skillT2 = keccak256("EMOTIONAL_INTELLIGENCE");
        bytes32 skillT3 = keccak256("AUTONOMOUS_REASONING");
        bytes32 skillT4 = keccak256("CREATIVE_SYNTHESIS");
        bytes32 skillT5 = keccak256("TRANSCENDENT_AWARENESS");

        address skillDev = deployer;
        skillVault.registerSkill(skillT1, 0, 0, skillDev);
        skillVault.registerSkill(skillT2, 1, 500e18, skillDev);
        skillVault.registerSkill(skillT3, 2, 2000e18, skillDev);
        skillVault.registerSkill(skillT4, 3, 8000e18, skillDev);
        skillVault.registerSkill(skillT5, 4, 30000e18, skillDev);
        console.log("Initial 5 skills registered (T1-T5)");

        // Add initial guardians to CircuitGuard
        address guardian1 = vm.envOr("GUARDIAN_1", deployer);
        address guardian2 = vm.envOr("GUARDIAN_2", deployer);
        circuitGuard.addGuardian(guardian1);
        circuitGuard.addGuardian(guardian2);
        console.log("Guardians added:", guardian1, guardian2);

        // Add initial oracles
        address oracle1 = vm.envOr("ORACLE_1", deployer);
        oracle.addOracle(oracle1);
        console.log("Oracle added:", oracle1);

        vm.stopBroadcast();

        // ─── Deployment Summary ───────────────────────────────────────
        console.log("\n========== DEPLOYMENT SUMMARY ==========");
        console.log("AvatarCore:       ", address(avatarCore));
        console.log("DynamicSplitter:  ", address(splitter));
        console.log("CircuitGuard:     ", address(circuitGuard));
        console.log("SkillVault:       ", address(skillVault));
        console.log("IFDRouter:        ", address(ifdRouter));
        console.log("ECEOracle:        ", address(oracle));
        console.log("TokenVault:       ", address(vault));
        console.log("PoUEVerifier:     ", address(poue));
        console.log("MCPRouter:        ", address(mcpRouter));
        console.log("GovernanceToken:  ", address(govToken));
        console.log("=========================================");
    }
}
