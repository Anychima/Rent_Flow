import { ethers } from "hardhat";

/**
 * Deploy RentFlowAIDecisions contract to Arc Testnet
 * This contract records AI decision-making on-chain for transparency
 */
async function main() {
  console.log("🚀 Deploying RentFlowAIDecisions to Arc Testnet...\n");

  // Debug: Check environment variables
  console.log("🔍 Debug - Network:", (await ethers.provider.getNetwork()).name);
  console.log("🔍 Debug - Chain ID:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("🔍 Debug - RPC URL:", process.env.ARC_RPC_URL);
  console.log("🔍 Debug - Private Key exists:", !!process.env.DEPLOYER_PRIVATE_KEY);
  console.log("🔍 Debug - Private Key length:", process.env.DEPLOYER_PRIVATE_KEY?.length || 0);

  const signers = await ethers.getSigners();
  console.log("🔍 Debug - Signers found:", signers.length);
  
  if (signers.length === 0) {
    console.error("❌ No signers found. Please check your DEPLOYER_PRIVATE_KEY in .env");
    console.error("   Make sure the key is 66 characters (0x + 64 hex chars)");
    process.exit(1);
  }
  
  const deployer = signers[0];
  console.log("📍 Deploying from address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy the contract
  console.log("📝 Deploying RentFlowAIDecisions contract...");
  const RentFlowAIDecisions = await ethers.getContractFactory("RentFlowAIDecisions");
  const contract = await RentFlowAIDecisions.deploy();
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ RentFlowAIDecisions deployed to:", contractAddress);
  console.log("🔗 View on Arc Testnet Explorer:");
  console.log(`   https://testnet.arcscan.app/address/${contractAddress}\n`);

  // Wait for a few block confirmations
  console.log("⏳ Waiting for block confirmations...");
  await contract.deploymentTransaction()?.wait(2);
  
  console.log("✅ Deployment confirmed!\n");

  // Display contract info
  console.log("📊 Contract Information:");
  console.log("   Contract Address:", contractAddress);
  console.log("   AI Agent (Owner):", await contract.aiAgent());
  console.log("   Total Payment Decisions:", await contract.getTotalPaymentDecisions());
  console.log("   Total Maintenance Decisions:", await contract.getTotalMaintenanceDecisions());
  console.log("   Total Application Scores:", await contract.getTotalApplicationScores());
  console.log("   Total Voice Authorizations:", await contract.getTotalVoiceAuthorizations());

  console.log("\n🎉 Deployment Complete!");
  console.log("\n📝 Next Steps:");
  console.log("   1. Add to backend/.env:");
  console.log(`      AI_DECISIONS_CONTRACT=${contractAddress}`);
  console.log("   2. Update backend to record AI decisions on-chain");
  console.log("   3. Test with: npm run test:ai-decisions");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
