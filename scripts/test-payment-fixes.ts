/**
 * Test Payment and Micropayment Fixes
 * Verifies all payment-related functionality and validations
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  error?: any;
}

const results: TestResult[] = [];

function addResult(test: string, passed: boolean, message: string, error?: any) {
  results.push({ test, passed, message, error });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}: ${message}`);
  if (error) {
    console.log(`   Error: ${error.message || error}`);
  }
}

async function testPaymentCreationValidation() {
  console.log('\n🧪 Testing Payment Creation Validation...\n');

  // Test 1: Missing required fields
  try {
    await axios.post(`${API_URL}/api/payments`, {
      amount_usdc: 1500
    });
    addResult('Payment - Missing Fields', false, 'Should reject missing required fields');
  } catch (error: any) {
    const expected = error.response?.status === 400;
    addResult('Payment - Missing Fields', expected, 
      expected ? 'Correctly rejects missing fields' : 'Wrong error status',
      error.response?.data);
  }

  // Test 2: Invalid amount (zero)
  try {
    await axios.post(`${API_URL}/api/payments`, {
      lease_id: 'test-lease-id',
      tenant_id: 'test-tenant-id',
      amount_usdc: 0,
      due_date: '2025-11-01'
    });
    addResult('Payment - Zero Amount', false, 'Should reject zero amount');
  } catch (error: any) {
    const expected = error.response?.status === 400;
    addResult('Payment - Zero Amount', expected,
      expected ? 'Correctly rejects zero amount' : 'Wrong error status',
      error.response?.data);
  }

  // Test 3: Invalid amount (negative)
  try {
    await axios.post(`${API_URL}/api/payments`, {
      lease_id: 'test-lease-id',
      tenant_id: 'test-tenant-id',
      amount_usdc: -100,
      due_date: '2025-11-01'
    });
    addResult('Payment - Negative Amount', false, 'Should reject negative amount');
  } catch (error: any) {
    const expected = error.response?.status === 400;
    addResult('Payment - Negative Amount', expected,
      expected ? 'Correctly rejects negative amount' : 'Wrong error status',
      error.response?.data);
  }

  // Test 4: Invalid amount (string)
  try {
    await axios.post(`${API_URL}/api/payments`, {
      lease_id: 'test-lease-id',
      tenant_id: 'test-tenant-id',
      amount_usdc: 'not-a-number',
      due_date: '2025-11-01'
    });
    addResult('Payment - Invalid Amount Type', false, 'Should reject non-numeric amount');
  } catch (error: any) {
    const expected = error.response?.status === 400;
    addResult('Payment - Invalid Amount Type', expected,
      expected ? 'Correctly rejects invalid amount type' : 'Wrong error status',
      error.response?.data);
  }

  // Test 5: Invalid due date
  try {
    await axios.post(`${API_URL}/api/payments`, {
      lease_id: 'test-lease-id',
      tenant_id: 'test-tenant-id',
      amount_usdc: 1500,
      due_date: 'invalid-date'
    });
    addResult('Payment - Invalid Date', false, 'Should reject invalid date format');
  } catch (error: any) {
    const expected = error.response?.status === 400;
    addResult('Payment - Invalid Date', expected,
      expected ? 'Correctly rejects invalid date' : 'Wrong error status',
      error.response?.data);
  }
}

async function testMicropaymentValidation() {
  console.log('\n🧪 Testing Micropayment Validation...\n');

  // Test 1: Missing required fields
  try {
    await axios.post(`${API_URL}/api/micropayments`, {
      amountUsdc: 5
    });
    addResult('Micropayment - Missing Fields', false, 'Should reject missing fields');
  } catch (error: any) {
    const expected = error.response?.status === 400;
    addResult('Micropayment - Missing Fields', expected,
      expected ? 'Correctly rejects missing fields' : 'Wrong error status',
      error.response?.data);
  }

  // Test 2: Amount too high (over $10)
  try {
    await axios.post(`${API_URL}/api/micropayments`, {
      fromUserId: 'test-from-id',
      toUserId: 'test-to-id',
      amountUsdc: 15,
      purpose: 'Test payment'
    });
    addResult('Micropayment - Amount Too High', false, 'Should reject amount over $10');
  } catch (error: any) {
    const expected = error.response?.status === 400 && 
                     error.response?.data?.error?.includes('$10');
    addResult('Micropayment - Amount Too High', expected,
      expected ? 'Correctly rejects amount over $10' : 'Wrong validation',
      error.response?.data);
  }

  // Test 3: Zero amount
  try {
    await axios.post(`${API_URL}/api/micropayments`, {
      fromUserId: 'test-from-id',
      toUserId: 'test-to-id',
      amountUsdc: 0,
      purpose: 'Test payment'
    });
    addResult('Micropayment - Zero Amount', false, 'Should reject zero amount');
  } catch (error: any) {
    const expected = error.response?.status === 400;
    addResult('Micropayment - Zero Amount', expected,
      expected ? 'Correctly rejects zero amount' : 'Wrong error status',
      error.response?.data);
  }

  // Test 4: Negative amount
  try {
    await axios.post(`${API_URL}/api/micropayments`, {
      fromUserId: 'test-from-id',
      toUserId: 'test-to-id',
      amountUsdc: -5,
      purpose: 'Test payment'
    });
    addResult('Micropayment - Negative Amount', false, 'Should reject negative amount');
  } catch (error: any) {
    const expected = error.response?.status === 400;
    addResult('Micropayment - Negative Amount', expected,
      expected ? 'Correctly rejects negative amount' : 'Wrong error status',
      error.response?.data);
  }

  // Test 5: Empty purpose
  try {
    await axios.post(`${API_URL}/api/micropayments`, {
      fromUserId: 'test-from-id',
      toUserId: 'test-to-id',
      amountUsdc: 5,
      purpose: '   '
    });
    addResult('Micropayment - Empty Purpose', false, 'Should reject empty purpose');
  } catch (error: any) {
    const expected = error.response?.status === 400;
    addResult('Micropayment - Empty Purpose', expected,
      expected ? 'Correctly rejects empty purpose' : 'Wrong error status',
      error.response?.data);
  }

  // Test 6: Invalid amount format
  try {
    await axios.post(`${API_URL}/api/micropayments`, {
      fromUserId: 'test-from-id',
      toUserId: 'test-to-id',
      amountUsdc: 'five-dollars',
      purpose: 'Test payment'
    });
    addResult('Micropayment - Invalid Amount Format', false, 'Should reject non-numeric amount');
  } catch (error: any) {
    const expected = error.response?.status === 400;
    addResult('Micropayment - Invalid Amount Format', expected,
      expected ? 'Correctly rejects invalid format' : 'Wrong error status',
      error.response?.data);
  }

  // Test 7: Valid micropayment amount (edge case - $0.01)
  try {
    await axios.post(`${API_URL}/api/micropayments`, {
      fromUserId: 'test-from-id',
      toUserId: 'test-to-id',
      amountUsdc: 0.01,
      purpose: 'Minimum payment test'
    });
    addResult('Micropayment - Minimum Valid Amount', false, 'User not found expected (validation passed)');
  } catch (error: any) {
    const expected = error.response?.status === 404; // User not found is OK - validation passed
    addResult('Micropayment - Minimum Valid Amount', expected,
      expected ? 'Amount validation passed (user not found expected)' : 'Wrong validation',
      error.response?.data);
  }

  // Test 8: Valid micropayment amount (edge case - $10)
  try {
    await axios.post(`${API_URL}/api/micropayments`, {
      fromUserId: 'test-from-id',
      toUserId: 'test-to-id',
      amountUsdc: 10,
      purpose: 'Maximum payment test'
    });
    addResult('Micropayment - Maximum Valid Amount', false, 'User not found expected (validation passed)');
  } catch (error: any) {
    const expected = error.response?.status === 404; // User not found is OK - validation passed
    addResult('Micropayment - Maximum Valid Amount', expected,
      expected ? 'Amount validation passed (user not found expected)' : 'Wrong validation',
      error.response?.data);
  }
}

async function testPaymentAnalytics() {
  console.log('\n🧪 Testing Payment Analytics...\n');

  try {
    const response = await axios.get(`${API_URL}/api/payments/analytics`);
    const hasRequiredFields = response.data.success &&
                              response.data.data.total !== undefined &&
                              response.data.data.byStatus &&
                              response.data.data.revenue &&
                              response.data.data.metrics;
    addResult('Payment Analytics', hasRequiredFields,
      hasRequiredFields ? 'Analytics endpoint working correctly' : 'Missing required fields',
      response.data);
  } catch (error: any) {
    addResult('Payment Analytics', false, 'Failed to fetch analytics', error);
  }
}

async function testPaymentSchedulerEndpoints() {
  console.log('\n🧪 Testing Payment Scheduler Endpoints...\n');

  // Test 1: Generate monthly payments
  try {
    const response = await axios.post(`${API_URL}/api/payments/generate-monthly`);
    const valid = response.data.success && 
                  response.data.data.created !== undefined &&
                  response.data.data.errors !== undefined;
    addResult('Generate Monthly Payments', valid,
      valid ? `Generated ${response.data.data.created} payments` : 'Invalid response',
      response.data);
  } catch (error: any) {
    addResult('Generate Monthly Payments', false, 'Failed to generate payments', error);
  }

  // Test 2: Mark overdue payments
  try {
    const response = await axios.post(`${API_URL}/api/payments/mark-overdue`);
    const valid = response.data.success && response.data.data.updated !== undefined;
    addResult('Mark Overdue Payments', valid,
      valid ? `Marked ${response.data.data.updated} payments as late` : 'Invalid response',
      response.data);
  } catch (error: any) {
    addResult('Mark Overdue Payments', false, 'Failed to mark overdue', error);
  }

  // Test 3: Get upcoming payments
  try {
    const response = await axios.get(`${API_URL}/api/payments/upcoming?days=7`);
    const valid = response.data.success && Array.isArray(response.data.data);
    addResult('Get Upcoming Payments', valid,
      valid ? `Found ${response.data.data.length} upcoming payments` : 'Invalid response',
      response.data);
  } catch (error: any) {
    addResult('Get Upcoming Payments', false, 'Failed to fetch upcoming payments', error);
  }

  // Test 4: Send reminders
  try {
    const response = await axios.post(`${API_URL}/api/payments/send-reminders`);
    const valid = response.data.success && 
                  response.data.data.sent !== undefined;
    addResult('Send Payment Reminders', valid,
      valid ? `Sent ${response.data.data.sent} reminders` : 'Invalid response',
      response.data);
  } catch (error: any) {
    addResult('Send Payment Reminders', false, 'Failed to send reminders', error);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Payment & Micropayment Test Suite');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_URL}`);
  console.log('='.repeat(60));

  await testPaymentCreationValidation();
  await testMicropaymentValidation();
  await testPaymentAnalytics();
  await testPaymentSchedulerEndpoints();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(2)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.test}: ${r.message}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
