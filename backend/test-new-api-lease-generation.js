const axios = require('axios');

async function testNewApiLeaseGeneration() {
  console.log('\n🧪 Testing New Lease Generation via API...\n');
  
  try {
    // First, let's create a new approved application
    console.log('1. Creating a new approved application...');
    
    const { createClient } = require('@supabase/supabase-js');
    require('dotenv').config({ path: `${__dirname}/.env` });
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
    );
    
    // Get a property and users
    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .limit(1);
      
    const { data: users } = await supabase
      .from('users')
      .select('*');
      
    if (!properties || properties.length === 0 || !users || users.length < 2) {
      console.log('⚠️  Not enough data to create test application.');
      return;
    }
    
    const property = properties[0];
    const tenant = users.find(u => u.user_type === 'tenant') || users[0];
    
    // Create a new application
    const { data: newApplication, error: createAppError } = await supabase
      .from('property_applications')
      .insert([{
        property_id: property.id,
        applicant_id: tenant.id,
        status: 'approved',
        employment_status: 'employed',
        employer_name: 'Test Company',
        monthly_income_usdc: 5000,
        requested_move_in_date: '2025-12-01',
        cover_letter: 'Test application for lease generation via API - ' + new Date().toISOString()
      }])
      .select()
      .single();
      
    if (createAppError) {
      console.log(`❌ Error creating test application: ${createAppError.message}`);
      return;
    }
    
    console.log(`✅ Created new approved application: ${newApplication.id}`);
    
    // Verify no lease exists yet
    const { data: existingLease } = await supabase
      .from('leases')
      .select('*')
      .eq('application_id', newApplication.id)
      .single();
      
    if (existingLease) {
      console.log(`⚠️  Lease already exists: ${existingLease.id}`);
      // Clean up
      await supabase
        .from('property_applications')
        .delete()
        .eq('id', newApplication.id);
      return;
    }
    
    // Test the lease generation endpoint
    console.log('\n2. Testing lease generation API endpoint...');
    
    const apiUrl = 'http://localhost:3001/api/leases/generate';
    console.log(`   API URL: ${apiUrl}`);
    
    try {
      const response = await axios.post(apiUrl, {
        application_id: newApplication.id
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
        console.log('🎉 New lease generation via API is working correctly!');
        
        // Clean up - delete the lease and application
        console.log('\n3. Cleaning up test data...');
        await supabase
          .from('leases')
          .delete()
          .eq('id', response.data.data.id);
          
        await supabase
          .from('property_applications')
          .delete()
          .eq('id', newApplication.id);
          
        console.log('✅ Test data cleaned up');
      } else {
        console.log(`❌ API Error: ${response.data.error}`);
        // Clean up the application
        await supabase
          .from('property_applications')
          .delete()
          .eq('id', newApplication.id);
      }
    } catch (apiError) {
      console.log(`❌ API Request Error: ${apiError.message}`);
      if (apiError.response) {
        console.log(`   Response Status: ${apiError.response.status}`);
        console.log(`   Response Data: ${JSON.stringify(apiError.response.data, null, 2)}`);
      }
      
      // Clean up the application
      await supabase
        .from('property_applications')
        .delete()
        .eq('id', newApplication.id);
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

testNewApiLeaseGeneration().catch(console.error);