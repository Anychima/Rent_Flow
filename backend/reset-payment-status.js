const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: __dirname + '/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetPaymentStatus(leaseId) {
  console.log('\n🔄 Resetting payment status for lease:', leaseId);
  console.log('============================================================\n');

  try {
    // Get all payments for this lease
    const { data: payments, error: fetchError } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('lease_id', leaseId);

    if (fetchError) throw fetchError;

    console.log(`Found ${payments?.length || 0} payments\n`);

    for (const payment of payments || []) {
      console.log(`📋 Payment ${payment.id}:`);
      console.log(`   Type: ${payment.payment_type}`);
      console.log(`   Current Status: ${payment.status}`);
      console.log(`   Transaction Hash: ${payment.transaction_hash || 'N/A'}`);

      // Reset to pending if marked as completed but no valid transaction
      if (payment.status === 'completed' && (!payment.transaction_hash || payment.transaction_hash.startsWith('SIMULATED_'))) {
        console.log('   ⚠️  Payment marked completed but no real transaction - RESETTING TO PENDING');

        const { error: updateError } = await supabase
          .from('rent_payments')
          .update({
            status: 'pending',
            transaction_hash: null,
            payment_date: null,
            on_chain: false
          })
          .eq('id', payment.id);

        if (updateError) {
          console.error('   ❌ Error resetting payment:', updateError);
        } else {
          console.log('   ✅ Payment reset to PENDING');
        }
      } else {
        console.log('   ✅ Payment status is correct');
      }
      console.log('');
    }

    // Also reset lease status if needed
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('*')
      .eq('id', leaseId)
      .single();

    if (leaseError) throw leaseError;

    console.log('\n📄 Lease Status:');
    console.log(`   Current: ${lease.lease_status}`);
    console.log(`   Activated At: ${lease.activated_at || 'Not activated'}`);

    if (lease.lease_status === 'active' && !lease.activated_at) {
      console.log('   ⚠️  Lease marked active but no activation timestamp - RESETTING TO FULLY_SIGNED');

      const { error: resetLeaseError } = await supabase
        .from('leases')
        .update({
          lease_status: 'fully_signed',
          status: 'fully_signed',
          activated_at: null
        })
        .eq('id', leaseId);

      if (resetLeaseError) {
        console.error('   ❌ Error resetting lease:', resetLeaseError);
      } else {
        console.log('   ✅ Lease reset to FULLY_SIGNED');
      }
    } else {
      console.log('   ✅ Lease status is correct');
    }

    console.log('\n============================================================');
    console.log('✅ Reset complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get lease ID from command line
const leaseId = process.argv[2];

if (!leaseId) {
  console.error('Usage: node reset-payment-status.js <lease_id>');
  process.exit(1);
}

resetPaymentStatus(leaseId).then(() => process.exit(0));
