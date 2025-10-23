#!/usr/bin/env ts-node
/**
 * RentFlow AI - Payment Scheduler Setup
 * 
 * This script sets up automated payment generation and overdue payment tracking.
 * It creates a cron job that runs daily to generate new payments and mark overdue ones.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import paymentScheduler from '../backend/src/services/paymentScheduler';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || ''
);

async function runPaymentScheduler() {
  console.log('💳 Running payment scheduler...');
  
  try {
    // Generate monthly payments for active leases
    console.log('📅 Generating monthly payments...');
    const paymentResults = await paymentScheduler.generateMonthlyPayments();
    
    console.log(`✅ Generated ${paymentResults.created} new payment(s)`);
    if (paymentResults.errors > 0) {
      console.log(`⚠️  Encountered ${paymentResults.errors} error(s)`);
      paymentResults.details.forEach(detail => console.log(`   - ${detail}`));
    }

    // Mark overdue payments
    console.log('\n⏰ Marking overdue payments...');
    const overdueResults = await paymentScheduler.markOverduePayments();
    
    if (overdueResults.error) {
      console.error('❌ Error marking overdue payments:', overdueResults.error);
    } else {
      console.log(`✅ Marked ${overdueResults.updated} payment(s) as overdue`);
    }

    // Send payment reminders
    console.log('\n📧 Sending payment reminders...');
    const reminderResults = await paymentScheduler.sendPaymentReminders();
    
    console.log(`✅ Sent ${reminderResults.sent} reminder(s)`);
    if (reminderResults.errors > 0) {
      console.log(`⚠️  Encountered ${reminderResults.errors} error(s)`);
      reminderResults.details.forEach(detail => console.log(`   - ${detail}`));
    }

    console.log('\n🎉 Payment scheduler run completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in payment scheduler:', error);
  }
}

async function setupPaymentScheduler() {
  console.log('⏰ Setting up automated payment scheduler...');
  
  try {
    // Run immediately
    await runPaymentScheduler();
    
    // Schedule to run daily at 2:00 AM
    const scheduleDaily = () => {
      const now = new Date();
      const nextRun = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        2, // 2:00 AM
        0,
        0
      );
      
      const delay = nextRun.getTime() - now.getTime();
      
      setTimeout(async () => {
        console.log(`\n[${new Date().toISOString()}] Running scheduled payment scheduler...`);
        await runPaymentScheduler();
        scheduleDaily(); // Schedule next run
      }, delay);
    };
    
    scheduleDaily();
    
    console.log('✅ Payment scheduler set up successfully');
    console.log('📝 The scheduler will now run daily at 2:00 AM to:');
    console.log('   • Generate monthly payments for active leases');
    console.log('   • Mark overdue payments as late');
    console.log('   • Send payment reminders');
    
  } catch (error) {
    console.error('❌ Error setting up payment scheduler:', error);
  }
}

// Run the setup
if (require.main === module) {
  setupPaymentScheduler().catch(console.error);
}

export { runPaymentScheduler, setupPaymentScheduler };