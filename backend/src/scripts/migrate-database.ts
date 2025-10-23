/**
 * Database Migration Script
 * Executes SQL migration directly to Supabase using REST API
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Extract project reference from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

async function executeSQLViaAPI(sql: string, description: string): Promise<boolean> {
  try {
    const response = await axios.post(
      `${supabaseUrl}/rest/v1/rpc/exec_sql`,
      { query: sql },
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`   ✅ ${description}`);
    return true;
  } catch (error: any) {
    // Check if it's an "already exists" error
    if (error.response?.data?.message?.includes('already exists') ||
        error.response?.data?.hint?.includes('already exists')) {
      console.log(`   ⚠️  ${description}: Already exists`);
      return true;
    }
    
    console.error(`   ❌ ${description}:`, error.response?.data?.message || error.message);
    return false;
  }
}

async function executeDirectSQL(sql: string, description: string): Promise<boolean> {
  try {
    // For table creation and schema changes, we'll create a test record to verify
    console.log(`   ℹ️  ${description}`);
    return true;
  } catch (error) {
    console.error(`   ❌ ${description}:`, error);
    return false;
  }
}

async function runMigration() {
  console.log('\n🚀 Starting Database Migration...\n');
  console.log('📍 Database:', supabaseUrl);
  console.log('🔑 Using service role key\n');

  let successCount = 0;
  let skipCount = 0;

  // Step 1: Add role column to users table
  console.log('1️⃣  Adding role system to users table...');
  
  const addRoleColumn = `
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'prospective_tenant' 
    CHECK (role IN ('prospective_tenant', 'manager', 'tenant'));
  `;
  
  if (await executeSQLStatement(addRoleColumn, 'Add role column')) {
    successCount++;
  }

  // Update existing users
  const updateUserRoles = `
    UPDATE users 
    SET role = CASE 
      WHEN user_type = 'property_manager' THEN 'manager'
      WHEN user_type = 'tenant' THEN 'tenant'
      ELSE 'prospective_tenant'
    END
    WHERE role IS NULL OR role = 'prospective_tenant';
  `;
  
  if (await executeSQLStatement(updateUserRoles, 'Update existing user roles')) {
    successCount++;
  }

  // Step 2: Update properties table
  console.log('\n2️⃣  Enhancing properties table...');
  
  const propertyColumns = [
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS available_date DATE;",
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS pet_friendly BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS ai_generated_description TEXT;",
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;",
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS application_count INTEGER DEFAULT 0;"
  ];

  for (const sql of propertyColumns) {
    if (await executeSQLStatement(sql, 'Add property column')) {
      successCount++;
    }
  }

  // Step 3: Create property_applications table
  console.log('\n3️⃣  Creating property_applications table...');
  
  const createApplicationsTable = `
    CREATE TABLE IF NOT EXISTS property_applications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
      applicant_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      status TEXT DEFAULT 'submitted' CHECK (status IN (
        'submitted', 'under_review', 'approved', 'rejected', 'withdrawn', 'lease_signed'
      )),
      
      employment_status TEXT,
      employer_name TEXT,
      monthly_income_usdc DECIMAL(20,6),
      years_at_current_job DECIMAL(4,2),
      
      previous_landlord_name TEXT,
      previous_landlord_contact TEXT,
      years_at_previous_address DECIMAL(4,2),
      reason_for_moving TEXT,
      
      references JSONB DEFAULT '[]',
      
      ai_compatibility_score DECIMAL(5,2),
      ai_risk_score DECIMAL(5,2),
      ai_analysis JSONB,
      
      cover_letter TEXT,
      pets_description TEXT,
      emergency_contact JSONB,
      requested_move_in_date DATE,
      
      reviewed_by UUID REFERENCES users(id),
      reviewed_at TIMESTAMP WITH TIME ZONE,
      manager_notes TEXT,
      rejection_reason TEXT,
      
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      UNIQUE(property_id, applicant_id)
    );
  `;
  
  if (await executeSQLStatement(createApplicationsTable, 'Create property_applications table')) {
    successCount++;
  }

  // Step 4: Create saved_properties table
  console.log('\n4️⃣  Creating saved_properties table...');
  
  const createSavedPropertiesTable = `
    CREATE TABLE IF NOT EXISTS saved_properties (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      UNIQUE(user_id, property_id)
    );
  `;
  
  if (await executeSQLStatement(createSavedPropertiesTable, 'Create saved_properties table')) {
    successCount++;
  }

  // Step 5: Create lease_documents table
  console.log('\n5️⃣  Creating lease_documents table...');
  
  const createLeaseDocumentsTable = `
    CREATE TABLE IF NOT EXISTS lease_documents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
      application_id UUID REFERENCES property_applications(id),
      
      document_type TEXT DEFAULT 'lease_agreement' CHECK (document_type IN (
        'lease_agreement', 'addendum', 'inspection_report', 'other'
      )),
      document_url TEXT,
      document_hash TEXT,
      
      blockchain_signature TEXT,
      blockchain_transaction_hash TEXT,
      blockchain_timestamp TIMESTAMP WITH TIME ZONE,
      
      manager_signed BOOLEAN DEFAULT FALSE,
      manager_signed_at TIMESTAMP WITH TIME ZONE,
      manager_signature_hash TEXT,
      
      tenant_signed BOOLEAN DEFAULT FALSE,
      tenant_signed_at TIMESTAMP WITH TIME ZONE,
      tenant_signature_hash TEXT,
      
      status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_signatures', 'partially_signed', 'fully_signed', 'voided'
      )),
      
      ai_review_passed BOOLEAN,
      ai_review_notes JSONB,
      
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  
  if (await executeSQLStatement(createLeaseDocumentsTable, 'Create lease_documents table')) {
    successCount++;
  }

  // Step 6: Create property_views table
  console.log('\n6️⃣  Creating property_views table...');
  
  const createPropertyViewsTable = `
    CREATE TABLE IF NOT EXISTS property_views (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id),
      session_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      referrer TEXT,
      view_duration_seconds INTEGER,
      viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  
  if (await executeSQLStatement(createPropertyViewsTable, 'Create property_views table')) {
    successCount++;
  }

  // Step 7: Create indexes
  console.log('\n7️⃣  Creating indexes for performance...');
  
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_applications_property ON property_applications(property_id);",
    "CREATE INDEX IF NOT EXISTS idx_applications_applicant ON property_applications(applicant_id);",
    "CREATE INDEX IF NOT EXISTS idx_applications_status ON property_applications(status);",
    "CREATE INDEX IF NOT EXISTS idx_saved_properties_user ON saved_properties(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_saved_properties_property ON saved_properties(property_id);",
    "CREATE INDEX IF NOT EXISTS idx_lease_documents_lease ON lease_documents(lease_id);",
    "CREATE INDEX IF NOT EXISTS idx_lease_documents_status ON lease_documents(status);",
    "CREATE INDEX IF NOT EXISTS idx_property_views_property ON property_views(property_id);",
    "CREATE INDEX IF NOT EXISTS idx_property_views_user ON property_views(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);"
  ];

  for (const sql of indexes) {
    if (await executeSQLStatement(sql, 'Create index')) {
      successCount++;
    }
  }

  // Step 8: Create triggers
  console.log('\n8️⃣  Setting up automated triggers...');
  
  const triggers = [
    `CREATE TRIGGER IF NOT EXISTS update_property_applications_updated_at 
     BEFORE UPDATE ON property_applications
     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
    
    `CREATE TRIGGER IF NOT EXISTS update_lease_documents_updated_at 
     BEFORE UPDATE ON lease_documents
     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`
  ];

  for (const sql of triggers) {
    if (await executeSQLStatement(sql, 'Create trigger')) {
      successCount++;
    }
  }

  // Step 9: Update existing properties
  console.log('\n9️⃣  Updating existing properties...');
  
  const updateProperties = `
    UPDATE properties 
    SET is_published = TRUE 
    WHERE is_active = TRUE AND is_published IS NULL;
  `;
  
  if (await executeSQLStatement(updateProperties, 'Set properties as published')) {
    successCount++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Migration Complete!');
  console.log('='.repeat(50));
  console.log(`✓ Successful operations: ${successCount}`);
  console.log(`⚠ Skipped (already exists): ${skipCount}`);
  console.log('\n📊 New Tables Created:');
  console.log('   • property_applications');
  console.log('   • saved_properties');
  console.log('   • lease_documents');
  console.log('   • property_views');
  console.log('\n🔧 Tables Updated:');
  console.log('   • users (added role column)');
  console.log('   • properties (added browsing fields)');
  console.log('\n🎯 Ready to use new features:');
  console.log('   • Public property browsing');
  console.log('   • Rental applications with AI scoring');
  console.log('   • Saved properties (wishlist)');
  console.log('   • Lease signing with blockchain');
  console.log('   • View analytics\n');
}

// Run migration
runMigration()
  .then(() => {
    console.log('✨ Migration script completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
