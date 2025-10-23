import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkUserMapping() {
  console.log('🔍 Checking User ID Mapping between Auth and Database\n');
  
  try {
    // Get all auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }

    console.log(`Found ${authData.users.length} auth users\n`);

    // Check each auth user
    for (const authUser of authData.users) {
      console.log(`\n📧 Auth User: ${authUser.email}`);
      console.log(`   Auth ID: ${authUser.id}`);

      // Try to find in database by ID
      const { data: dbUserById, error: idError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (dbUserById) {
        console.log(`   ✅ Found in DB by ID`);
        console.log(`      DB Role: ${dbUserById.role}`);
        console.log(`      DB User Type: ${dbUserById.user_type}`);
      } else {
        console.log(`   ❌ NOT found in DB by ID`);
        
        // Try by email
        const { data: dbUserByEmail, error: emailError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .single();

        if (dbUserByEmail) {
          console.log(`   🔄 Found in DB by Email`);
          console.log(`      DB ID: ${dbUserByEmail.id}`);
          console.log(`      DB Role: ${dbUserByEmail.role}`);
          console.log(`      DB User Type: ${dbUserByEmail.user_type}`);
          console.log(`   ⚠️  ID MISMATCH - Auth ID ≠ DB ID`);
          
          // Offer to fix
          console.log(`   💡 Need to update DB user ID to match Auth ID`);
          
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ id: authUser.id })
            .eq('email', authUser.email);

          if (updateError) {
            console.log(`   ❌ Failed to update: ${updateError.message}`);
          } else {
            console.log(`   ✅ Updated DB user ID to match Auth ID!`);
          }
        } else {
          console.log(`   ❌ NOT found in DB by Email either`);
          console.log(`   💡 This user might need to be created in the database`);
        }
      }
    }

    console.log('\n\n📊 Summary Check\n');
    
    // List all database users
    const { data: allDbUsers, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, user_type');

    if (dbError) {
      console.error('❌ Error fetching DB users:', dbError);
      return;
    }

    console.log('Database Users:');
    console.log('═'.repeat(80));
    allDbUsers?.forEach(user => {
      const authUser = authData.users.find(au => au.email === user.email);
      const match = authUser?.id === user.id ? '✅' : '❌';
      console.log(`${match} ${user.email}`);
      console.log(`   DB ID:   ${user.id}`);
      if (authUser) {
        console.log(`   Auth ID: ${authUser.id}`);
      } else {
        console.log(`   Auth ID: [NO AUTH USER]`);
      }
      console.log(`   Role: ${user.role} | Type: ${user.user_type}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║       User ID Mapping Verification Tool                   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

checkUserMapping()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
