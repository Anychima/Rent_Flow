/**
 * Setup Demo User Account
 * Creates the manager@rentflow.ai account with default password
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const DEMO_EMAIL = 'manager@rentflow.ai';
const DEMO_PASSWORD = 'RentFlow2024!';
const DEMO_USER_ID = 'a0000000-0000-0000-0000-000000000001';

async function setupDemoUser() {
  console.log('🔐 Setting up demo user account...\n');

  // Use service role key for admin operations
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!
  );

  try {
    // Check if user already exists in auth.users
    console.log('📝 Checking for existing user...');
    
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error checking users:', listError);
      throw listError;
    }

    const existingUser = existingUsers.users.find(u => u.email === DEMO_EMAIL);

    if (existingUser) {
      console.log('✅ Demo user already exists!');
      console.log(`   Email: ${DEMO_EMAIL}`);
      console.log(`   User ID: ${existingUser.id}`);
      console.log('\n💡 To reset password, use Supabase dashboard or update this script.');
      
      // Update password anyway
      console.log('\n🔄 Updating password...');
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: DEMO_PASSWORD }
      );

      if (updateError) {
        console.error('❌ Error updating password:', updateError);
      } else {
        console.log('✅ Password updated successfully!');
      }
      
      return;
    }

    console.log('📝 Creating new demo user...');

    // Create user with specific ID
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo Manager',
        role: 'manager'
      }
    });

    if (createError) {
      console.error('❌ Error creating user:', createError);
      throw createError;
    }

    console.log('✅ Demo user created successfully!');
    console.log(`   Email: ${DEMO_EMAIL}`);
    console.log(`   Password: ${DEMO_PASSWORD}`);
    console.log(`   User ID: ${newUser.user.id}`);

    // Insert into users table
    console.log('\n📝 Adding user to database...');
    
    const { error: dbError } = await supabase
      .from('users')
      .upsert([{
        id: newUser.user.id,
        email: DEMO_EMAIL,
        full_name: 'Demo Manager',
        role: 'manager',
        wallet_address: process.env.DEPLOYER_ADDRESS || '8kr6b3uuYx4MgvY8BW9ETogd3cc5ibTj3g8oVZCkKyiz',
        is_active: true
      }]);

    if (dbError) {
      console.error('❌ Error adding to database:', dbError);
    } else {
      console.log('✅ User added to database!');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✨ Demo Account Setup Complete!');
    console.log('='.repeat(50));
    console.log('\n🔐 Demo Credentials:');
    console.log(`   Email: ${DEMO_EMAIL}`);
    console.log(`   Password: ${DEMO_PASSWORD}`);
    console.log('\n📝 You can now login at: http://localhost:3000');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error setting up demo user:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure SUPABASE_SERVICE_ROLE_KEY is in your .env file');
    console.log('   2. Check that your Supabase project is properly configured');
    console.log('   3. Verify network connection to Supabase');
    process.exit(1);
  }
}

setupDemoUser();
