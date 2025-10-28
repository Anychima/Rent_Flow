import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Testing RentFlowLeaseSignature contract...\n");

  const CONTRACT_ADDRESS = "0x60e3b0a49e04e348aA81D4C3b795c0B7df441312";
  
  const ABI = [
    "function signLease(string memory leaseId, bytes memory signature, bool isLandlord) external",
    "function getLeaseMessageHash(string memory leaseId, address landlord, address tenant, string memory documentHash, uint256 monthlyRent, uint256 securityDeposit, bool isLandlord) public pure returns (bytes32)"
  ];

  const [signer] = await ethers.getSigners();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  console.log("📍 Contract Address:", CONTRACT_ADDRESS);
  console.log("👤 Testing with account:", signer.address);

  // Test 1: Call getLeaseMessageHash with a UUID
  console.log("\n🧪 Test 1: Calling getLeaseMessageHash with UUID...");
  try {
    const testLeaseId = "e873a630-1c46-458f-ad84-752f90ad1e49";
    const testLandlord = "0x4e076D7ce8F401858E3026BC567478C6611d741a";
    const testTenant = "0x0000000000000000000000000000000000000000";
    const testDocHash = "test-document-hash";
    const testRent = ethers.parseUnits("1000", 6); // 1000 USDC
    const testDeposit = ethers.parseUnits("2000", 6); // 2000 USDC
    
    const messageHash = await contract.getLeaseMessageHash(
      testLeaseId,
      testLandlord,
      testTenant,
      testDocHash,
      testRent,
      testDeposit,
      true
    );
    
    console.log("✅ SUCCESS! Contract accepts string lease IDs");
    console.log("   Message Hash:", messageHash);
  } catch (error: any) {
    console.error("❌ FAILED:", error.message);
  }

  // Test 2: Check contract code exists
  console.log("\n🧪 Test 2: Checking contract code...");
  const code = await ethers.provider.getCode(CONTRACT_ADDRESS);
  if (code === "0x") {
    console.error("❌ ERROR: No contract code at this address!");
  } else {
    console.log("✅ Contract code exists");
    console.log("   Code size:", code.length, "bytes");
  }

  console.log("\n✅ Contract testing complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
