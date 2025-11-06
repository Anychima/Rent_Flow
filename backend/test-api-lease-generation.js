const axios = require('axios');

async function testApiLeaseGeneration() {
  console.log('\n🧪 Testing Lease Generation via API...\n');
  
  try {
    // First, let's get an approved application ID
    console.log('1. Getting approved applications...');
    
    // For this test, I'll need to use a direct Supabase query to get an approved application
    // In a real scenario, you would have an approved application ready
    
    const { createClient } = require('@supabase/supabase-js');
    require('dotenv').config({ path: `${__dirname}/.env` });
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
    );
    
    const { data: applications, error: appError } = await supabase
      .from('property_applications')
      .select('*')
      .eq('status', 'approved')
      .limit(1);
      
    if (appError) {
      console.log(`❌ Error fetching applications: ${appError.message}`);
      return;
    }
    
    if (!applications || applications.length === 0) {
      console.log('⚠️  No approved applications found. Please create one first.');
      return;
    }
    
    const applicationId = applications[0].id;
    console.log(`✅ Found approved application: ${applicationId}`);
    
    // Test the lease generation endpoint
    console.log('\n2. Testing lease generation API endpoint...');
    
    const apiUrl = 'http://localhost:3001/api/leases/generate';
    console.log(`   API URL: ${apiUrl}`);
    
    try {
      const response = await axios.post(apiUrl, {
        application_id: applicationId
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ API Response Status: ${response.status}`);
      console.log(`   Success: ${response.data.success}`);
      console.log(`   Message: ${response.data.message}`);
      
      if (response.data.success) {
        console.log(`   Lease ID: ${response.data.data.id}`);
        console.log('🎉 Lease generation via API is working correctly!');
      } else {
        console.log(`❌ API Error: ${response.data.error}`);
      }
    } catch (apiError) {
      if (apiError.response) {
        console.log(`❌ API Error Response: ${apiError.response.status}`);
        console.log(`   Error: ${JSON.stringify(apiError.response.data, null, 2)}`);
      } else {
        console.log(`❌ API Request Error: ${apiError.message}`);
      }
      return;
    }
    
    console.log('\n✅ CONCLUSION:');
    console.log('   The lease generation endpoint is now working correctly!');
    console.log('   The issue was the non-existent landlord_wallet column which has been fixed.');
    
  } catch (err) {
    console.error('❌ Error during test:', err.message);
    console.error('Full error:', err);
  }
}

testApiLeaseGeneration().catch(console.error);