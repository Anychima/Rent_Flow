const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: `${__dirname}/.env` });

// Use service role key to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY not found in .env');
  console.log('   Add it to backend/.env to bypass RLS policies');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createMissingPayments() {
  const email = 'test@all.com';
  
  console.log('\n🔧 Creating missing payment records for:', email);
  console.log('='.repeat(60));

  // 1. Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (userError || !user) {
    console.error('❌ User not found');
    return;
  }

  console.log('✅ Found user:', user.email, '(ID:', user.id + ')');

  // 2. Get their lease
  const { data: leases, error: leasesError } = await supabase
    .from('leases')
    .select('*')
    .eq('tenant_id', user.id)
    .eq('lease_status', 'fully_signed')
    .order('created_at', { ascending: false });

  if (leasesError || !leases || leases.length === 0) {
    console.error('❌ No fully signed lease found');
    return;
  }

  const lease = leases[0];
  console.log('✅ Found lease:', lease.id);
  console.log('   - Status:', lease.lease_status);
  console.log('   - Security Deposit:', lease.security_deposit_usdc, 'USDC');
  console.log('   - Monthly Rent:', lease.monthly_rent_usdc, 'USDC');
  console.log('   - Start Date:', lease.start_date);

  // 3. Check existing payments
  const { data: existingPayments } = await supabase
    .from('rent_payments')
    .select('*')
    .eq('lease_id', lease.id);

  console.log('\n💰 Existing payments:', existingPayments?.length || 0);

  if (existingPayments && existingPayments.length > 0) {
    console.log('\n⚠️  Payments already exist for this lease:');
    existingPayments.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.payment_type}: ${p.status}`);
    });
    console.log('\n❓ Do you want to create new payments anyway? (This would be duplicate)');
    console.log('   If lease needs recreation, delete old payments first.');
    return;
  }

  // 4. Create payment records
  console.log('\n📝 Creating payment records...');

  // Security Deposit
  const { data: securityPayment, error: securityError } = await supabase
    .from('rent_payments')
    .insert({
      lease_id: lease.id,
      tenant_id: user.id,
      amount_usdc: lease.security_deposit_usdc,
      payment_type: 'security_deposit',
      due_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      notes: 'Initial security deposit payment required for lease activation',
      blockchain_network: 'solana'
    })
    .select()
    .single();

  if (securityError) {
    console.error('❌ Error creating security deposit:', securityError.message);
  } else {
    console.log('✅ Security deposit payment created:', securityPayment.id);
  }

  // First Month Rent
  const { data: rentPayment, error: rentError } = await supabase
    .from('rent_payments')
    .insert({
      lease_id: lease.id,
      tenant_id: user.id,
      amount_usdc: lease.monthly_rent_usdc,
      payment_type: 'rent',
      due_date: lease.start_date,
      status: 'pending',
      notes: 'First month rent payment required for lease activation',
      blockchain_network: 'solana'
    })
    .select()
    .single();

  if (rentError) {
    console.error('❌ Error creating rent payment:', rentError.message);
  } else {
    console.log('✅ First month rent payment created:', rentPayment.id);
  }

  console.log('\n✅ DONE! Payment records created.');
  console.log('\n📋 Next steps:');
  console.log('   1. User should login and navigate to lease signing page');
  console.log('   2. PaymentSection will now show the two pending payments');
  console.log('   3. User can complete payments to activate lease');
  console.log('   4. After both payments complete, role will auto-transition to tenant');
  console.log('\n' + '='.repeat(60));
}

createMissingPayments().catch(console.error);
