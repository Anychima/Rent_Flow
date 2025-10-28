// Manual sync script for jones@test.com
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncJonesUser() {
  try {
    console.log('🔍 Checking for jones@test.com...');
    
    // 1. Check if user exists in auth.users
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const jonesAuth = authUsers.users.find(u => u.email === 'jones@test.com');
    
    if (!jonesAuth) {
      console.error('❌ jones@test.com NOT found in auth.users');
      console.log('   User needs to sign up first!');
      return;
    }
    
    console.log('✅ jones@test.com found in auth.users');
    console.log('   ID:', jonesAuth.id);
    console.log('   Metadata:', jonesAuth.user_metadata);
    
    // 2. Check if exists in public.users
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'jones@test.com')
      .maybeSingle();
    
    if (existingUser) {
      console.log('✅ jones@test.com already exists in public.users');
      console.log('   Role:', existingUser.role);
      console.log('   User Type:', existingUser.user_type);
      return;
    }
    
    console.log('⚠️  jones@test.com NOT in public.users - inserting now...');
    
    // 3. Extract role from metadata
    const userRole = jonesAuth.user_metadata?.role || 'manager';
    const fullName = jonesAuth.user_metadata?.full_name || jonesAuth.email;
    
    console.log('   Using role:', userRole);
    console.log('   Using full_name:', fullName);
    
    // 4. Insert into public.users
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: jonesAuth.id,
        email: jonesAuth.email,
        full_name: fullName,
        role: userRole,
        user_type: userRole,
        wallet_address: null,
        is_active: true,
        created_at: jonesAuth.created_at,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Failed to insert jones@test.com:', insertError.message);
      console.error('   Details:', insertError);
      return;
    }
    
    console.log('✅ Successfully inserted jones@test.com into public.users!');
    console.log('   User ID:', newUser.id);
    console.log('   Email:', newUser.email);
    console.log('   Role:', newUser.role);
    console.log('   User Type:', newUser.user_type);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

syncJonesUser();
