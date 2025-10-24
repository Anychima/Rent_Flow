const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: `${__dirname}/.env` });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

async function checkUserStatus() {
  const email = 'test@all.com';
  
  console.log('\n🔍 Checking status for:', email);
  console.log('='.repeat(60));

  // 1. Get user info
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (userError) {
    console.error('❌ User not found:', userError.message);
    return;
  }

  console.log('\n👤 USER INFO:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Role:', user.role);
  console.log('   User Type:', user.user_type);
  console.log('   Created:', user.created_at);

  // 2. Get leases
  const { data: leases, error: leasesError } = await supabase
    .from('leases')
    .select('*')
    .eq('tenant_id', user.id)
    .order('created_at', { ascending: false });

  if (leasesError) {
    console.error('❌ Error fetching leases:', leasesError.message);
  } else {
    console.log('\n📄 LEASES:', leases?.length || 0);
    leases?.forEach((lease, idx) => {
      console.log(`\n   Lease ${idx + 1}:`);
      console.log('   - ID:', lease.id);
      console.log('   - Status:', lease.lease_status);
      console.log('   - Landlord Signed:', lease.landlord_signature ? '✅' : '❌');
      console.log('   - Tenant Signed:', lease.tenant_signature ? '✅' : '❌');
      console.log('   - Activated At:', lease.activated_at || 'Not activated');
      console.log('   - Created:', lease.created_at);
    });
  }

  // 3. Get payments
  const { data: payments, error: paymentsError } = await supabase
    .from('rent_payments')
    .select('*')
    .eq('tenant_id', user.id)
    .order('created_at', { ascending: false });

  if (paymentsError) {
    console.error('❌ Error fetching payments:', paymentsError.message);
  } else {
    console.log('\n💰 PAYMENTS:', payments?.length || 0);
    payments?.forEach((payment, idx) => {
      console.log(`\n   Payment ${idx + 1}:`);
      console.log('   - ID:', payment.id);
      console.log('   - Type:', payment.payment_type);
      console.log('   - Amount:', payment.amount_usdc, 'USDC');
      console.log('   - Status:', payment.status);
      console.log('   - Paid At:', payment.paid_at || 'Not paid');
      console.log('   - Transaction Hash:', payment.transaction_hash || 'N/A');
      console.log('   - Lease ID:', payment.lease_id);
    });
  }

  // 4. Check if all required payments are complete for each lease
  if (leases && leases.length > 0) {
    console.log('\n🔍 PAYMENT STATUS BY LEASE:');
    for (const lease of leases) {
      const { data: leasePayments } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('lease_id', lease.id)
        .in('payment_type', ['security_deposit', 'rent']);

      const securityPaid = leasePayments?.some(p => 
        p.payment_type === 'security_deposit' && p.status === 'completed'
      );
      const rentPaid = leasePayments?.some(p => 
        p.payment_type === 'rent' && p.status === 'completed'
      );

      console.log(`\n   Lease ${lease.id.substring(0, 8)}...:`);
      console.log('   - Security Deposit:', securityPaid ? '✅ Paid' : '❌ Pending');
      console.log('   - First Month Rent:', rentPaid ? '✅ Paid' : '❌ Pending');
      console.log('   - Can Activate?:', (securityPaid && rentPaid) ? '✅ YES' : '❌ NO');
      console.log('   - Lease Status:', lease.lease_status);
    }
  }

  // 5. Diagnosis
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
        
        const { data: leasePayments } = await supabase
          .from('rent_payments')
          .select('*')
          .eq('lease_id', signedLease.id)
          .in('payment_type', ['security_deposit', 'rent']);

        const securityPaid = leasePayments?.some(p => 
          p.payment_type === 'security_deposit' && p.status === 'completed'
        );
        const rentPaid = leasePayments?.some(p => 
          p.payment_type === 'rent' && p.status === 'completed'
        );

        if (!securityPaid || !rentPaid) {
          console.log('   ❌ Reason: Payments not completed');
          if (!securityPaid) console.log('      - Security deposit pending');
          if (!rentPaid) console.log('      - First month rent pending');
        } else {
          console.log('   ✅ All payments completed');
          if (signedLease.lease_status !== 'active') {
            console.log('   ❌ Reason: Lease not activated (status:', signedLease.lease_status + ')');
            console.log('   💡 FIX: Run lease activation endpoint');
          } else {
            console.log('   ❌ Reason: Unknown - lease is active but role not updated');
            console.log('   💡 FIX: Manually update user role');
          }
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
}

checkUserStatus().catch(console.error);
