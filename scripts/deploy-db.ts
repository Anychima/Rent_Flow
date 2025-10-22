import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

dotenv.config();

async function deploySchema() {
  console.log('🗄️  RentFlow AI - Database Deployment\n');
  console.log('='  .repeat(60));

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read schema and seed files
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');

  console.log('\n📄 Reading database files...');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const seedData = fs.readFileSync(seedPath, 'utf-8');

  console.log('✅ Files loaded successfully\n');

  // Test connection
  console.log('🔌 Testing Supabase connection...');
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error && !error.message.includes('does not exist')) {
      console.error('❌ Connection failed:', error.message);
      process.exit(1);
    }
    console.log('✅ Connected to Supabase successfully\n');
  } catch (err) {
    console.error('❌ Connection test failed:', err);
    process.exit(1);
  }

  console.log('='  .repeat(60));
  console.log('\n📋 DEPLOYMENT PLAN:\n');
  console.log('Step 1: Deploy database schema');
  console.log('   - 9 tables (users, properties, leases, etc.)');
  console.log('   - Indexes for performance');
  console.log('   - Row Level Security (RLS) policies');
  console.log('   - Triggers for auto-timestamps\n');
  
  console.log('Step 2: Insert seed data');
  console.log('   - 4 sample users (1 manager, 1 AI agent, 2 tenants)');
  console.log('   - 3 sample properties');
  console.log('   - 2 active leases');
  console.log('   - 2 rent payments');
  console.log('   - 3 maintenance requests');
  console.log('   - 3 messages\n');
  console.log('='  .repeat(60));

  console.log('\n⚠️  MANUAL DEPLOYMENT REQUIRED:\n');
  console.log('Due to Supabase API limitations, please deploy manually:\n');
  console.log('1. Open Supabase SQL Editor:');
  console.log(`   ${supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql')}\n`);
  console.log('2. Create a new query and paste the contents of:');
  console.log('   📁 database/schema.sql\n');
  console.log('3. Click "Run" (or Ctrl+Enter)\n');
  console.log('4. Create another query and paste the contents of:');
  console.log('   📁 database/seed.sql\n');
  console.log('5. Click "Run" (or Ctrl+Enter)\n');
  console.log('='  .repeat(60));

  console.log('\n✨ QUICK COPY PATHS:\n');
  console.log('Schema: ' + schemaPath);
  console.log('Seed:   ' + seedPath);
  console.log('\nSQL Editor: ' + supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql'));
  console.log();

  // Verify deployment by checking for tables
  console.log('\n🔍 Checking current database state...');
  try {
    const { data: tables, error } = await supabase.from('users').select('count').limit(1);
    if (!error) {
      console.log('✅ Database tables already exist!');
      console.log('\n📊 Checking data...');
      
      const [users, properties, leases] = await Promise.all([
        supabase.from('users').select('count'),
        supabase.from('properties').select('count'),
        supabase.from('leases').select('count')
      ]);
      
      console.log(`   Users: ${users.count || 0}`);
      console.log(`   Properties: ${properties.count || 0}`);
      console.log(`   Leases: ${leases.count || 0}`);
      
      if ((users.count || 0) > 0) {
        console.log('\n✅ Database is already deployed and populated!');
        console.log('\n🚀 You can now run: npm run dev');
      } else {
        console.log('\n⚠️  Tables exist but no data. Please run seed.sql manually.');
      }
    } else {
      console.log('⏳ Database schema not yet deployed.');
      console.log('   Please follow the manual deployment steps above.');
    }
  } catch (err) {
    console.log('⏳ Database schema not yet deployed.');
    console.log('   Please follow the manual deployment steps above.');
  }

  console.log('\n📝 After deployment, verify by running:');
  console.log('   npm run dev');
  console.log('   Then visit: http://localhost:3000\n');
}

deploySchema()
  .then(() => {
    console.log('✅ Deployment instructions provided!\n');
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
