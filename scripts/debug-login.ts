import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;

// Create admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create regular client (for testing login)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugLogin() {
  console.log('🔍 Debugging Login Issue for manager@rentflow.ai\n');

  try {
    // Step 1: Check if auth user exists
    console.log('Step 1: Checking Supabase Auth users...');
    const { data: authData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }

    const managerAuth = authData.users.find(u => u.email === 'manager@rentflow.ai');

    if (!managerAuth) {
      console.log('❌ No auth user found for manager@rentflow.ai');
      console.log('   Creating auth user now...\n');

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'manager@rentflow.ai',
        password: 'RentFlow2024!',
        email_confirm: true,
        user_metadata: {
          full_name: 'Sarah Johnson',
          role: 'manager'
        }
      });

      if (createError) {
        console.error('❌ Error creating user:', createError);
        return;
      }

      console.log('✅ Auth user created!');
      console.log('   User ID:', newUser.user?.id);
    } else {
      console.log('✅ Auth user exists');
      console.log('   User ID:', managerAuth.id);
      console.log('   Email:', managerAuth.email);
      console.log('   Email Confirmed:', managerAuth.email_confirmed_at ? 'Yes' : 'No');
      console.log('   Created:', managerAuth.created_at);
      console.log('   Last Sign In:', managerAuth.last_sign_in_at || 'Never');
    }

    // Step 2: Check database user record
    console.log('\n\nStep 2: Checking database users table...');
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'manager@rentflow.ai')
      .single();

    if (dbError) {
      console.log('❌ Error querying database:', dbError.message);
    } else if (!dbUser) {
      console.log('❌ No database record found');
    } else {
      console.log('✅ Database user exists');
      console.log('   ID:', dbUser.id);
      console.log('   Email:', dbUser.email);
      console.log('   user_type:', dbUser.user_type);
      console.log('   role:', dbUser.role);
      console.log('   is_active:', dbUser.is_active);
    }

    // Step 3: Test actual login
    console.log('\n\nStep 3: Testing login with password "RentFlow2024!"...');
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'manager@rentflow.ai',
      password: 'RentFlow2024!'
    });

    if (loginError) {
      console.log('❌ Login failed:', loginError.message);
      console.log('   Error code:', loginError.status);
      
      // Try to reset password
      console.log('\n🔄 Resetting password...');
      if (managerAuth) {
        const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
          managerAuth.id,
          { 
            password: 'RentFlow2024!',
            email_confirm: true
          }
        );

        if (resetError) {
          console.log('❌ Password reset failed:', resetError.message);
        } else {
          console.log('✅ Password reset successful!');
          console.log('\n🔄 Testing login again...');
          
          const { data: retryLogin, error: retryError } = await supabase.auth.signInWithPassword({
            email: 'manager@rentflow.ai',
            password: 'RentFlow2024!'
          });

          if (retryError) {
            console.log('❌ Login still failed:', retryError.message);
          } else {
            console.log('✅ Login successful!');
            console.log('   Access token:', retryLogin.session?.access_token ? 'Generated' : 'Not generated');
            console.log('   User:', retryLogin.user?.email);
          }
        }
      }
    } else {
      console.log('✅ Login successful!');
      console.log('   User:', loginData.user?.email);
      console.log('   Session:', loginData.session ? 'Active' : 'None');
    }

    // Step 4: Display final credentials
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('📋 Current Login Credentials');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 Email:    manager@rentflow.ai');
    console.log('🔑 Password: RentFlow2024!');
    console.log('🌐 URL:      http://localhost:3000');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Main execution
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         RentFlow AI - Login Debug Tool                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

debugLogin()
  .then(() => {
    console.log('\n✅ Debug complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
  });
