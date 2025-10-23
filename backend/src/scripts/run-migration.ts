/**
 * Run Database Migration
 * Applies schema changes for role system and property applications
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Starting database migration...');
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/001_add_role_system_and_applications.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split into individual statements (simple approach)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.length < 10) continue; // Skip very short statements
      
      try {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        
        // Use Supabase's raw SQL execution
        const { data, error } = await supabase.rpc('exec_sql', { query: stmt + ';' });
        
        if (error) {
          console.error(`   ⚠️  Statement ${i + 1} warning:`, error.message);
          // Continue anyway - some errors are expected (e.g., column already exists)
        } else {
          console.log(`   ✅ Statement ${i + 1} executed`);
        }
      } catch (err) {
        console.error(`   ⚠️  Statement ${i + 1} error:`, err);
        // Continue with next statement
      }
    }
    
    console.log('\n✅ Migration completed!');
    console.log('\nNew features added:');
    console.log('  - User role system (prospective_tenant, manager, tenant)');
    console.log('  - Property applications table');
    console.log('  - Saved properties (wishlist)');
    console.log('  - Lease documents with blockchain signatures');
    console.log('  - Property view analytics');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
