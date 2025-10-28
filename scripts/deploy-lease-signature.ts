import { ethers } from "hardhat";

/**
 * Deployment script for RentFlowLeaseSignature contract
 * 
 * This contract handles on-chain lease signing with ECDSA signatures
 */

async function main() {
  console.log("🚀 Deploying RentFlowLeaseSignature contract...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy RentFlowLeaseSignature
  console.log("📄 Deploying RentFlowLeaseSignature...");
  const RentFlowLeaseSignature = await ethers.getContractFactory("RentFlowLeaseSignature");
  const leaseSignature = await RentFlowLeaseSignature.deploy();
  await leaseSignature.waitForDeployment();
  const contractAddress = await leaseSignature.getAddress();
  console.log("✅ RentFlowLeaseSignature deployed to:", contractAddress);

  // Output deployment summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  console.log("\nContract:");
  console.log("  RentFlowLeaseSignature:", contractAddress);
  console.log("\nExplorer:");
  console.log("  https://testnet.arcscan.app/address/" + contractAddress);
  console.log("\nNext Steps:");
  console.log("  1. Update CONTRACT_ADDRESS in frontend/src/services/smartContractSigningService.ts");
  console.log("  2. Update LEASE_SIGNATURE_CONTRACT in backend .env file");
  console.log("  3. Test lease signing with both Circle and MetaMask wallets");
  console.log("=".repeat(60));

  // Save deployment info to file
  const fs = require('fs');
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contract: {
      name: "RentFlowLeaseSignature",
      address: contractAddress,
      explorer: `https://testnet.arcscan.app/address/${contractAddress}`
    }
  };

  fs.writeFileSync(
    'lease-signature-deployment.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to lease-signature-deployment.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
