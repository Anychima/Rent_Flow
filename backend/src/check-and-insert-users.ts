import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAndInsertUsers() {
  console.log('🔍 Checking existing users...\n');

  // Get auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  
  console.log('📧 Auth Users Found:');
  const demoAuthUsers = authUsers?.users.filter(u => 
    u.email?.includes('sarah.johnson') ||
    u.email?.includes('michael.chen') ||
    u.email?.includes('emily.rodriguez') ||
    u.email?.includes('james.williams') ||
    u.email?.includes('lisa.park')
  );
  
  demoAuthUsers?.forEach(u => {
    console.log(`   - ${u.email} (${u.id})`);
  });

  // Get database users
  const { data: dbUsers } = await supabase
    .from('users')
    .select('id, email, role');
  
  console.log('\n💾 Database Users Found:', dbUsers?.length || 0);
  
  if (!demoAuthUsers || demoAuthUsers.length === 0) {
    console.log('\n❌ No demo auth users found. Run the setup script first.');
    return;
  }

  console.log('\n📝 Inserting users into database...\n');

  const userMapping = [
    { email: 'sarah.johnson@example.com', name: 'Sarah Johnson', phone: '+1-555-0101' },
    { email: 'michael.chen@example.com', name: 'Michael Chen', phone: '+1-555-0102' },
    { email: 'emily.rodriguez@example.com', name: 'Emily Rodriguez', phone: '+1-555-0103' },
    { email: 'james.williams@example.com', name: 'James Williams', phone: '+1-555-0104' },
    { email: 'lisa.park@example.com', name: 'Lisa Park', phone: '+1-555-0105' }
  ];

  for (const authUser of demoAuthUsers) {
    const userInfo = userMapping.find(u => u.email === authUser.email);
    if (!userInfo) continue;

    console.log(`Processing ${authUser.email}...`);

    // Check if user exists in DB
    const existingUser = dbUsers?.find(u => u.id === authUser.id);
    
    if (existingUser) {
      console.log(`   ℹ️  User already in database (role: ${existingUser.role})`);
      
      // Update role if wrong
      if (existingUser.role !== 'prospective_tenant') {
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'prospective_tenant', user_type: 'prospective_tenant' })
          .eq('id', authUser.id);
        
        if (updateError) {
          console.log(`   ❌ Update error: ${updateError.message}`);
        } else {
          console.log(`   ✅ Role updated to prospective_tenant`);
        }
      }
      continue;
    }

    // Insert new user
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email,
        full_name: userInfo.name,
        user_type: 'prospective_tenant',
        role: 'prospective_tenant',
        phone: userInfo.phone,
        wallet_address: `DEMO_${authUser.id.substring(0, 8)}`,
        is_active: true
      });

    if (insertError) {
      console.log(`   ❌ Insert error: ${insertError.message}`);
      console.log(`   Details:`, insertError);
    } else {
      console.log(`   ✅ User inserted successfully`);
    }
  }

  // Final verification
  console.log('\n📊 Final Verification...\n');
  const { data: finalUsers } = await supabase
    .from('users')
    .select('email, full_name, role')
    .in('email', userMapping.map(u => u.email));

  console.log('Users in database:');
  finalUsers?.forEach(u => {
    console.log(`   ✅ ${u.email} - ${u.full_name} (${u.role})`);
  });

  console.log('\n✨ Done!\n');
}

checkAndInsertUsers()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
