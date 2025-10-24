const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: `${__dirname}/.env` });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

async function listTables() {
  console.log('\n📊 Checking database tables...\n');

  // Try to query different possible payment tables
  const tablesToCheck = ['payments', 'rent_payments', 'payment', 'lease_payments'];

  for (const table of tablesToCheck) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ ${table}: NOT FOUND (${error.message})`);
    } else {
      console.log(`✅ ${table}: EXISTS (${data?.length || 0} sample records)`);
    }
  }
}

listTables().catch(console.error);
