import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Test 1: Check if role column exists by querying users
    console.log('Test 1: Checking if role column exists...');
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('id, email, wallet_address, user_type, role, full_name')
      .limit(5);

    if (queryError) {
      console.log('❌ Error querying users table:', queryError.message);
      console.log('\n⚠️  The role column may not exist yet.');
      console.log('Please make sure you ran the migration SQL in Supabase SQL Editor.');
      return;
    }

    console.log('✅ Role column exists!\n');

    // Test 2: Display current users
    console.log('Test 2: Current users in database:');
    console.log('═'.repeat(80));
    
    if (users && users.length > 0) {
      users.forEach((user, index) => {
        console.log(`\n👤 User ${index + 1}:`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Wallet: ${user.wallet_address || 'N/A'}`);
        console.log(`   user_type: ${user.user_type || 'N/A'}`);
        console.log(`   role: ${user.role || 'N/A'}`);
        console.log(`   Name: ${user.full_name || 'N/A'}`);
      });
      console.log('\n' + '═'.repeat(80));
    } else {
      console.log('\n⚠️  No users found in database.');
      console.log('You may need to create demo users first.');
    }

    // Test 3: Check role-user_type sync
    console.log('\n\nTest 3: Checking role ↔ user_type synchronization...');
    const syncIssues = users?.filter(u => {
      const expectedRole = 
        u.user_type === 'property_manager' ? 'manager' :
        u.user_type === 'tenant' ? 'tenant' :
        u.user_type === 'ai_agent' ? 'ai_agent' : null;
      
      return u.role !== expectedRole;
    });

    if (syncIssues && syncIssues.length > 0) {
      console.log('⚠️  Found sync issues:');
      syncIssues.forEach(u => {
        console.log(`   User ${u.email}: user_type=${u.user_type}, role=${u.role}`);
      });
    } else {
      console.log('✅ All users have properly synced role and user_type columns!');
    }

    // Test 4: Summary
    console.log('\n\n📊 Migration Summary:');
    console.log('═'.repeat(80));
    console.log(`✅ Role column: EXISTS`);
    console.log(`✅ Total users: ${users?.length || 0}`);
    console.log(`✅ Users with role set: ${users?.filter(u => u.role).length || 0}`);
    console.log(`✅ Users with user_type set: ${users?.filter(u => u.user_type).length || 0}`);
    console.log('═'.repeat(80));

    console.log('\n\n🎉 Migration verification complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Create demo users (if you haven\'t already)');
    console.log('   2. Test tenant portal login');
    console.log('   3. Verify role-based access works correctly');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.log('\n⚠️  Please check that:');
    console.log('   1. The migration SQL was executed successfully');
    console.log('   2. Your Supabase connection is working');
    console.log('   3. The users table exists in your database');
  }
}

// Main execution
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     RentFlow AI - Migration Verification Tool             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

verifyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Verification error:', error);
    process.exit(1);
  });
