const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: `${__dirname}/.env` });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

async function checkRentPaymentsSchema() {
  console.log('\n📋 Checking rent_payments table structure...\n');

  const { data, error } = await supabase
    .from('rent_payments')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('✅ rent_payments table exists');
  console.log('📊 Sample records:', data?.length || 0);
  
  if (data && data.length > 0) {
    console.log('\n📝 Schema (from first record):');
    const firstRecord = data[0];
    Object.keys(firstRecord).forEach(key => {
      console.log(`   - ${key}: ${typeof firstRecord[key]} = ${firstRecord[key]}`);
    });
  }

  // Check for test@all.com payments
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'test@all.com')
    .single();

  if (userData) {
    const { data: userPayments } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('tenant_id', userData.id);

    console.log('\n💰 Payments for test@all.com:', userPayments?.length || 0);
    if (userPayments && userPayments.length > 0) {
      userPayments.forEach((p, idx) => {
        console.log(`\n   Payment ${idx + 1}:`);
        console.log('   - Type:', p.payment_type);
        console.log('   - Amount:', p.amount_usdc);
        console.log('   - Status:', p.status);
        console.log('   - Lease ID:', p.lease_id);
      });
    }
  }
}

checkRentPaymentsSchema().catch(console.error);
