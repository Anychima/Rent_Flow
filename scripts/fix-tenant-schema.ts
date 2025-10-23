import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTenantSchema() {
  console.log('🔧 Fixing Tenant Portal Schema\n');
  console.log('='.repeat(60));

  try {
    console.log('\n1️⃣ Checking current schema...');
    
    // Check if requestor_id column exists
    const { data: maintenanceColumns, error: maintenanceError } = await supabase
      .from('maintenance_requests')
      .select('*')
      .limit(1);

    if (maintenanceError) {
      console.log('⚠️  maintenance_requests table structure:', maintenanceError.message);
    }

    // Check if payments table exists (vs rent_payments)
    const { data: paymentsCheck, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .limit(1);

    if (paymentsError) {
      console.log('⚠️  payments table issue:', paymentsError.message);
      console.log('   Checking rent_payments instead...');
      
      const { error: rentPaymentsError } = await supabase
        .from('rent_payments')
        .select('*')
        .limit(1);

      if (!rentPaymentsError) {
        console.log('✅ rent_payments table exists');
      }
    }

    console.log('\n2️⃣ Schema Analysis:');
    console.log('   The database uses:');
    console.log('   - maintenance_requests.requested_by (not requestor_id)');
    console.log('   - rent_payments table (not payments)');
    console.log('\n   The backend code expects:');
    console.log('   - maintenance_requests.requestor_id');
    console.log('   - payments table');

    console.log('\n3️⃣ Creating view/alias for compatibility...\n');

    console.log('📋 MANUAL SQL TO RUN IN SUPABASE SQL EDITOR:\n');
    console.log('='.repeat(60));
    console.log(`
-- Option 1: Add requestor_id as alias column (RECOMMENDED)
ALTER TABLE maintenance_requests 
  ADD COLUMN IF NOT EXISTS requestor_id UUID REFERENCES users(id);

-- Copy existing data from requested_by to requestor_id
UPDATE maintenance_requests 
SET requestor_id = requested_by 
WHERE requestor_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_maintenance_requestor ON maintenance_requests(requestor_id);

-- Option 2: Create payments view from rent_payments
CREATE OR REPLACE VIEW payments AS
SELECT 
  id,
  lease_id,
  amount_usdc,
  payment_type,
  status,
  due_date,
  paid_at,
  transaction_hash,
  created_at
FROM rent_payments;

-- Grant permissions on view
GRANT SELECT ON payments TO authenticated;
GRANT SELECT ON payments TO anon;
    `.trim());
    console.log('\n' + '='.repeat(60));

    console.log('\n📝 STEPS:\n');
    console.log('1. Copy the SQL above');
    console.log('2. Go to Supabase SQL Editor:');
    console.log(`   ${supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql')}`);
    console.log('3. Paste and run the SQL');
    console.log('4. Re-run this script to verify');

    console.log('\n4️⃣ Alternative: Update Backend Code');
    console.log('   Change backend/src/index.ts to use:');
    console.log('   - requested_by instead of requestor_id');
    console.log('   - rent_payments instead of payments');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run fix
fixTenantSchema()
  .then(() => {
    console.log('\n✅ Schema fix instructions provided!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
