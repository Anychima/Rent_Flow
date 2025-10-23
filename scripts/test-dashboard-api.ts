import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_URL = 'http://localhost:3001';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDashboardAPI() {
  console.log('🧪 Testing Dashboard API\n');
  console.log('='.repeat(60));

  try {
    // 1. Get John Doe's database ID
    console.log('\n1️⃣ Getting John Doe from database...');
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'john.doe@email.com')
      .single();

    if (dbError || !dbUser) {
      console.error('❌ Failed to find user in database:', dbError?.message);
      return;
    }

    console.log('✅ Database User:');
    console.log(`   ID: ${dbUser.id}`);
    console.log(`   Email: ${dbUser.email}`);
    console.log(`   Role: ${dbUser.role}`);

    // 2. Get Auth user
    console.log('\n2️⃣ Getting John Doe from Auth...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    const johnAuthUser = authUsers?.users.find(u => u.email === 'john.doe@email.com');
    
    if (johnAuthUser) {
      console.log('✅ Auth User:');
      console.log(`   ID: ${johnAuthUser.id}`);
      console.log(`   Email: ${johnAuthUser.email}`);
      console.log('\n⚠️  ID Mismatch:', dbUser.id !== johnAuthUser.id);
    }

    // 3. Test dashboard API with DB ID
    console.log('\n3️⃣ Testing dashboard API with DB ID...');
    const dbResponse = await axios.get(`${API_URL}/api/tenant/${dbUser.id}/dashboard`);
    const dbResult: any = dbResponse.data;

    console.log('📊 Dashboard Response (DB ID):');
    console.log(`   Success: ${dbResult.success}`);
    if (dbResult.success) {
      console.log(`   Tenant: ${dbResult.data.tenant?.email}`);
      console.log(`   Lease: ${dbResult.data.lease ? 'Active' : 'None'}`);
      console.log(`   Maintenance Requests: ${dbResult.data.maintenanceRequests?.length || 0}`);
      console.log(`   Payments: ${dbResult.data.payments?.length || 0}`);
      
      if (dbResult.data.payments?.length > 0) {
        console.log('\n💳 Payments Found:');
        dbResult.data.payments.forEach((p: any, i: number) => {
          console.log(`   ${i + 1}. ${p.amount_usdc} USDC - ${p.payment_type || 'N/A'} (${p.status})`);
          console.log(`      Due: ${new Date(p.due_date).toLocaleDateString()}`);
        });
      }
    } else {
      console.log(`   Error: ${dbResult.error}`);
    }

    // 4. Test with Auth ID if different
    if (johnAuthUser && dbUser.id !== johnAuthUser.id) {
      console.log('\n4️⃣ Testing dashboard API with Auth ID...');
      const authResponse = await axios.get(`${API_URL}/api/tenant/${johnAuthUser.id}/dashboard`);
      const authResult: any = authResponse.data;

      console.log('📊 Dashboard Response (Auth ID):');
      console.log(`   Success: ${authResult.success}`);
      if (!authResult.success) {
        console.log(`   Error: ${authResult.error}`);
        console.log('\n⚠️  This is why the frontend shows no data!');
        console.log('   The frontend uses Auth ID, but data is stored with DB ID');
      }
    }

    // 5. Check what ID the frontend would use
    console.log('\n5️⃣ Frontend would use:');
    console.log(`   Auth ID: ${johnAuthUser?.id || 'N/A'}`);
    console.log(`   DB ID (from email lookup): ${dbUser.id}`);
    console.log('\n✅ Frontend should be using email lookup fallback in AuthContext');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

testDashboardAPI()
  .then(() => {
    console.log('\n✅ API test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
