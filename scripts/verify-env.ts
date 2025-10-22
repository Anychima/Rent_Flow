import * as dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

/**
 * Verification script to test all API connections and configurations
 */

async function verifyEnvironment() {
  console.log('🔍 Verifying RentFlow AI Environment Setup...\n');
  
  let allGood = true;

  // Check Environment Variables
  console.log('📋 Checking Environment Variables...');
  const requiredVars = [
    'ARC_RPC_URL',
    'ARC_CHAIN_ID',
    'CIRCLE_API_KEY',
    'ENTITY_SECRET',
    'DEPLOYER_ADDRESS',
    'AI_WALLET_ADDRESS',
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'OPENAI_API_KEY',
    'ELEVENLABS_API_KEY',
  ];

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`  ✅ ${varName}`);
    } else {
      console.log(`  ❌ ${varName} - MISSING`);
      allGood = false;
    }
  }
  console.log();

  // Test Arc RPC Connection
  console.log('🌐 Testing Arc Network Connection...');
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    
    console.log(`  ✅ Connected to Arc Network`);
    console.log(`  📍 Chain ID: ${network.chainId}`);
    console.log(`  📦 Latest Block: ${blockNumber}`);
  } catch (error) {
    console.log(`  ❌ Failed to connect to Arc Network`);
    console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    allGood = false;
  }
  console.log();

  // Check Wallet Balances
  console.log('💰 Checking Wallet Balances...');
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    
    const deployerBalance = await provider.getBalance(process.env.DEPLOYER_ADDRESS!);
    console.log(`  Deployer (${process.env.DEPLOYER_ADDRESS}):`);
    console.log(`    Balance: ${ethers.formatEther(deployerBalance)} ETH`);
    
    if (deployerBalance === 0n) {
      console.log(`    ⚠️  WARNING: Deployer wallet has no funds!`);
      allGood = false;
    } else {
      console.log(`    ✅ Funded`);
    }
    
    const aiBalance = await provider.getBalance(process.env.AI_WALLET_ADDRESS!);
    console.log(`  AI Wallet (${process.env.AI_WALLET_ADDRESS}):`);
    console.log(`    Balance: ${ethers.formatEther(aiBalance)} ETH`);
    
    if (aiBalance === 0n) {
      console.log(`    ⚠️  WARNING: AI wallet has no funds!`);
    } else {
      console.log(`    ✅ Funded`);
    }
  } catch (error) {
    console.log(`  ❌ Failed to check wallet balances`);
    console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    allGood = false;
  }
  console.log();

  // Test Supabase Connection
  console.log('🗄️  Testing Supabase Connection...');
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
    
    // Try a simple query
    const { error } = await supabase.from('_metadata').select('*').limit(1);
    
    if (error && !error.message.includes('does not exist')) {
      throw error;
    }
    
    console.log('  ✅ Supabase connection successful');
  } catch (error) {
    console.log('  ⚠️  Supabase connection issue (may need schema setup)');
    console.log(`  Note: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  console.log();

  // Test OpenAI API Key Format
  console.log('🤖 Checking OpenAI API Key...');
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && (openaiKey.startsWith('sk-') || openaiKey.startsWith('sk-proj-'))) {
    console.log('  ✅ OpenAI API key format looks valid');
    console.log(`  Key: ${openaiKey.substring(0, 15)}...${openaiKey.substring(openaiKey.length - 4)}`);
  } else {
    console.log('  ❌ OpenAI API key format invalid');
    allGood = false;
  }
  console.log();

  // Test ElevenLabs API Key Format
  console.log('🗣️  Checking ElevenLabs API Key...');
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (elevenLabsKey && elevenLabsKey.startsWith('sk_')) {
    console.log('  ✅ ElevenLabs API key format looks valid');
    console.log(`  Key: ${elevenLabsKey.substring(0, 10)}...${elevenLabsKey.substring(elevenLabsKey.length - 4)}`);
  } else {
    console.log('  ❌ ElevenLabs API key format invalid');
    allGood = false;
  }
  console.log();

  // Test Circle API Key Format
  console.log('⭕ Checking Circle API Configuration...');
  const circleKey = process.env.CIRCLE_API_KEY;
  if (circleKey && circleKey.includes(':')) {
    console.log('  ✅ Circle API key format looks valid');
    console.log(`  Key: ${circleKey.substring(0, 20)}...`);
  } else {
    console.log('  ❌ Circle API key format invalid');
    allGood = false;
  }
  
  if (process.env.ENTITY_SECRET) {
    console.log('  ✅ Entity Secret configured');
  } else {
    console.log('  ❌ Entity Secret missing');
    allGood = false;
  }
  console.log();

  // Summary
  console.log('='.repeat(60));
  if (allGood) {
    console.log('✅ ALL CHECKS PASSED!');
    console.log('🚀 You are ready to deploy and run RentFlow AI');
  } else {
    console.log('⚠️  SOME CHECKS FAILED');
    console.log('Please review the issues above before deploying');
  }
  console.log('='.repeat(60));
  console.log();

  // Next Steps
  console.log('📝 Next Steps:');
  if (!allGood) {
    console.log('  1. Fix any failed checks above');
    console.log('  2. Fund your Circle developer wallets if needed');
  }
  console.log('  3. Set up Supabase database schema');
  console.log('  4. Deploy smart contracts: npm run deploy:contracts');
  console.log('  5. Update CONTRACT_ADDRESS in .env files');
  console.log('  6. Start development: npm run dev');
  console.log();
}

verifyEnvironment()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
