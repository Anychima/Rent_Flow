const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: `${__dirname}/.env` });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

async function testLeaseGeneration() {
  console.log('\n🧪 Testing Lease Generation Process...\n');

  try {
    // First, let's check if we have any approved applications
    console.log('1. Checking for approved applications...');
    const { data: applications, error: appError } = await supabase
      .from('property_applications')
      .select(`
        *,
        properties!property_id(*),
        users!applicant_id(*)
      `)
      .eq('status', 'approved');

    if (appError) {
      console.log(`❌ Error fetching applications: ${appError.message}`);
      return;
    }

    if (!applications || applications.length === 0) {
      console.log('⚠️  No approved applications found. Creating a test application...');
      
      // Let's check if we have any properties and users we can use
      const { data: properties } = await supabase
        .from('properties')
        .select('*')
        .limit(1);
        
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .limit(2);
        
      if (!properties || properties.length === 0 || !users || users.length < 2) {
        console.log('⚠️  Not enough data to create test application. Please ensure you have at least one property and two users.');
        return;
      }
      
      const property = properties[0];
      const tenant = users.find(u => u.user_type === 'tenant') || users[0];
      const manager = users.find(u => u.user_type === 'property_manager') || users[1];
      
      console.log(`   Property: ${property.title}`);
      console.log(`   Tenant: ${tenant.full_name}`);
      console.log(`   Manager: ${manager.full_name}`);
      
      // Create a test application
      const { data: newApplication, error: createAppError } = await supabase
        .from('property_applications')
        .insert([{
          property_id: property.id,
          applicant_id: tenant.id,
          status: 'approved',
          employment_status: 'employed',
          employer_name: 'Test Company',
          monthly_income_usdc: 5000,
          requested_move_in_date: '2025-12-01',
          cover_letter: 'Test application for lease generation'
        }])
        .select()
        .single();
        
      if (createAppError) {
        console.log(`❌ Error creating test application: ${createAppError.message}`);
        return;
      }
      
      console.log(`✅ Created test application: ${newApplication.id}`);
      applications.push(newApplication);
    } else {
      console.log(`✅ Found ${applications.length} approved applications`);
    }

    // Test with the first application
    const application = applications[0];
    console.log(`\n2. Testing with application: ${application.id}`);
    console.log(`   Property: ${application.properties?.title}`);
    console.log(`   Applicant: ${application.users?.full_name}`);
    
    // Check if lease already exists
    console.log('\n3. Checking if lease already exists...');
    const { data: existingLease } = await supabase
      .from('leases')
      .select('*')
      .eq('application_id', application.id)
      .single();

    if (existingLease) {
      console.log(`✅ Lease already exists: ${existingLease.id}`);
      return;
    }
    
    console.log('✅ No existing lease found. Proceeding with generation...');
    
    // Test the lease generation process step by step
    console.log('\n4. Testing lease generation steps...');
    
    // Calculate lease dates
    const startDate = new Date(application.requested_move_in_date);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1); // Default 1-year lease
    
    console.log(`   Start Date: ${startDate.toISOString().split('T')[0]}`);
    console.log(`   End Date: ${endDate.toISOString().split('T')[0]}`);
    
    // Get property details
    const property = application.properties;
    const tenant = application.users;
    
    // Generate lease terms
    const leaseTerms = {
      propertyAddress: `${property.address}, ${property.city}, ${property.state} ${property.zip_code}`,
      tenantName: tenant.full_name,
      tenantEmail: tenant.email,
      landlordName: 'RentFlow Property Management',
      monthlyRent: property.monthly_rent_usdc,
      securityDeposit: property.security_deposit_usdc,
      leaseDuration: '12 months',
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      rentDueDay: 1,
      lateFeeAmount: property.monthly_rent_usdc * 0.05, // 5% late fee
      lateFeeGracePeriod: 5, // days
      propertyDetails: {
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: property.square_feet,
        propertyType: property.property_type,
        amenities: property.amenities
      }
    };
    
    console.log('✅ Lease terms generated successfully');
    
    // Create special terms
    const specialTerms = {};
    
    if (application.has_pets) {
      specialTerms.petPolicy = 'Pet allowed as disclosed in application. Additional pet deposit required.';
    }
    
    if (property.amenities?.includes('parking')) {
      specialTerms.parking = 'One parking spot included with rental';
    }
    
    console.log('✅ Special terms generated successfully');
    
    // Get property owner's wallet address
    console.log('\n5. Getting property owner wallet address...');
    const { data: propertyOwner, error: ownerError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', property.owner_id)
      .single();

    if (ownerError) {
      console.log(`⚠️  Error fetching property owner: ${ownerError.message}`);
      console.log('   This might be the issue causing lease generation to fail.');
    } else {
      console.log(`✅ Property owner wallet: ${propertyOwner?.wallet_address || 'NULL'}`);
    }
    
    const managerWalletAddress = propertyOwner?.wallet_address || null;
    
    // Try to create the lease record
    console.log('\n6. Attempting to create lease record...');
    const leaseData = {
      application_id: application.id,
      property_id: application.property_id,
      tenant_id: application.applicant_id,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      monthly_rent_usdc: property.monthly_rent_usdc,
      security_deposit_usdc: property.security_deposit_usdc,
      rent_due_day: 1,
      lease_status: 'pending_tenant',
      status: 'pending',
      lease_terms: leaseTerms,
      special_terms: specialTerms,
      generated_at: new Date().toISOString(),
      manager_wallet_address: managerWalletAddress,
      landlord_wallet: managerWalletAddress
    };
    
    console.log('   Lease data prepared. Inserting...');
    
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .insert([leaseData])
      .select()
      .single();

    if (leaseError) {
      console.log(`❌ Error creating lease: ${leaseError.message}`);
      console.log('   This is likely the issue with lease generation.');
      console.log('   Full error:', JSON.stringify(leaseError, null, 2));
      return;
    }
    
    console.log(`✅ Lease created successfully: ${lease.id}`);
    console.log('🎉 Lease generation test completed successfully!');
    
  } catch (err) {
    console.error('❌ Error during test:', err.message);
    console.error('Full error:', err);
  }
}

testLeaseGeneration().catch(console.error);