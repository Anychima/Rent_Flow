require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyCompleteWorkflow() {
  console.log('🔍 COMPLETE WORKFLOW VERIFICATION\n');
  console.log('=====================================\n');

  // 1. Check Obi Nwa's lease
  console.log('1️⃣ CHECKING OBI NWA\'S LEASE...\n');
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'obi@test.com')
    .single();

  if (!user) {
    console.error('❌ User not found');
    return;
  }

  console.log(`✅ User: ${user.full_name}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Wallet: ${user.wallet_address || 'Not set'}\n`);

  const { data: lease, error: leaseError } = await supabase
    .from('leases')
    .select('*')
    .eq('tenant_id', user.id)
    .single();

  if (!lease) {
    console.log('❌ No lease found for user\n');
    return;
  }

  console.log('📋 LEASE DETAILS:');
  console.log(`   ID: ${lease.id}`);
  console.log(`   Status: ${lease.status}`);
  console.log(`   Lease Status: ${lease.lease_status}`);
  console.log(`   Tenant Signed At: ${lease.tenant_signed_at || '❌ NULL'}`);
  console.log(`   Landlord Signed At: ${lease.landlord_signed_at || '❌ NULL'}`);
  console.log(`   Tenant Signature: ${lease.tenant_signature || '❌ NULL'}`);
  console.log(`   Landlord Signature: ${lease.landlord_signature || '❌ NULL'}`);
  console.log(`   Blockchain TX Hash: ${lease.blockchain_transaction_hash || '❌ NULL'}`);
  console.log(`   Blockchain Lease ID: ${lease.blockchain_lease_id || '❌ NULL'}\n`);

  // 2. Check payments
  console.log('2️⃣ CHECKING PAYMENTS...\n');
  
  const { data: payments, error: payError } = await supabase
    .from('rent_payments')
    .select('*')
    .eq('lease_id', lease.id)
    .order('created_at', { ascending: false });

  if (payments && payments.length > 0) {
    payments.forEach((p, i) => {
      console.log(`Payment ${i + 1}:`);
      console.log(`   Type: ${p.payment_type}`);
      console.log(`   Amount: $${p.amount_usdc} USDC`);
      console.log(`   Status: ${p.status}`);
      console.log(`   Network: ${p.blockchain_network}`);
      console.log(`   TX Hash: ${p.transaction_hash || '❌ NULL'}`);
      console.log(`   Created: ${new Date(p.created_at).toLocaleString()}\n`);
    });
  } else {
    console.log('❌ No payments found\n');
  }

  // 3. Check lease signing workflow in database
  console.log('3️⃣ CHECKING LEASE SIGNING ENDPOINTS...\n');
  
  // Check if there's a lease review/signing record
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*, owner:users!properties_owner_id_fkey(*)')
    .eq('id', lease.property_id)
    .single();

  if (property) {
    console.log('🏠 PROPERTY & MANAGER:');
    console.log(`   Property: ${property.title}`);
    console.log(`   Manager: ${property.owner?.full_name}`);
    console.log(`   Manager Email: ${property.owner?.email}`);
    console.log(`   Manager Wallet: ${property.owner?.wallet_address || '❌ Not set'}\n`);
  }

  // 4. Diagnosis
  console.log('4️⃣ WORKFLOW DIAGNOSIS:\n');
  
  const issues = [];
  const working = [];

  if (lease.tenant_signed_at) {
    working.push('✅ Tenant signature timestamp exists');
  } else {
    issues.push('❌ Tenant signature timestamp is NULL');
  }

  if (lease.landlord_signed_at) {
    working.push('✅ Landlord signature timestamp exists');
  } else {
    issues.push('❌ Landlord signature timestamp is NULL');
  }

  if (lease.blockchain_transaction_hash) {
    working.push('✅ Blockchain transaction hash exists');
  } else {
    issues.push('❌ Blockchain transaction hash is NULL');
  }

  if (payments && payments.some(p => p.status === 'completed')) {
    working.push('✅ Has completed payments');
  } else {
    issues.push('⚠️ No completed payments with real TX hashes');
  }

  if (user.role === 'tenant') {
    working.push('✅ User role is tenant');
  } else {
    issues.push(`❌ User role is ${user.role}, not tenant`);
  }

  console.log('WORKING:');
  working.forEach(w => console.log(`  ${w}`));
  console.log();
  
  console.log('ISSUES:');
  issues.forEach(i => console.log(`  ${i}`));
  console.log();

  // 5. Recommendations
  console.log('5️⃣ RECOMMENDATIONS:\n');
  
  if (!lease.tenant_signed_at && !lease.landlord_signed_at) {
    console.log('🔧 ISSUE: Lease has never been signed');
    console.log('   This is test data from before signing workflow was implemented');
    console.log('   SOLUTION: Start fresh test with complete workflow\n');
  }

  if (!lease.blockchain_transaction_hash) {
    console.log('🔧 ISSUE: No blockchain transaction hash');
    console.log('   Lease was not signed on-chain');
    console.log('   SOLUTION: Implement on-chain signing in lease review page\n');
  }

  console.log('=====================================');
  console.log('✅ VERIFICATION COMPLETE');
}

verifyCompleteWorkflow().catch(console.error);
