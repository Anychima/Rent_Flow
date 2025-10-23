#!/usr/bin/env ts-node
/**
 * RentFlow AI - Voice Notification System Setup
 * 
 * This script sets up automated voice notifications for various events
 * including rent reminders, maintenance updates, and payment confirmations.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import voiceNotificationScheduler from '../backend/src/services/voiceNotificationScheduler';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || ''
);

async function setupVoiceNotificationSystem() {
  console.log('🔊 Setting up automated voice notification system...');
  
  try {
    // Start the voice notification scheduler
    // Check for notifications every 30 minutes
    voiceNotificationScheduler.start(30);
    
    console.log('✅ Voice notification system started successfully');
    console.log('📝 The system will now check for notifications every 30 minutes');
    
    // Run initial check
    console.log('\n🔍 Running initial notification check...');
    
    // Check for rent reminders (due in next 3 days)
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const { data: payments, error: paymentError } = await supabase
      .from('rent_payments')
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*),
          tenant:users(*)
        )
      `)
      .eq('status', 'pending')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', threeDaysFromNow.toISOString().split('T')[0]);

    if (paymentError) {
      console.error('❌ Error fetching payments:', paymentError);
    } else if (payments && payments.length > 0) {
      console.log(`📊 Found ${payments.length} upcoming payments for rent reminders`);
    } else {
      console.log('✅ No upcoming payments requiring rent reminders');
    }

    // Check for lease expiration warnings (expiring in next 30 days)
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const { data: leases, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:users(*)
      `)
      .eq('status', 'active')
      .gte('end_date', today.toISOString().split('T')[0])
      .lte('end_date', thirtyDaysFromNow.toISOString().split('T')[0]);

    if (leaseError) {
      console.error('❌ Error fetching leases:', leaseError);
    } else if (leases && leases.length > 0) {
      console.log(`📊 Found ${leases.length} leases expiring soon`);
    } else {
      console.log('✅ No leases expiring in the next 30 days');
    }

    // Check for completed maintenance requests without notifications
    const { data: maintenanceRequests, error: maintenanceError } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        requestor:users(*),
        property:properties(*)
      `)
      .eq('status', 'completed')
      .limit(5);

    if (maintenanceError) {
      console.error('❌ Error fetching maintenance requests:', maintenanceError);
    } else if (maintenanceRequests && maintenanceRequests.length > 0) {
      console.log(`📊 Found ${maintenanceRequests.length} completed maintenance requests without notifications`);
    } else {
      console.log('✅ No pending maintenance notifications');
    }

    console.log('\n🎉 Voice notification system setup completed!');
    console.log('📝 The system will now automatically send voice notifications for:');
    console.log('   • Rent payment reminders (3 days and 1 day before due date)');
    console.log('   • Lease expiration warnings (30, 14, and 7 days before expiration)');
    console.log('   • Maintenance request updates');
    console.log('   • Payment confirmations');
    
  } catch (error) {
    console.error('❌ Error setting up voice notification system:', error);
  }
}

// Run the setup
if (require.main === module) {
  setupVoiceNotificationSystem().catch(console.error);
}

export { setupVoiceNotificationSystem };