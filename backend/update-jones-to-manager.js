// Update jones@test.com to manager role
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateJonesToManager() {
  try {
    console.log('🔄 Updating jones@test.com to manager role...');
    
    const { data, error } = await supabase
      .from('users')
      .update({
        role: 'manager',
        user_type: 'manager',
        updated_at: new Date().toISOString()
      })
      .eq('email', 'jones@test.com')
      .select();
    
    if (error) {
      console.error('❌ Failed to update:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('✅ Successfully updated jones@test.com to manager!');
    console.log('   Email:', data[0].email);
    console.log('   Role:', data[0].role);
    console.log('   User Type:', data[0].user_type);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateJonesToManager();
