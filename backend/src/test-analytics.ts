import axios from 'axios';

/**
 * Test script to verify analytics dashboard endpoints
 */
async function testAnalytics() {
  console.log('🧪 Testing Analytics Dashboard...\n');

  const baseURL = 'http://localhost:3001';
  
  try {
    // Test property management analytics
    console.log('📊 Testing property management analytics...');
    const propResponse = await axios.get(`${baseURL}/api/analytics/property-management`);
    console.log('✅ Property management analytics:', propResponse.data.data);
    
    // Test payment analytics
    console.log('\n💰 Testing payment analytics...');
    const paymentResponse = await axios.get(`${baseURL}/api/analytics/payments`);
    console.log('✅ Payment analytics:', paymentResponse.data.data.summary);
    
    // Test tenant analytics
    console.log('\n👥 Testing tenant analytics...');
    const tenantResponse = await axios.get(`${baseURL}/api/analytics/tenants`);
    console.log('✅ Tenant analytics:', {
      userDistribution: tenantResponse.data.data.userDistribution,
      totalTenants: Object.keys(tenantResponse.data.data.tenantStats).length
    });
    
    // Test AI decision analytics
    console.log('\n🤖 Testing AI decision analytics...');
    const aiResponse = await axios.get(`${baseURL}/api/analytics/ai-decisions`);
    console.log('✅ AI decision analytics:', aiResponse.data.data);
    
    console.log('\n🎉 Analytics dashboard tests completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run tests
testAnalytics()
  .then(() => process.exit(0))
  .catch((error: any) => {
    console.error(error);
    process.exit(1);
  });
