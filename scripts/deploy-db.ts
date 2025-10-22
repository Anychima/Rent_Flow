import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function deploySchema() {
  console.log('🗄️  Deploying Database Schema to Supabase...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read schema file
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');

  console.log('📄 Reading schema file...');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  console.log('\n⚠️  IMPORTANT: Please follow these steps to deploy the schema:\n');
  console.log('1. Open your Supabase project:');
  console.log(`   ${supabaseUrl}\n`);
  console.log('2. Navigate to: SQL Editor (in the left sidebar)\n');
  console.log('3. Click "New Query"\n');
  console.log('4. Copy the schema from: database/schema.sql\n');
  console.log('5. Paste it into the SQL Editor\n');
  console.log('6. Click "Run" or press Ctrl+Enter\n');
  console.log('7. After schema is created, repeat steps 3-6 with: database/seed.sql\n');
  console.log('='.repeat(60));
  console.log('\n📋 Schema Summary:');
  console.log('   - Tables: users, properties, leases, rent_payments');
  console.log('   - Tables: maintenance_requests, messages');
  console.log('   - Tables: ai_analysis_cache, voice_notifications');
  console.log('   - Tables: blockchain_sync_log');
  console.log('   - Indexes: Optimized for common queries');
  console.log('   - RLS Policies: Basic row-level security');
  console.log('   - Triggers: Auto-update timestamps\n');

  console.log('📊 Seed Data Summary:');
  console.log('   - 4 sample users (1 manager, 1 AI agent, 2 tenants)');
  console.log('   - 3 sample properties');
  console.log('   - 2 active leases');
  console.log('   - 2 rent payments');
  console.log('   - 3 maintenance requests\n');

  console.log('🔗 Quick Links:');
  console.log(`   Supabase Dashboard: ${supabaseUrl}`);
  console.log(`   SQL Editor: ${supabaseUrl.replace('supabase.co', 'supabase.co/project/_/sql')}`);
  console.log();

  // Test connection
  console.log('🔌 Testing Supabase connection...');
  try {
    const { error } = await supabase.from('_metadata').select('*').limit(1);
    if (error && error.message.includes('does not exist')) {
      console.log('✅ Connected to Supabase (schema not yet deployed)');
    } else if (error) {
      console.log(`⚠️  Connection warning: ${error.message}`);
    } else {
      console.log('✅ Connected to Supabase successfully');
    }
  } catch (err) {
    console.error('❌ Connection test failed:', err);
  }

  console.log('\n📝 After deploying the schema, run:');
  console.log('   npm run dev\n');
}

deploySchema()
  .then(() => {
    console.log('✅ Deployment instructions provided!\n');
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
