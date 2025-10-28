require('dotenv').config({ path: `${__dirname}/.env` });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugUser() {
  const email = 'house@test.com';
  
  console.log('='.repeat(60));
  console.log('🔍 DEBUGGING USER:', email);
  console.log('='.repeat(60));

  // 1. Get user info
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (userError || !user) {
    console.log('❌ User not found:', userError?.message);
    return;
  }

  console.log('\n👤 USER INFO:');
  console.log('  ID:', user.id);
  console.log('  Name:', user.full_name);
  console.log('  Email:', user.email);
  console.log('  Role:', user.role);
  console.log('  User Type:', user.user_type);

  // 2. Get leases
  const { data: leases, error: leaseError } = await supabase
    .from('leases')
    .select('*')
    .eq('tenant_id', user.id);

  console.log('\n📄 LEASES:');
  if (leases && leases.length > 0) {
    leases.forEach((lease, i) => {
      console.log(`\n  Lease ${i + 1}:`);
      console.log('    ID:', lease.id);
      console.log('    Status:', lease.lease_status);
      console.log('    Tenant Signed:', lease.tenant_signature ? 'YES' : 'NO');
      console.log('    Landlord Signed:', lease.landlord_signature ? 'YES' : 'NO');
      console.log('    Activated:', lease.activated_at || 'NO');
    });
  } else {
    console.log('  No leases found');
  }

  // 3. Get payments
  const { data: payments, error: paymentError } = await supabase
    .from('rent_payments')
    .select('*')
    .eq('tenant_id', user.id);

  console.log('\n💳 PAYMENTS:');
  if (payments && payments.length > 0) {
    payments.forEach((payment, i) => {
      console.log(`\n  Payment ${i + 1}:`);
      console.log('    ID:', payment.id);
      console.log('    Type:', payment.payment_type);
      console.log('    Amount:', payment.amount_usdc, 'USDC');
      console.log('    Status:', payment.status);
      console.log('    Due Date:', payment.due_date);
    });
  } else {
    console.log('  No payments found');
  }

  // 4. Diagnosis
  console.log('\n📊 DIAGNOSIS:');
  console.log('='.repeat(60));
  
  if (user.role === 'tenant') {
    console.log('✅ User is already a tenant');
  } else if (user.role === 'prospective_tenant') {
    console.log('⚠️  User is still prospective_tenant');
    
    if (!leases || leases.length === 0) {
      console.log('   Reason: No leases found');
    } else {
      const signedLease = leases.find(l => l.tenant_signature && l.landlord_signature);
      if (!signedLease) {
        console.log('   Reason: No fully signed lease');
      } else {
        console.log('   ✅ Has fully signed lease');
        
        const securityPaid = payments?.some(p => 
          p.payment_type === 'security_deposit' && p.status === 'completed'
        );
        const rentPaid = payments?.some(p => 
          p.payment_type === 'rent' && p.status === 'pending'
        );

        if (!securityPaid || !rentPaid) {
          console.log('   ❌ Reason: Payments not completed');
          if (!securityPaid) console.log('      - Security deposit pending');
          if (!rentPaid) console.log('      - First month rent pending');
          console.log('\n   💡 SOLUTION: User needs to complete payments');
          console.log('      1. Login to tenant dashboard');
          console.log('      2. Should see yellow payment alert banner');
          console.log('      3. Click "Complete Payments Now"');
          console.log('      4. Complete pending payments');
        } else {
          console.log('   ✅ All payments completed');
          console.log('   ❌ Reason: Lease not activated');
          console.log('\n   💡 SOLUTION: Activate lease manually or trigger activation endpoint');
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
}

debugUser().catch(console.error);
