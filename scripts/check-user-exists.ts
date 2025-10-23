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

async function checkUserExists() {
  console.log('🔍 Checking if john.doe@email.com exists...\n');
  console.log('='.repeat(60));

  try {
    // Check in Auth
    console.log('\n1️⃣ Checking Supabase Auth...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Failed to list auth users:', authError.message);
    } else {
      const johnAuth = authUsers.users.find(u => u.email === 'john.doe@email.com');
      if (johnAuth) {
        console.log('✅ Found in Auth:');
        console.log('   ID:', johnAuth.id);
        console.log('   Email:', johnAuth.email);
        console.log('   Created:', johnAuth.created_at);
      } else {
        console.log('❌ NOT found in Auth');
      }
    }

    // Check in Database
    console.log('\n2️⃣ Checking Database users table...');
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'john.doe@email.com')
      .single();

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        console.log('❌ NOT found in database');
        console.log('   Error: No rows returned');
      } else {
        console.error('❌ Database error:', dbError.message);
        console.error('   Code:', dbError.code);
      }
    } else {
      console.log('✅ Found in Database:');
      console.log('   ID:', dbUser.id);
      console.log('   Email:', dbUser.email);
      console.log('   Role:', dbUser.role);
      console.log('   Full Name:', dbUser.full_name);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Summary:');
    
    const authExists = authUsers?.users.some(u => u.email === 'john.doe@email.com');
    const dbExists = !dbError;

    if (authExists && dbExists) {
      console.log('✅ User exists in BOTH Auth and Database');
      console.log('   The profile fetch should work!');
    } else if (authExists && !dbExists) {
      console.log('⚠️  User exists in Auth but NOT in Database');
      console.log('   This is the problem! Login succeeds but profile fetch fails.');
      console.log('\n🔧 Solution: Run the seed script to create database users:');
      console.log('   npm run seed:db');
    } else if (!authExists && dbExists) {
      console.log('⚠️  User exists in Database but NOT in Auth');
      console.log('   Login will fail. Need to create auth user.');
    } else {
      console.log('❌ User does NOT exist in Auth OR Database');
      console.log('   Need to create the user completely.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

checkUserExists()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Check failed:', error);
    process.exit(1);
  });
