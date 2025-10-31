import { aiDecisionsContract } from './services/aiDecisionsContract';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Test script to verify AI decisions are being recorded on-chain
 */
async function testBlockchainAI() {
  console.log('🧪 Testing On-Chain AI Decision Recording...\n');

  try {
    // 1. Check current state
    console.log('📊 Checking current blockchain state...');
    const totalDecisions = await aiDecisionsContract.getTotalPaymentDecisions();
    console.log(`   Total payment decisions on-chain: ${totalDecisions}\n`);

    // 2. Record a test payment decision
    console.log('🔗 Recording test AI payment decision on-chain...');
    const testDecision = await aiDecisionsContract.recordPaymentDecision({
      tenant: '0x4e076D7ce8F401858E3026BC567478C6611d741a', // Test address
      landlord: '0x1234567890123456789012345678901234567890', // Test address
      amountUSDC: 1500,
      approved: true,
      confidenceScore: 92,
      reasoning: 'Test: Tenant has 100% payment reliability. Auto-approved with 92% confidence.'
    });

    console.log('✅ Decision recorded on-chain!');
    console.log(`   Decision ID: ${testDecision.decisionId}`);
    console.log(`   Transaction: ${testDecision.transactionHash}`);
    console.log(`   View: https://testnet.arcscan.app/tx/${testDecision.transactionHash}\n`);

    // 3. Verify the decision was recorded
    console.log('🔍 Verifying decision on blockchain...');
    const decision = await aiDecisionsContract.getPaymentDecision(testDecision.decisionId);
    console.log('   Decision Details:');
    console.log(`   - Tenant: ${decision.tenant}`);
    console.log(`   - Landlord: ${decision.landlord}`);
    console.log(`   - Amount: $${decision.amountUSDC} USDC`);
    console.log(`   - Approved: ${decision.approved}`);
    console.log(`   - Confidence: ${decision.confidenceScore}%`);
    console.log(`   - Reasoning: ${decision.reasoning}`);
    console.log(`   - Timestamp: ${new Date(decision.timestamp * 1000).toLocaleString()}`);
    console.log(`   - Executed: ${decision.executed}\n`);

    // 4. Mark as executed (simulate payment completion)
    console.log('🔗 Marking payment as executed on-chain...');
    await aiDecisionsContract.markPaymentExecuted(
      testDecision.decisionId,
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    );
    console.log('✅ Payment marked as executed!\n');

    // 5. Verify execution status
    const updatedDecision = await aiDecisionsContract.getPaymentDecision(testDecision.decisionId);
    console.log('   Updated Status:');
    console.log(`   - Executed: ${updatedDecision.executed}`);
    console.log(`   - TX Hash: ${updatedDecision.transactionHash}\n`);

    // 6. Record a voice authorization
    console.log('🎙️ Recording test voice authorization on-chain...');
    const voiceAuth = await aiDecisionsContract.recordVoiceAuthorization({
      user: '0x4e076D7ce8F401858E3026BC567478C6611d741a',
      commandType: 'pay_rent',
      command: 'Pay my rent for this month',
      authorized: true
    });
    console.log('✅ Voice authorization recorded!');
    console.log(`   Auth ID: ${voiceAuth.authId}`);
    console.log(`   Transaction: ${voiceAuth.transactionHash}\n`);

    // 7. Check final state
    const finalTotal = await aiDecisionsContract.getTotalPaymentDecisions();
    console.log(`📊 Final total payment decisions: ${finalTotal}`);
    console.log(`   New decisions added: ${finalTotal - totalDecisions}\n`);

    console.log('🎉 All tests passed! AI decisions are being recorded on-chain successfully.');
    console.log(`\n🔗 Contract Address: ${process.env.AI_DECISIONS_CONTRACT}`);
    console.log(`   View on Explorer: https://testnet.arcscan.app/address/${process.env.AI_DECISIONS_CONTRACT}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testBlockchainAI()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
