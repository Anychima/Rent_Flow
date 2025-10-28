const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetHouseTestPayments() {
  console.log('\n🔄 RESETTING PAYMENTS FOR house@test.com');
  console.log('============================================================\n');

  try {
    // Step 1: Get user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role, full_name')
      .eq('email', 'house@test.com')
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError);
      process.exit(1);
    }

    console.log('👤 Found User:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.full_name}`);
    console.log(`   Current Role: ${user.role}`);
    console.log(`   User ID: ${user.id}\n`);

    // Step 2: Reset all payments
    const { data: payments, error: paymentsError } = await supabase
      .from('rent_payments')
      .update({
        status: 'pending',
        transaction_hash: null,
        payment_date: null,
        on_chain: false,
        notes: 'Reset for testing'
      })
      .eq('tenant_id', user.id)
      .select();

    if (paymentsError) {
      console.error('❌ Error resetting payments:', paymentsError);
    } else {
      console.log(`✅ Reset ${payments?.length || 0} payments to PENDING\n`);
      payments?.forEach(p => {
        console.log(`   - Payment ${p.id}: ${p.payment_type} ($${p.amount_usdc} USDC)`);
      });
      console.log('');
    }

    // Step 3: Reset user role to prospective_tenant
    const { error: roleError } = await supabase
      .from('users')
      .update({
        role: 'prospective_tenant',
        user_type: 'prospective_tenant'
      })
      .eq('id', user.id);

    if (roleError) {
      console.error('❌ Error resetting user role:', roleError);
    } else {
      console.log('✅ Reset user role to PROSPECTIVE_TENANT\n');
    }

    // Step 4: Reset lease status
    // Note: lease_status can be 'fully_signed', but status column must be 'pending'
    const { data: leases, error: leaseError } = await supabase
      .from('leases')
      .update({
        lease_status: 'fully_signed',
        status: 'pending',
        activated_at: null
      })
      .eq('tenant_id', user.id)
      .eq('lease_status', 'active')
      .select();

    if (leaseError) {
      console.error('❌ Error resetting lease:', leaseError);
    } else if (leases && leases.length > 0) {
      console.log(`✅ Reset ${leases.length} lease(s) to FULLY_SIGNED\n`);
    } else {
      console.log('ℹ️  No active leases to reset\n');
    }

    // Step 5: Verify changes
    console.log('============================================================');
    console.log('📋 VERIFICATION - Current State:\n');

    const { data: finalPayments } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: true });

    console.log(`Payments (${finalPayments?.length || 0}):`);
    finalPayments?.forEach(p => {
      console.log(`   ${p.payment_type}: ${p.status} - $${p.amount_usdc} USDC`);
    });

    const { data: finalUser } = await supabase
      .from('users')
      .select('role, user_type')
      .eq('id', user.id)
      .single();

    console.log(`\nUser Role: ${finalUser?.role}`);
    console.log(`User Type: ${finalUser?.user_type}`);

    console.log('\n============================================================');
    console.log('✅ RESET COMPLETE!\n');
    console.log('You can now:');
    console.log('1. Refresh the frontend in your browser');
    console.log('2. Login as house@test.com');
    console.log('3. Navigate to the lease signing page');
    console.log('4. Test the payment flow\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

resetHouseTestPayments().then(() => process.exit(0));
