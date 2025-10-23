import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function debugTenantDashboard() {
  console.log('🔍 Debugging Tenant Dashboard for John Doe\n');

  try {
    // Get John Doe's database user
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'john.doe@email.com')
      .single();

    if (dbError || !dbUser) {
      console.error('❌ Could not find John Doe in database');
      return;
    }

    console.log('✅ Database User:');
    console.log('   ID:', dbUser.id);
    console.log('   Email:', dbUser.email);
    console.log('   Role:', dbUser.role);
    console.log('   User Type:', dbUser.user_type);

    // Get John Doe's auth user
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authData.users.find(u => u.email === 'john.doe@email.com');

    console.log('\n✅ Auth User:');
    console.log('   ID:', authUser?.id);
    console.log('   Email:', authUser?.email);

    console.log('\n🔍 ID Comparison:');
    if (dbUser.id === authUser?.id) {
      console.log('   ✅ IDs MATCH');
    } else {
      console.log('   ❌ IDs DO NOT MATCH');
      console.log('   DB ID:   ', dbUser.id);
      console.log('   Auth ID: ', authUser?.id);
    }

    // Check leases using DB ID
    console.log('\n🔍 Checking leases with DB ID:', dbUser.id);
    const { data: leasesByDbId, error: leaseDbError } = await supabaseAdmin
      .from('leases')
      .select(`
        *,
        property:properties(*)
      `)
      .eq('tenant_id', dbUser.id);

    if (leaseDbError) {
      console.error('   ❌ Error:', leaseDbError.message);
    } else if (!leasesByDbId || leasesByDbId.length === 0) {
      console.log('   ❌ No leases found with DB ID');
    } else {
      console.log('   ✅ Found', leasesByDbId.length, 'lease(s)');
      leasesByDbId.forEach(lease => {
        console.log('      - Lease ID:', lease.id);
        console.log('        Property:', (lease.property as any)?.title);
        console.log('        Status:', lease.status);
        console.log('        Tenant ID:', lease.tenant_id);
      });
    }

    // Check leases using Auth ID (what the app is using)
    if (authUser?.id && authUser.id !== dbUser.id) {
      console.log('\n🔍 Checking leases with Auth ID:', authUser.id);
      const { data: leasesByAuthId, error: leaseAuthError } = await supabaseAdmin
        .from('leases')
        .select(`
          *,
          property:properties(*)
        `)
        .eq('tenant_id', authUser.id);

      if (leaseAuthError) {
        console.error('   ❌ Error:', leaseAuthError.message);
      } else if (!leasesByAuthId || leasesByAuthId.length === 0) {
        console.log('   ❌ No leases found with Auth ID');
        console.log('   ⚠️  This is the problem! The app uses Auth ID but leases use DB ID');
      } else {
        console.log('   ✅ Found', leasesByAuthId.length, 'lease(s)');
      }
    }

    // Test the tenant dashboard endpoint
    console.log('\n🔍 Testing API endpoint...');
    console.log('   API call: GET /api/tenant/' + authUser?.id + '/dashboard');
    
    const response = await fetch(`http://localhost:3001/api/tenant/${authUser?.id}/dashboard`);
    const result = await response.json() as any;

    console.log('\n📊 API Response:');
    console.log('   Success:', result.success);
    if (result.success) {
      console.log('   Lease found:', !!result.data.lease);
      if (result.data.lease) {
        console.log('   Property:', result.data.lease.property?.title);
      } else {
        console.log('   ❌ No lease in response');
      }
    } else {
      console.log('   Error:', result.error);
    }

    // Provide fix
    console.log('\n💡 Solution:');
    if (dbUser.id !== authUser?.id) {
      console.log('   The backend /api/tenant/:tenantId/dashboard endpoint');
      console.log('   is receiving the Auth ID but leases use DB ID.');
      console.log('');
      console.log('   Fix: Update the backend to lookup user by email first,');
      console.log('   then use the DB ID to fetch leases.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║       Tenant Dashboard Debug Tool                         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

debugTenantDashboard()
  .then(() => {
    console.log('\n✅ Debug complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
  });
