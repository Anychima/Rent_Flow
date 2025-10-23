import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase admin client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupManagerPassword() {
  console.log('🔐 Setting up password for manager@rentflow.ai...\n');

  try {
    // Check if user exists in auth.users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      return;
    }

    const managerAuthUser = authUsers.users.find(u => u.email === 'manager@rentflow.ai');

    if (!managerAuthUser) {
      console.log('📝 Creating new auth user for manager@rentflow.ai...');
      
      // Create auth user with password
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
        console.error('❌ Error creating auth user:', createError.message);
        return;
      }

      console.log('✅ Auth user created successfully!');
      console.log('   User ID:', newUser.user?.id);

      // Link to existing users table record
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', 'manager@rentflow.ai')
        .single();

      if (existingUser) {
        // Update the users table with auth user ID
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ id: newUser.user?.id })
          .eq('email', 'manager@rentflow.ai');

        if (updateError) {
          console.log('⚠️  Could not link auth user to existing user record:', updateError.message);
        } else {
          console.log('✅ Linked auth user to existing database record');
        }
      }

    } else {
      console.log('✅ Auth user already exists:', managerAuthUser.email);
      console.log('   User ID:', managerAuthUser.id);
      console.log('   Created:', managerAuthUser.created_at);
      
      // Update password
      console.log('\n🔄 Updating password...');
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        managerAuthUser.id,
        { password: 'RentFlow2024!' }
      );

      if (updateError) {
        console.error('❌ Error updating password:', updateError.message);
        return;
      }

      console.log('✅ Password updated successfully!');
    }

    // Display credentials
    console.log('\n' + '═'.repeat(80));
    console.log('🎉 Manager Account Ready!');
    console.log('═'.repeat(80));
    console.log('');
    console.log('📧 Email:    manager@rentflow.ai');
    console.log('🔑 Password: RentFlow2024!');
    console.log('');
    console.log('🌐 Login at: http://localhost:3000');
    console.log('═'.repeat(80));

    // Create demo tenant users with passwords
    console.log('\n\n🔐 Setting up demo tenant passwords...\n');

    const tenants = [
      { email: 'john.doe@email.com', name: 'John Doe' },
      { email: 'jane.smith@email.com', name: 'Jane Smith' },
      { email: 'mike.wilson@email.com', name: 'Mike Wilson' }
    ];

    for (const tenant of tenants) {
      const existingTenant = authUsers.users.find(u => u.email === tenant.email);

      if (!existingTenant) {
        console.log(`📝 Creating auth user for ${tenant.email}...`);
        
        const { data: newTenant, error: tenantError } = await supabaseAdmin.auth.admin.createUser({
          email: tenant.email,
          password: 'Tenant2024!',
          email_confirm: true,
          user_metadata: {
            full_name: tenant.name,
            role: 'tenant'
          }
        });

        if (tenantError) {
          console.error(`❌ Error creating ${tenant.email}:`, tenantError.message);
        } else {
          console.log(`✅ Created: ${tenant.email}`);
        }
      } else {
        console.log(`✅ Already exists: ${tenant.email}`);
        
        // Update password
        await supabaseAdmin.auth.admin.updateUserById(
          existingTenant.id,
          { password: 'Tenant2024!' }
        );
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('🎉 Tenant Accounts Ready!');
    console.log('═'.repeat(80));
    console.log('');
    console.log('All tenants can login with:');
    console.log('🔑 Password: Tenant2024!');
    console.log('');
    console.log('📧 Emails:');
    tenants.forEach(t => console.log(`   - ${t.email}`));
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

// Main execution
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║      RentFlow AI - Demo Account Setup (Automated)         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

setupManagerPassword()
  .then(() => {
    console.log('\n✅ Setup complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Start the app: npm run dev');
    console.log('   2. Login at: http://localhost:3000');
    console.log('   3. Use the credentials shown above');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
