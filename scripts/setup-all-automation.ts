#!/usr/bin/env ts-node
/**
 * RentFlow AI - Complete Automation Setup
 * 
 * This script sets up all automated systems for RentFlow AI:
 * - Smart contract deployment
 * - AI analysis for maintenance requests
 * - Voice notifications
 * - Payment scheduler
 * - Blockchain sync logging
 */

import dotenv from 'dotenv';
import { setupCronJob } from './setup-ai-analysis';
import { setupVoiceNotificationSystem } from './setup-voice-notifications';
import { setupPaymentScheduler } from './setup-payment-scheduler';
import { setupBlockchainLogging } from './setup-blockchain-logging';

dotenv.config();

async function setupAllAutomation() {
  console.log('🚀 Setting up all RentFlow AI automation systems...\n');
  
  try {
    // Setup AI Analysis
    console.log('1️⃣ Setting up AI Analysis System...');
    await setupCronJob();
    console.log('✅ AI Analysis System setup completed\n');
    
    // Setup Voice Notifications
    console.log('2️⃣ Setting up Voice Notification System...');
    await setupVoiceNotificationSystem();
    console.log('✅ Voice Notification System setup completed\n');
    
    // Setup Payment Scheduler
    console.log('3️⃣ Setting up Payment Scheduler...');
    await setupPaymentScheduler();
    console.log('✅ Payment Scheduler setup completed\n');
    
    // Setup Blockchain Logging
    console.log('4️⃣ Setting up Blockchain Sync Logging...');
    await setupBlockchainLogging();
    console.log('✅ Blockchain Sync Logging setup completed\n');
    
    console.log('🎉 All automation systems have been set up successfully!');
    console.log('\n📋 Summary of active systems:');
    console.log('   • AI Analysis: Running every 15 minutes');
    console.log('   • Voice Notifications: Running every 30 minutes');
    console.log('   • Payment Scheduler: Running daily at 2:00 AM');
    console.log('   • Blockchain Sync: Running every 10 minutes');
    console.log('\n📝 To stop these systems, terminate this process (Ctrl+C)');
    
  } catch (error) {
    console.error('❌ Error setting up automation systems:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down automation systems...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down automation systems...');
  process.exit(0);
});

// Run the setup
if (require.main === module) {
  setupAllAutomation().catch(console.error);
}

export { setupAllAutomation };