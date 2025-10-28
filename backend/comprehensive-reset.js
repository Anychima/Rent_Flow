/**
 * COMPREHENSIVE PAYMENT RESET SCRIPT
 * Resets any incorrectly marked payments to pending state
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function comprehensiveReset() {
  console.log('\n🔧 COMPREHENSIVE PAYMENT SYSTEM RESET');
  console.log('============================================================\n');

  try {
    // 1. Find all payments marked as 'completed' but with invalid/simulated hashes
    const { data: invalidPayments } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('status', 'completed')
      .or('transaction_hash.is.null,transaction_hash.like.SIMULATED_%,transaction_hash.like.%-%');

    console.log(`Found ${invalidPayments?.length || 0} payments with invalid completion status\n`);

    if (invalidPayments && invalidPayments.length > 0) {
      for (const payment of invalidPayments) {
        console.log(`Resetting Payment: ${payment.id}`);
        console.log(`  Type: ${payment.payment_type}`);
        console.log(`  Amount: ${payment.amount_usdc} USDC`);
        console.log(`  Current Hash: ${payment.transaction_hash || 'null'}`);

        // Reset to pending
        const { error } = await supabase
          .from('rent_payments')
          .update({
            status: 'pending',
            transaction_hash: null,
            payment_date: null,
            on_chain: false,
            notes: payment.notes ? `${payment.notes} | Reset by admin` : 'Reset to pending - invalid transaction'
          })
          .eq('id', payment.id);

        if (error) {
          console.log(`  ❌ Error resetting: ${error.message}`);
        } else {
          console.log(`  ✅ Reset to PENDING`);
        }
        console.log('');
      }
    }

    // 2. Find leases marked as 'active' but with pending payments
    const { data: activeLeases } = await supabase
      .from('leases')
      .select(`
        *,
        payments:rent_payments(id, status, payment_type)
      `)
      .eq('lease_status', 'active');

    console.log(`\nChecking ${activeLeases?.length || 0} active leases for payment issues\n`);

    if (activeLeases) {
      for (const lease of activeLeases) {
        const payments = lease.payments || [];
        const hasPending = payments.some((p) => p.status === 'pending');

        if (hasPending) {
          console.log(`Lease ${lease.id}:`);
          console.log(`  Status: ${lease.lease_status}`);
          console.log(`  Has pending payments: YES`);
          console.log(`  Resetting to fully_signed...`);

          const { error } = await supabase
            .from('leases')
            .update({
              lease_status: 'fully_signed',
              status: 'pending',
              activated_at: null
            })
            .eq('id', lease.id);

          if (error) {
            console.log(`  ❌ Error: ${error.message}`);
          } else {
            console.log(`  ✅ Reset to FULLY_SIGNED`);
          }
          console.log('');
        }
      }
    }

    // 3. Find users with role 'tenant' but no completed lease payments
    const { data: tenants } = await supabase
      .from('users')
      .select(`
        *,
        leases:leases!tenant_id(
          id,
          lease_status,
          payments:rent_payments(id, status)
        )
      `)
      .eq('role', 'tenant');

    console.log(`\nChecking ${tenants?.length || 0} tenant users\n`);

    if (tenants) {
      for (const user of tenants) {
        const leases = user.leases || [];
        
        for (const lease of leases) {
          const payments = lease.payments || [];
          const allCompleted = payments.every((p) => p.status === 'completed');

          if (!allCompleted && payments.length > 0) {
            console.log(`User ${user.email}:`);
            console.log(`  Current Role: ${user.role}`);
            console.log(`  Has incomplete payments: YES`);
            console.log(`  Resetting to prospective_tenant...`);

            const { error } = await supabase
              .from('users')
              .update({
                role: 'prospective_tenant',
                user_type: 'prospective_tenant'
              })
              .eq('id', user.id);

            if (error) {
              console.log(`  ❌ Error: ${error.message}`);
            } else {
              console.log(`  ✅ Reset to PROSPECTIVE_TENANT`);
            }
            console.log('');
            break; // Only check first lease
          }
        }
      }
    }

    console.log('============================================================');
    console.log('✅ RESET COMPLETE!\n');
    console.log('Next steps:');
    console.log('1. Refresh the frontend');
    console.log('2. Login with the affected user');
    console.log('3. Try making payment again\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

comprehensiveReset().then(() => process.exit(0));
