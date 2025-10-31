import { rentFlowCoreService } from './services/rentFlowCoreService';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Test script to verify RentFlowCore integration
 */
async function testRentFlowCore() {
  console.log('🧪 Testing RentFlowCore Integration...\n');

  if (!rentFlowCoreService.isReady()) {
    console.log('❌ RentFlowCore service not configured');
    console.log('   Check that DEPLOYER_PRIVATE_KEY and RENT_FLOW_CORE_CONTRACT are set in .env');
    return;
  }

  try {
    // Test property registration
    console.log('🏠 Registering test property on-chain...');
    const propertyResult = await rentFlowCoreService.registerProperty({
      monthlyRent: 1500,
      securityDeposit: 3000
    });

    if (propertyResult.success) {
      console.log('✅ Property registered successfully!');
      console.log(`   Property ID: ${propertyResult.propertyId}`);
      console.log(`   Transaction: ${propertyResult.transactionHash}`);
      console.log(`   View on Explorer: https://testnet.arcscan.app/tx/${propertyResult.transactionHash}\n`);
    } else {
      console.log('❌ Property registration failed:', propertyResult.error);
      return;
    }

    // Test getting property details
    if (propertyResult.propertyId !== undefined) {
      console.log('🔍 Getting property details from blockchain...');
      const propertyDetails = await rentFlowCoreService.getProperty(propertyResult.propertyId);
      if (propertyDetails) {
        console.log('✅ Property details retrieved:');
        console.log(`   Owner: ${propertyDetails.owner}`);
        console.log(`   Monthly Rent: $${propertyDetails.monthlyRent}`);
        console.log(`   Security Deposit: $${propertyDetails.securityDeposit}`);
        console.log(`   Active: ${propertyDetails.isActive}\n`);
      }
    }

    console.log('🎉 RentFlowCore integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testRentFlowCore()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
