import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface DemoUser {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
}

interface DemoApplication {
  id: string;
  applicant_id: string;
  property_offset: number;
  status: string;
  employment_status: string;
  employer_name: string;
  monthly_income_usdc: number;
  years_at_current_job: number;
  previous_landlord_name: string;
  previous_landlord_contact: string;
  years_at_previous_address: number;
  reason_for_moving: string;
  references: any[];
  ai_compatibility_score: number;
  ai_risk_score: number;
  ai_analysis: any;
  cover_letter: string;
  pets_description: string;
  emergency_contact: any;
  requested_move_in_date: string;
  days_ago: number;
}

const demoUsers: DemoUser[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    email: 'sarah.johnson@example.com',
    password: 'demo123',
    first_name: 'Sarah',
    last_name: 'Johnson',
    full_name: 'Sarah Johnson',
    phone: '+1-555-0101'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    email: 'michael.chen@example.com',
    password: 'demo123',
    first_name: 'Michael',
    last_name: 'Chen',
    full_name: 'Michael Chen',
    phone: '+1-555-0102'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    email: 'emily.rodriguez@example.com',
    password: 'demo123',
    first_name: 'Emily',
    last_name: 'Rodriguez',
    full_name: 'Emily Rodriguez',
    phone: '+1-555-0103'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    email: 'james.williams@example.com',
    password: 'demo123',
    first_name: 'James',
    last_name: 'Williams',
    full_name: 'James Williams',
    phone: '+1-555-0104'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000005',
    email: 'lisa.park@example.com',
    password: 'demo123',
    first_name: 'Lisa',
    last_name: 'Park',
    full_name: 'Lisa Park',
    phone: '+1-555-0105'
  }
];

const demoApplications: DemoApplication[] = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    applicant_id: 'b0000000-0000-0000-0000-000000000001',
    property_offset: 0,
    status: 'submitted',
    employment_status: 'full_time',
    employer_name: 'Tech Solutions Inc',
    monthly_income_usdc: 5500.00,
    years_at_current_job: 3.5,
    previous_landlord_name: 'John Smith',
    previous_landlord_contact: 'john.smith@landlords.com',
    years_at_previous_address: 2.0,
    reason_for_moving: 'Moving closer to work',
    references: [
      { name: 'Dr. Amanda White', relationship: 'Supervisor', phone: '+1-555-0201', email: 'a.white@techsolutions.com' },
      { name: 'Robert Taylor', relationship: 'Previous Landlord', phone: '+1-555-0202', email: 'r.taylor@realty.com' }
    ],
    ai_compatibility_score: 92.5,
    ai_risk_score: 12.3,
    ai_analysis: {
      strengths: ['Strong income-to-rent ratio (3.67x)', 'Stable employment history', 'Excellent references'],
      concerns: ['First-time renter in this area'],
      recommendation: 'Highly recommended - excellent candidate'
    },
    cover_letter: 'I am a software engineer looking for a quiet, comfortable place to call home. I have a stable job and excellent rental history. I take great pride in maintaining my living space.',
    pets_description: 'No pets',
    emergency_contact: { name: 'Karen Johnson', relationship: 'Mother', phone: '+1-555-0301' },
    requested_move_in_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    days_ago: 2
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    applicant_id: 'b0000000-0000-0000-0000-000000000002',
    property_offset: 1,
    status: 'under_review',
    employment_status: 'self_employed',
    employer_name: 'Chen Design Studio',
    monthly_income_usdc: 4200.00,
    years_at_current_job: 1.5,
    previous_landlord_name: 'Maria Garcia',
    previous_landlord_contact: 'maria.g@rentals.com',
    years_at_previous_address: 1.5,
    reason_for_moving: 'Studio too small, need more space',
    references: [
      { name: 'Jennifer Lee', relationship: 'Business Partner', phone: '+1-555-0203', email: 'j.lee@design.com' }
    ],
    ai_compatibility_score: 78.5,
    ai_risk_score: 25.8,
    ai_analysis: {
      strengths: ['Creative professional', 'Good income'],
      concerns: ['Self-employed (income variability)', 'Short employment tenure'],
      recommendation: 'Good candidate with minor concerns about income stability'
    },
    cover_letter: 'As a freelance designer, I am looking for a creative space that inspires my work. I have consistent client contracts and stable income.',
    pets_description: 'One cat (Luna, 2 years old, spayed)',
    emergency_contact: { name: 'David Chen', relationship: 'Brother', phone: '+1-555-0302' },
    requested_move_in_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    days_ago: 5
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    applicant_id: 'b0000000-0000-0000-0000-000000000003',
    property_offset: 2,
    status: 'submitted',
    employment_status: 'full_time',
    employer_name: 'City Hospital',
    monthly_income_usdc: 6200.00,
    years_at_current_job: 5.0,
    previous_landlord_name: 'Thomas Anderson',
    previous_landlord_contact: 'thomas.a@properties.com',
    years_at_previous_address: 3.0,
    reason_for_moving: 'Relocating for work promotion',
    references: [
      { name: 'Dr. Sarah Mitchell', relationship: 'Supervisor', phone: '+1-555-0204', email: 's.mitchell@cityhospital.com' },
      { name: 'Patricia Brown', relationship: 'Previous Landlord', phone: '+1-555-0205', email: 'p.brown@realty.com' }
    ],
    ai_compatibility_score: 95.0,
    ai_risk_score: 8.5,
    ai_analysis: {
      strengths: ['Excellent income ratio (4.13x)', 'Long-term stable employment', 'Healthcare professional', 'Outstanding rental history'],
      concerns: ['None significant'],
      recommendation: 'Exceptional candidate - highest priority'
    },
    cover_letter: 'I am a registered nurse with 8 years of experience. I am responsible, quiet, and take excellent care of my living space. Looking forward to becoming part of this community.',
    pets_description: 'No pets',
    emergency_contact: { name: 'Carlos Rodriguez', relationship: 'Father', phone: '+1-555-0303' },
    requested_move_in_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    days_ago: 1
  },
  {
    id: 'c4444444-4444-4444-4444-444444444444',
    applicant_id: 'b0000000-0000-0000-0000-000000000004',
    property_offset: 0,
    status: 'submitted',
    employment_status: 'part_time',
    employer_name: 'QuickMart Retail',
    monthly_income_usdc: 2800.00,
    years_at_current_job: 0.5,
    previous_landlord_name: 'Nancy White',
    previous_landlord_contact: 'nancy.w@apartments.com',
    years_at_previous_address: 0.8,
    reason_for_moving: 'First apartment, moving out from family',
    references: [
      { name: 'Susan Williams', relationship: 'Mother', phone: '+1-555-0206' }
    ],
    ai_compatibility_score: 62.0,
    ai_risk_score: 45.2,
    ai_analysis: {
      strengths: ['Young professional', 'Eager to establish rental history'],
      concerns: ['Low income-to-rent ratio (1.87x)', 'Short employment history', 'Limited references', 'First-time renter'],
      recommendation: 'Higher risk - consider requiring co-signer or larger deposit'
    },
    cover_letter: 'I just graduated from college and got my first job. I am responsible and excited to have my own place. My parents can co-sign if needed.',
    pets_description: 'No pets',
    emergency_contact: { name: 'Susan Williams', relationship: 'Mother', phone: '+1-555-0304' },
    requested_move_in_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    days_ago: 3
  },
  {
    id: 'c5555555-5555-5555-5555-555555555555',
    applicant_id: 'b0000000-0000-0000-0000-000000000005',
    property_offset: 1,
    status: 'approved',
    employment_status: 'full_time',
    employer_name: 'Education First Academy',
    monthly_income_usdc: 4800.00,
    years_at_current_job: 4.0,
    previous_landlord_name: 'Richard Johnson',
    previous_landlord_contact: 'r.johnson@homes.com',
    years_at_previous_address: 2.5,
    reason_for_moving: 'Downsizing after roommate moved',
    references: [
      { name: 'Principal Margaret Davis', relationship: 'Employer', phone: '+1-555-0207', email: 'm.davis@eduacademy.com' },
      { name: 'Richard Johnson', relationship: 'Previous Landlord', phone: '+1-555-0208', email: 'r.johnson@homes.com' }
    ],
    ai_compatibility_score: 85.5,
    ai_risk_score: 18.0,
    ai_analysis: {
      strengths: ['Stable teaching career', 'Good income ratio (3.2x)', 'Reliable rental history', 'Professional references'],
      concerns: ['None significant'],
      recommendation: 'Very good candidate - approved'
    },
    cover_letter: 'I am a high school teacher looking for a peaceful place to live. I value quiet evenings and am very respectful of neighbors and property.',
    pets_description: 'One small dog (Max, 5 years old, trained)',
    emergency_contact: { name: 'Jennifer Park', relationship: 'Sister', phone: '+1-555-0305' },
    requested_move_in_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    days_ago: 7
  }
];

async function createDemoAccounts() {
  console.log('🚀 Starting demo account creation...\n');

  try {
    // Step 1: Create Auth users and database records
    console.log('👥 Creating prospective tenant accounts...');
    
    for (const user of demoUsers) {
      console.log(`\n📧 Processing account for ${user.email}...`);
      
      // Try to get existing auth user first
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      let authUser = existingUsers?.users.find(u => u.email === user.email);
      
      if (!authUser) {
        // Create auth user if doesn't exist
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name
          }
        });

        if (authError) {
          console.error(`   ❌ Auth error for ${user.email}:`, authError.message);
          continue;
        }
        
        authUser = authData.user;
        console.log(`   ✅ Auth user created: ${authUser.id}`);
      } else {
        console.log(`   ✅ Auth user already exists: ${authUser.id}`);
      }

      // Create/update database record with actual auth user ID
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: authUser.id, // Use actual auth ID
          email: user.email,
          full_name: user.full_name,
          user_type: 'prospective_tenant',
          role: 'prospective_tenant',
          phone: user.phone,
          wallet_address: `DEMO_${authUser.id.substring(0, 8)}`, // Placeholder wallet
          is_active: true
        }, {
          onConflict: 'id'
        });

      if (dbError) {
        console.error(`   ❌ Database error for ${user.email}:`, dbError.message);
      } else {
        console.log(`   ✅ Database record created/updated with ID: ${authUser.id}`);
        console.log(`   📱 Phone: ${user.phone}`);
        console.log(`   🔑 Password: ${user.password}`);
        
        // Store the actual auth ID for applications
        user.id = authUser.id;
      }
    }

    // Step 2: Get available properties
    console.log('\n\n🏠 Fetching available properties...');
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, title, monthly_rent_usdc')
      .eq('is_active', true)
      .order('created_at')
      .limit(3);

    if (propError || !properties || properties.length === 0) {
      console.error('❌ No properties found or error:', propError);
      console.log('⚠️  Please create some properties first before running this script again.');
      return;
    }

    console.log(`✅ Found ${properties.length} properties:`);
    properties.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.title} - $${p.monthly_rent_usdc}/month`);
    });

    // Step 3: Create applications
    console.log('\n\n📋 Creating property applications...');
    
    for (const app of demoApplications) {
      const property = properties[app.property_offset % properties.length];
      
      console.log(`\n📝 Application from ${demoUsers.find(u => u.id === app.applicant_id)?.full_name}...`);
      console.log(`   🏠 Property: ${property.title}`);
      console.log(`   📊 AI Score: ${app.ai_compatibility_score}/100`);
      console.log(`   ⚠️  Risk: ${app.ai_risk_score}/100`);
      
      const { error: appError } = await supabase
        .from('property_applications')
        .upsert({
          id: app.id,
          property_id: property.id,
          applicant_id: app.applicant_id,
          status: app.status,
          employment_status: app.employment_status,
          employer_name: app.employer_name,
          monthly_income_usdc: app.monthly_income_usdc,
          years_at_current_job: app.years_at_current_job,
          previous_landlord_name: app.previous_landlord_name,
          previous_landlord_contact: app.previous_landlord_contact,
          years_at_previous_address: app.years_at_previous_address,
          reason_for_moving: app.reason_for_moving,
          applicant_references: app.references,
          ai_compatibility_score: app.ai_compatibility_score,
          ai_risk_score: app.ai_risk_score,
          ai_analysis: app.ai_analysis,
          cover_letter: app.cover_letter,
          pets_description: app.pets_description,
          emergency_contact: app.emergency_contact,
          requested_move_in_date: app.requested_move_in_date,
          created_at: new Date(Date.now() - app.days_ago * 24 * 60 * 60 * 1000).toISOString()
        }, {
          onConflict: 'id'
        });

      if (appError) {
        console.error(`   ❌ Error:`, appError.message);
      } else {
        console.log(`   ✅ Application created`);
        console.log(`   📅 Status: ${app.status}`);
      }
    }

    // Step 4: Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('✅ DEMO DATA CREATION COMPLETE!');
    console.log('='.repeat(60));
    
    console.log('\n📊 Summary:');
    console.log(`   👥 Users created: ${demoUsers.length}`);
    console.log(`   📋 Applications created: ${demoApplications.length}`);
    
    console.log('\n🔐 Login Credentials:');
    console.log('   Password for all accounts: demo123');
    console.log('');
    demoUsers.forEach(u => {
      console.log(`   📧 ${u.email}`);
    });

    console.log('\n🎯 Next Steps:');
    console.log('   1. Login as manager@rentflow.ai');
    console.log('   2. Go to Applications tab');
    console.log('   3. See all 5 applications with AI scores');
    console.log('   4. Test prospective tenant login with any email above');
    console.log('\n✨ Enjoy testing!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  }
}

// Run the script
createDemoAccounts()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
