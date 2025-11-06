const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: `${__dirname}/.env` });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

async function checkLeasesTable() {
  console.log('\n📋 Checking leases table structure...\n');

  try {
    // Get table info
    const { data, error } = await supabase
      .from('leases')
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ Error querying leases table: ${error.message}`);
      return;
    }

    if (data && data.length > 0) {
      const lease = data[0];
      console.log('✅ Leases table exists');
      console.log('📋 Sample lease record fields:');
      Object.keys(lease).forEach(key => {
        console.log(`  - ${key}: ${typeof lease[key]}`);
      });
    } else {
      console.log('✅ Leases table exists but is empty');
    }

    // Check if application_id column exists
    const { data: sampleData, error: sampleError } = await supabase.rpc('execute_sql', {
      sql: `SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'leases' 
            AND column_name = 'application_id'`
    });

    if (sampleError) {
      console.log(`⚠️  Could not check for application_id column: ${sampleError.message}`);
    } else {
      if (sampleData && sampleData.length > 0) {
        console.log('✅ application_id column exists in leases table');
      } else {
        console.log('❌ application_id column does NOT exist in leases table');
      }
    }

  } catch (err) {
    console.error('❌ Error checking leases table:', err.message);
  }
}

checkLeasesTable().catch(console.error);