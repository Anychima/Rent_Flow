import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!
);

interface UserWithChanges {
  id: string;
  email: string;
  full_name: string;
  role: string;
  user_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  wallet_address?: string;
  circle_wallet_id?: string;
  roleChanged?: boolean;
  mismatch?: boolean;
}

async function checkUserRoles() {
  console.log('🔍 Checking all users and their roles...\n');
  console.log('=' .repeat(100));

  try {
    // Get all users
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users found in database');
      return;
    }

    console.log(`📊 Total Users: ${users.length}\n`);

    // Categorize users by role
    const usersByRole: Record<string, UserWithChanges[]> = {
      manager: [],
      tenant: [],
      prospective_tenant: [],
      admin: [],
      ai_agent: [],
      other: []
    };

    // Check for role/user_type mismatches
    const mismatches: UserWithChanges[] = [];

    users.forEach((user: any) => {
      const userData: UserWithChanges = {
        ...user,
        mismatch: user.role !== user.user_type
      };

      if (userData.mismatch) {
        mismatches.push(userData);
      }

      const role = user.role || 'other';
      if (usersByRole[role]) {
        usersByRole[role].push(userData);
      } else {
        usersByRole.other.push(userData);
      }
    });

    // Display summary
    console.log('📈 Users by Role:');
    console.log('-'.repeat(100));
    Object.entries(usersByRole).forEach(([role, roleUsers]) => {
      if (roleUsers.length > 0) {
        console.log(`  ${role.toUpperCase().padEnd(20)} : ${roleUsers.length} users`);
      }
    });
    console.log('-'.repeat(100));

    // Display role/user_type mismatches
    if (mismatches.length > 0) {
      console.log('\n⚠️  ROLE/USER_TYPE MISMATCHES FOUND:');
      console.log('=' .repeat(100));
      mismatches.forEach(user => {
        console.log(`\n  👤 ${user.full_name} (${user.email})`);
        console.log(`     Role: ${user.role}`);
        console.log(`     User Type: ${user.user_type}`);
        console.log(`     ⚠️  MISMATCH - These should be the same!`);
      });
      console.log('=' .repeat(100));
    } else {
      console.log('\n✅ No role/user_type mismatches found\n');
    }

    // Display detailed user list by role
    console.log('\n📋 DETAILED USER LIST:');
    console.log('=' .repeat(100));

    for (const [role, roleUsers] of Object.entries(usersByRole)) {
      if (roleUsers.length === 0) continue;

      console.log(`\n🏷️  ${role.toUpperCase()} (${roleUsers.length} users):`);
      console.log('-'.repeat(100));

      roleUsers.forEach((user, index) => {
        console.log(`\n  ${index + 1}. ${user.full_name}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     ID: ${user.id}`);
        console.log(`     Role: ${user.role}`);
        console.log(`     User Type: ${user.user_type}`);
        console.log(`     Active: ${user.is_active ? '✅ Yes' : '❌ No'}`);
        console.log(`     Wallet: ${user.wallet_address || user.circle_wallet_id || 'None'}`);
        console.log(`     Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`     Updated: ${new Date(user.updated_at).toLocaleString()}`);
        
        if (user.mismatch) {
          console.log(`     ⚠️  MISMATCH: role="${user.role}" but user_type="${user.user_type}"`);
        }
      });
    }

    console.log('\n' + '=' .repeat(100));

    // Check for users who might have had roles changed
    console.log('\n🔄 Checking for potential role changes (comparing created_at vs updated_at)...');
    console.log('-'.repeat(100));

    const potentialChanges = users.filter((user: any) => {
      const created = new Date(user.created_at);
      const updated = new Date(user.updated_at);
      const diffMinutes = (updated.getTime() - created.getTime()) / (1000 * 60);
      return diffMinutes > 1; // Updated more than 1 minute after creation
    });

    if (potentialChanges.length > 0) {
      console.log(`\n📝 Found ${potentialChanges.length} users with updates after creation:\n`);
      potentialChanges.forEach((user: any, index) => {
        const created = new Date(user.created_at);
        const updated = new Date(user.updated_at);
        const diffMinutes = Math.round((updated.getTime() - created.getTime()) / (1000 * 60));
        
        console.log(`  ${index + 1}. ${user.full_name} (${user.email})`);
        console.log(`     Current Role: ${user.role}`);
        console.log(`     Created: ${created.toLocaleString()}`);
        console.log(`     Updated: ${updated.toLocaleString()} (${diffMinutes} minutes later)`);
        console.log('');
      });
    } else {
      console.log('  ✅ No users found with updates after creation');
    }

    console.log('=' .repeat(100));

    // Return summary
    return {
      total: users.length,
      byRole: Object.fromEntries(
        Object.entries(usersByRole).map(([role, users]) => [role, users.length])
      ),
      mismatches: mismatches.length,
      potentialChanges: potentialChanges.length
    };

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    throw error;
  }
}

// Run the check
checkUserRoles()
  .then(summary => {
    if (summary) {
      console.log('\n✅ User role check complete!');
      console.log(`   Total users: ${summary.total}`);
      console.log(`   Mismatches: ${summary.mismatches}`);
      console.log(`   Potential changes: ${summary.potentialChanges}`);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
