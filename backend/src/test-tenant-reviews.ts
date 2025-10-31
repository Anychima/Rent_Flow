import axios from 'axios';

/**
 * Test script to verify tenant reviews/ratings endpoints
 */
async function testTenantReviews() {
  console.log('🧪 Testing Tenant Reviews/Ratings System...\n');

  const baseURL = 'http://localhost:3001';
  
  try {
    // Test getting tenant reviews (should work even with no data)
    console.log('👥 Testing tenant reviews endpoint...');
    const reviewsResponse = await axios.get(`${baseURL}/api/tenant-reviews`);
    console.log('✅ Tenant reviews endpoint working');
    console.log(`   Found ${reviewsResponse.data.data.length} reviews\n`);
    
    // Test getting tenant review statistics (should work even with no data)
    console.log('📊 Testing tenant review statistics...');
    // Use a dummy tenant ID for testing
    const statsResponse = await axios.get(`${baseURL}/api/tenant-reviews/statistics/00000000-0000-0000-0000-000000000000`);
    console.log('✅ Tenant review statistics endpoint working');
    console.log(`   Average rating: ${statsResponse.data.data.averageRating}\n`);
    
    console.log('🎉 Tenant reviews system tests completed successfully!');
    console.log('Note: Creating actual reviews requires valid lease/tenant IDs from your database.');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run tests
testTenantReviews()
  .then(() => process.exit(0))
  .catch((error: any) => {
    console.error(error);
    process.exit(1);
  });
