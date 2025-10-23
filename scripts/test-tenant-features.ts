import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTenantFeatures() {
  console.log('🧪 Testing Tenant Portal Features\n');
  console.log('='.repeat(60));

  try {
    // 1. Find John Doe tenant
    console.log('\n1️⃣ Finding John Doe tenant...');
    const { data: tenant, error: tenantError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'john.doe@email.com')
      .eq('role', 'tenant')
      .single();

    if (tenantError || !tenant) {
      console.error('❌ Tenant not found:', tenantError?.message);
      return;
    }

    console.log('✅ Tenant found:');
    console.log(`   ID: ${tenant.id}`);
    console.log(`   Name: ${tenant.full_name}`);
    console.log(`   Email: ${tenant.email}`);

    // 2. Check active lease
    console.log('\n2️⃣ Checking active lease...');
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*)
      `)
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .single();

    if (leaseError && leaseError.code !== 'PGRST116') {
      console.error('❌ Lease error:', leaseError.message);
    }

    if (lease) {
      console.log('✅ Active lease found:');
      console.log(`   Lease ID: ${lease.id}`);
      console.log(`   Property: ${(lease.property as any)?.title}`);
      console.log(`   Rent: ${lease.monthly_rent_usdc} USDC`);
      console.log(`   Status: ${lease.status}`);
    } else {
      console.log('⚠️  No active lease found');
    }

    // 3. Test maintenance request creation
    console.log('\n3️⃣ Testing maintenance request creation...');
    
    if (!lease) {
      console.log('⚠️  Skipping - No active lease');
    } else {
      const testMaintenance = {
        title: 'Test - Kitchen faucet leaking',
        description: 'The kitchen faucet has been dripping continuously for the past 2 days. Water is wasting.',
        category: 'plumbing',
        priority: 'medium',
        requested_by: tenant.id,  // Use requested_by (schema column)
        property_id: lease.property_id,
        status: 'pending',
        estimated_cost_usdc: 0
      };

      const { data: maintenanceRequest, error: maintenanceError } = await supabase
        .from('maintenance_requests')
        .insert([testMaintenance])
        .select()
        .single();

      if (maintenanceError) {
        console.error('❌ Failed to create maintenance request:', maintenanceError.message);
      } else {
        console.log('✅ Maintenance request created:');
        console.log(`   ID: ${maintenanceRequest.id}`);
        console.log(`   Title: ${maintenanceRequest.title}`);
        console.log(`   Status: ${maintenanceRequest.status}`);
        console.log(`   Priority: ${maintenanceRequest.priority}`);
      }
    }

    // 4. Check existing maintenance requests
    console.log('\n4️⃣ Checking existing maintenance requests...');
    const { data: maintenanceRequests, error: maintenanceListError } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('requested_by', tenant.id)  // Use requested_by (schema column)
      .order('created_at', { ascending: false })
      .limit(5);

    if (maintenanceListError) {
      console.error('❌ Error fetching maintenance requests:', maintenanceListError.message);
    } else {
      console.log(`✅ Found ${maintenanceRequests?.length || 0} maintenance request(s):`);
      maintenanceRequests?.forEach((req, index) => {
        console.log(`   ${index + 1}. ${req.title} (${req.status}) - ${req.priority} priority`);
      });
    }

    // 5. Check payments
    console.log('\n5️⃣ Checking payments...');
    if (!lease) {
      console.log('⚠️  Skipping - No active lease');
    } else {
      const { data: payments, error: paymentsError } = await supabase
        .from('rent_payments')  // Use rent_payments (schema table)
        .select('*')
        .eq('lease_id', lease.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (paymentsError) {
        console.error('❌ Error fetching payments:', paymentsError.message);
      } else {
        console.log(`✅ Found ${payments?.length || 0} payment(s):`);
        payments?.forEach((payment, index) => {
          console.log(`   ${index + 1}. ${payment.amount_usdc} USDC - ${payment.payment_type} (${payment.status})`);
          console.log(`      Due: ${new Date(payment.due_date).toLocaleDateString()}`);
        });
      }
    }

    // 6. Test full dashboard endpoint simulation
    console.log('\n6️⃣ Simulating dashboard data fetch...');
    const dashboardData = {
      tenant,
      lease: lease || null,
      maintenanceRequests: maintenanceRequests || [],
      payments: lease ? (await supabase
        .from('rent_payments')  // Use rent_payments (schema table)
        .select('*')
        .eq('lease_id', lease.id)
        .order('created_at', { ascending: false })
        .limit(10)).data || [] : []
    };

    console.log('\n📊 Dashboard Data Summary:');
    console.log(`   Tenant: ${dashboardData.tenant.full_name}`);
    console.log(`   Lease: ${dashboardData.lease ? 'Active' : 'None'}`);
    console.log(`   Maintenance Requests: ${dashboardData.maintenanceRequests.length}`);
    console.log(`   Payments: ${dashboardData.payments.length}`);
    console.log(`   Pending Payments: ${dashboardData.payments.filter(p => p.status === 'pending').length}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tenant feature tests completed!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    throw error;
  }
}

// Run tests
testTenantFeatures()
  .then(() => {
    console.log('\n✨ Test script finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test script failed:', error);
    process.exit(1);
  });
