const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: __dirname + '/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllPayments() {
  console.log('\n🔍 COMPREHENSIVE PAYMENT CHECK');
  console.log('============================================================\n');

  try {
    // Get ALL payments ordered by most recent
    const { data: allPayments, error } = await supabase
      .from('rent_payments')
      .select(`
        *,
        lease:leases(id, lease_status, tenant_id)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`Found ${allPayments?.length || 0} total payments\n`);

    // Group by status
    const byStatus = {};
    allPayments?.forEach(p => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    });

    console.log('📊 PAYMENT STATUS SUMMARY:');
    Object.keys(byStatus).forEach(status => {
      console.log(`   ${status}: ${byStatus[status]}`);
    });
    console.log('');

    // Show recent payments with details
    console.log('📋 RECENT 10 PAYMENTS:');
    console.log('============================================================\n');

    allPayments?.slice(0, 10).forEach((payment, index) => {
      console.log(`Payment ${index + 1}:`);
      console.log(`   ID: ${payment.id}`);
      console.log(`   Type: ${payment.payment_type}`);
      console.log(`   Amount: ${payment.amount_usdc} USDC`);
      console.log(`   Status: ${payment.status}`);
      console.log(`   Transaction Hash: ${payment.transaction_hash || 'N/A'}`);
      console.log(`   On-Chain: ${payment.on_chain || false}`);
      console.log(`   Paid At: ${payment.payment_date || 'Not paid'}`);
      console.log(`   Notes: ${payment.notes || 'None'}`);
      console.log(`   Lease ID: ${payment.lease_id}`);
      if (payment.lease) {
        console.log(`   Lease Status: ${payment.lease.lease_status}`);
      }
      console.log(`   Created: ${payment.created_at}`);
      
      // Check if payment is incorrectly marked as completed
      if (payment.status === 'completed') {
        const hasRealHash = payment.transaction_hash && 
                          !payment.transaction_hash.startsWith('SIMULATED_') &&
                          !payment.transaction_hash.includes('-');
        if (!hasRealHash) {
          console.log(`   ⚠️  WARNING: Marked completed but no valid blockchain hash!`);
        }
      }
      console.log('');
    });

    console.log('============================================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllPayments().then(() => process.exit(0));
