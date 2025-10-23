import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function runMigration() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!
  );

  try {
    console.log('🔍 Running database migration for micropayments table...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/005_micropayments.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Migration SQL to be executed:');
    console.log(migrationSql);
    
    // Try to execute using RPC if available
    try {
      // First try to execute as a single SQL statement
      const { data, error } = await supabase.rpc('execute_sql', { sql: migrationSql });
      
      if (error) {
        console.log('⚠️  RPC execution failed, falling back to manual approach');
        throw error;
      }
      
      console.log('✅ Migration executed successfully via RPC!');
      return;
    } catch (rpcError) {
      console.log('ℹ️  RPC not available, providing manual execution instructions...');
    }
    
    // If RPC fails, provide manual execution instructions
    console.log('\n📋 To complete the migration, please:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Open the SQL Editor');
    console.log('3. Paste and run the following SQL:');
    console.log('\n' + '='.repeat(50));
    console.log(migrationSql);
    console.log('='.repeat(50));
    console.log('\n4. After running the SQL, verify the table was created:');
    console.log('   Run: SELECT * FROM micropayments LIMIT 1;');
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    console.log('\n📋 Manual execution instructions:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Open the SQL Editor');
    console.log('3. Paste and run the SQL shown above');
    process.exit(1);
  }
}

runMigration();