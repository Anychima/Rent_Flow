#!/usr/bin/env ts-node
/**
 * RentFlow AI Smart Contract Deployment Script
 * 
 * This script deploys the RentFlowCore contract to the configured network
 * and sets up the initial AI agents.
 */

import { ethers, network, run } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log(`\n🚀 Deploying RentFlow AI contracts to ${network.name} network...\n`);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString(), "wei\n");

  // Deploy MockUSDC token (for testing)
  console.log("Deploying MockUSDC token...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  console.log("✅ MockUSDC deployed to:", await mockUSDC.getAddress());

  // Deploy RentFlowCore contract
  console.log("\nDeploying RentFlowCore contract...");
  const RentFlowCore = await ethers.getContractFactory("RentFlowCore");
  const rentFlowCore = await RentFlowCore.deploy(await mockUSDC.getAddress());
  await rentFlowCore.waitForDeployment();
  console.log("✅ RentFlowCore deployed to:", await rentFlowCore.getAddress());

  // Mint some MockUSDC for testing
  console.log("\nMinting MockUSDC for testing...");
  const mintAmount = ethers.parseUnits("1000000", 6); // 1,000,000 USDC
  await mockUSDC.mint(deployer.address, mintAmount);
  console.log("✅ Minted", ethers.formatUnits(mintAmount, 6), "USDC to deployer");

  // Authorize deployer as AI agent
  console.log("\nAuthorizing deployer as AI agent...");
  await rentFlowCore.setAIAgent(deployer.address, true);
  console.log("✅ Deployer authorized as AI agent");

  // Verify contracts on Etherscan (if not local network)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nVerifying contracts on Etherscan...");
    
    try {
      await run("verify:verify", {
        address: await mockUSDC.getAddress(),
        constructorArguments: [],
      });
      console.log("✅ MockUSDC verified on Etherscan");
    } catch (error) {
      console.log("⚠️  MockUSDC verification failed:", error);
    }

    try {
      await run("verify:verify", {
        address: await rentFlowCore.getAddress(),
        constructorArguments: [await mockUSDC.getAddress()],
      });
      console.log("✅ RentFlowCore verified on Etherscan");
    } catch (error) {
      console.log("⚠️  RentFlowCore verification failed:", error);
    }
  }

  // Save deployment information
  const deploymentInfo = {
    network: network.name,
    deployer: deployer.address,
    contracts: {
      MockUSDC: await mockUSDC.getAddress(),
      RentFlowCore: await rentFlowCore.getAddress(),
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  const fs = require("fs");
  const path = require("path");
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📝 Next steps:");
  console.log("1. Update your .env file with contract addresses");
  console.log("2. Run the blockchain sync service to index events");
  console.log("3. Test the integration with the backend API");
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });