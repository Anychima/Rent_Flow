import { createClient } from '@supabase/supabase-js';

// Simulate frontend environment
const SUPABASE_URL = 'https://saiceqyaootvkdenxbqx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaWNlcXlhb290dmtkZW54YnF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNjI4OTIsImV4cCI6MjA3NjYzODg5Mn0.0-tzD08uhq6CSHolgxwkv-fx9542p_xn6betmJn7yqI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testFrontendLogin() {
  console.log('🧪 Testing Frontend Login Simulation\n');
  console.log('Using credentials:');
  console.log('  Email: manager@rentflow.ai');
  console.log('  Password: RentFlow2024!');
  console.log('  Supabase URL:', SUPABASE_URL);
  console.log('  Using anon key:', SUPABASE_KEY.substring(0, 50) + '...\n');

  try {
    console.log('🔄 Attempting login...\n');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'manager@rentflow.ai',
      password: 'RentFlow2024!'
    });

    if (error) {
      console.log('❌ Login failed!');
      console.log('   Error:', error.message);
      console.log('   Status:', error.status);
      console.log('   Name:', error.name);
      console.log('\n📋 Full error object:');
      console.log(JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Login successful!');
      console.log('   User ID:', data.user?.id);
      console.log('   Email:', data.user?.email);
      console.log('   Session:', data.session ? 'Active' : 'None');
      console.log('   Access Token:', data.session?.access_token ? 'Generated' : 'None');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }

  // Test 2: Try with wrong password
  console.log('\n\n🧪 Test 2: Wrong Password\n');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'manager@rentflow.ai',
      password: 'WrongPassword123'
    });

    if (error) {
      console.log('✅ Correctly rejected wrong password');
      console.log('   Error:', error.message);
    } else {
      console.log('❌ Should have failed with wrong password!');
    }
  } catch (err) {
    console.error('Error:', err);
  }

  // Test 3: Check if user exists in database
  console.log('\n\n🧪 Test 3: Check Database User\n');

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, user_type, role, is_active')
      .eq('email', 'manager@rentflow.ai');

    if (error) {
      console.log('❌ Error querying database:', error.message);
    } else if (!users || users.length === 0) {
      console.log('❌ No user found in database');
    } else {
      console.log('✅ User found in database:');
      console.log(JSON.stringify(users[0], null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║       Frontend Login Simulation Test                      ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

testFrontendLogin()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
