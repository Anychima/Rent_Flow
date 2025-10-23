#!/usr/bin/env ts-node
/**
 * Test script to verify payment creation and maintenance request fixes
 */

import axios from 'axios';

const API_URL = 'http://localhost:3001';

async function testPaymentCreation() {
  console.log('💳 Testing Payment Creation...');
  
  try {
    // Test data - in a real scenario, you'd use actual IDs from your database
    const paymentData = {
      lease_id: 'test-lease-id',
      tenant_id: 'test-tenant-id',
      amount_usdc: 1000,
      due_date: '2025-12-01',
      payment_type: 'rent',
      status: 'pending'
    };
    
    console.log('Sending payment data:', paymentData);
    
    const response = await axios.post(`${API_URL}/api/payments`, paymentData);
    console.log('✅ Payment creation response:', response.data);
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log('❌ Payment creation failed:', error.response?.data || error.message);
    } else {
      console.log('❌ Payment creation failed:', error);
    }
  }
}

async function testMaintenanceCreation() {
  console.log('\n🔧 Testing Maintenance Request Creation...');
  
  try {
    // Test data - in a real scenario, you'd use actual IDs from your database
    const maintenanceData = {
      property_id: 'test-property-id',
      requested_by: 'test-tenant-id', // Using requested_by instead of requestor_id
      title: 'Test Maintenance Request',
      description: 'This is a test maintenance request',
      category: 'plumbing',
      priority: 'medium'
    };
    
    console.log('Sending maintenance data:', maintenanceData);
    
    const response = await axios.post(`${API_URL}/api/maintenance`, maintenanceData);
    console.log('✅ Maintenance creation response:', response.data);
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log('❌ Maintenance creation failed:', error.response?.data || error.message);
    } else {
      console.log('❌ Maintenance creation failed:', error);
    }
  }
}

async function runTests() {
  console.log('🚀 Running RentFlow AI API Tests...\n');
  
  await testPaymentCreation();
  await testMaintenanceCreation();
  
  console.log('\n🏁 Tests completed!');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

export { testPaymentCreation, testMaintenanceCreation };