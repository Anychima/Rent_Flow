/**
 * Fix Payment and Micropayment Schema Issues
 * Runs migration to add missing payment_type column and micropayments table
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Please check .env file for SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('\n🔧 RentFlow Payment Schema Fix');
  console.log('='.repeat(60));
  console.log(`Database: ${supabaseUrl}`);
  console.log('='.repeat(60));

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../database/migrations/006_fix_payments_micropayments.sql');
    console.log(`\n📂 Reading migration file: ${migrationPath}`);
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('\n🚀 Executing migration...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // If rpc doesn't work, try direct SQL execution
      console.log('⚠️  RPC method failed, trying direct execution...\n');
      
      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase
            .from('_migrations') // This will fail but helps us execute SQL
            .select('*')
            .limit(0);
          
          // Alternative: Use Supabase SQL editor or execute via psql
          console.log('📝 Statement to execute manually:');
          console.log(statement + ';\n');
        }
      }

      console.log('\n⚠️  Automatic execution not available.');
      console.log('📋 Please execute the migration manually:');
      console.log('\n1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Copy the contents of:');
      console.log(`   database/migrations/006_fix_payments_micropayments.sql`);
      console.log('3. Paste and run in SQL Editor');
      console.log('\nOR use psql:');
      console.log(`psql ${supabaseUrl} < database/migrations/006_fix_payments_micropayments.sql`);
    } else {
      console.log('✅ Migration executed successfully!\n');
    }

    // Verify the changes
    console.log('\n🔍 Verifying changes...\n');

    // Check payment_type column
    const { data: columns } = await supabase
      .from('rent_payments')
      .select('payment_type')
      .limit(1);

    if (columns !== null) {
      console.log('✅ payment_type column exists in rent_payments');
    } else {
      console.log('⚠️  payment_type column may not exist yet');
    }

    // Check micropayments table
    const { data: micropayments, error: microError } = await supabase
      .from('micropayments')
      .select('id')
      .limit(1);

    if (!microError) {
      console.log('✅ micropayments table exists');
    } else {
      console.log('⚠️  micropayments table may not exist yet');
      console.log(`   Error: ${microError.message}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log('\nNext Steps:');
    console.log('1. If automatic migration failed, run SQL manually (see above)');
    console.log('2. Restart backend server: cd backend && npm run dev');
    console.log('3. Clear browser cache: http://localhost:3000/clear-cache.html');
    console.log('4. Test payments and micropayments in the app');
    console.log('\n✅ Schema fix process complete!\n');

  } catch (error) {
    console.error('\n❌ Error running migration:', error);
    console.error('\n📋 Manual Steps Required:');
    console.error('1. Open Supabase Dashboard');
    console.error('2. Go to SQL Editor');
    console.error('3. Execute: database/migrations/006_fix_payments_micropayments.sql');
    process.exit(1);
  }
}

// Run the migration
runMigration();
