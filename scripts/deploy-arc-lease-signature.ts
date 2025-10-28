import { ethers } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';

/**
 * Deploy RentFlowLeaseSignature to Arc Testnet
 * 
 * This contract handles blockchain-native lease signing with ECDSA signatures
 * Works with ANY EVM wallet (MetaMask, Circle, Ledger, etc.)
 */

async function main() {
  console.log("🚀 Deploying RentFlowLeaseSignature to Arc Testnet...\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", network.chainId);
  console.log("");

  // Check if we have enough balance
  if (balance === 0n) {
    console.error("❌ ERROR: Deployer account has zero balance!");
    console.error("   Please fund the account with Arc testnet ETH first.");
    console.error("   Address:", deployer.address);
    process.exit(1);
  }

  // Deploy RentFlowLeaseSignature
  console.log("📄 Deploying RentFlowLeaseSignature...");
  const RentFlowLeaseSignature = await ethers.getContractFactory("RentFlowLeaseSignature");
  
  console.log("⏳ Sending transaction...");
  const contract = await RentFlowLeaseSignature.deploy();
  
  console.log("⏳ Waiting for deployment confirmation...");
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("✅ RentFlowLeaseSignature deployed to:", contractAddress);
  console.log("");

  // Get deployment transaction details
  const deployTx = contract.deploymentTransaction();
  if (deployTx) {
    console.log("📊 Deployment Transaction:");
    console.log("   Hash:", deployTx.hash);
    console.log("   Block:", deployTx.blockNumber || "pending");
    console.log("   Gas Used:", deployTx.gasLimit.toString());
    console.log("");
  }

  // Output deployment summary
  console.log("=" .repeat(70));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=" .repeat(70));
  console.log("Network:              Arc Testnet");
  console.log("Chain ID:            ", network.chainId);
  console.log("Deployer:            ", deployer.address);
  console.log("Contract:             RentFlowLeaseSignature");
  console.log("Address:             ", contractAddress);
  console.log("Block Explorer:       https://testnet.arcscan.app/address/" + contractAddress);
  console.log("");
  console.log("✨ Features:");
  console.log("   ✅ ECDSA signature verification (industry standard)");
  console.log("   ✅ Works with ANY EVM wallet (MetaMask, Circle, Ledger)");
  console.log("   ✅ On-chain verification (trustless)");
  console.log("   ✅ Dual signing support (landlord + tenant)");
  console.log("");
  console.log("📋 Next Steps:");
  console.log("   1. Add to .env file:");
  console.log(`      LEASE_SIGNATURE_CONTRACT=${contractAddress}`);
  console.log("   2. Update frontend to use this contract");
  console.log("   3. Test lease signing with MetaMask");
  console.log("   4. Verify contract on Arc explorer (optional)");
  console.log("=" .repeat(70));

  // Save deployment info
  const deploymentInfo = {
    network: "arc-testnet",
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      RentFlowLeaseSignature: contractAddress,
    },
    blockExplorer: `https://testnet.arcscan.app/address/${contractAddress}`,
    transaction: deployTx ? {
      hash: deployTx.hash,
      blockNumber: deployTx.blockNumber,
    } : null,
  };

  // Save to deployment.json
  const deploymentPath = path.join(process.cwd(), 'deployment-arc.json');
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to deployment-arc.json\n");

  // Update .env file with contract address
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Check if LEASE_SIGNATURE_CONTRACT already exists
    if (envContent.includes('LEASE_SIGNATURE_CONTRACT=')) {
      // Update existing entry
      envContent = envContent.replace(
        /LEASE_SIGNATURE_CONTRACT=.*/,
        `LEASE_SIGNATURE_CONTRACT=${contractAddress}`
      );
      console.log("📝 Updated LEASE_SIGNATURE_CONTRACT in .env");
    } else {
      // Add new entry
      envContent += `\n# Arc Testnet Contracts\nLEASE_SIGNATURE_CONTRACT=${contractAddress}\n`;
      console.log("📝 Added LEASE_SIGNATURE_CONTRACT to .env");
    }
    
    fs.writeFileSync(envPath, envContent);
  }

  console.log("\n✅ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
