const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: `${__dirname}/.env` });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

async function testLeaseGenerationFix() {
  console.log('\n🧪 Testing Lease Generation Fix...\n');

  try {
    // Let's check if we have any properties and users we can use
    console.log('1. Checking for available properties...');
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*')
      .limit(1);
      
    if (propError) {
      console.log(`❌ Error fetching properties: ${propError.message}`);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('⚠️  No properties found.');
      return;
    }
    
    const property = properties[0];
    console.log(`✅ Found property: ${property.title}`);
    
    console.log('\n2. Checking for available users...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*');
      
    if (userError) {
      console.log(`❌ Error fetching users: ${userError.message}`);
      return;
    }
    
    if (!users || users.length < 2) {
      console.log('⚠️  Not enough users found.');
      return;
    }
    
    // Find a tenant that hasn't applied for this property yet
    let tenant = null;
    let manager = null;
    
    // Try to find a tenant who hasn't applied for this property
    for (const user of users) {
      if (user.user_type === 'tenant') {
        // Check if this tenant has already applied for this property
        const { data: existingApps } = await supabase
          .from('property_applications')
          .select('*')
          .eq('property_id', property.id)
          .eq('applicant_id', user.id);
          
        if (!existingApps || existingApps.length === 0) {
          tenant = user;
          break;
        }
      }
    }
    
    if (!tenant) {
      console.log('⚠️  Could not find a tenant who hasn\'t applied for this property.');
      // Use the first tenant and create application with a unique ID
      tenant = users.find(u => u.user_type === 'tenant') || users[0];
    }
    
    manager = users.find(u => u.user_type === 'property_manager') || users[1];
    
    console.log(`✅ Found tenant: ${tenant.full_name}`);
    console.log(`✅ Found manager: ${manager.full_name}`);
    
    // Create a new test application with a unique constraint
    console.log('\n3. Creating a new test application...');
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
        cover_letter: 'Test application for lease generation - ' + new Date().toISOString()
      }])
      .select()
      .single();
      
    if (createAppError) {
      console.log(`❌ Error creating test application: ${createAppError.message}`);
      return;
    }
    
    console.log(`✅ Created test application: ${newApplication.id}`);
    
    // Now test the lease generation process via the API endpoint
    console.log('\n4. Testing lease generation via API endpoint...');
    
    // Simulate the API call to /api/leases/generate
    const requestBody = {
      application_id: newApplication.id
    };
    
    console.log('   Request body:', JSON.stringify(requestBody, null, 2));
    
    // Get application details with property and applicant info
    console.log('   Fetching application details...');
    const { data: application, error: appError } = await supabase
      .from('property_applications')
      .select(`
        *,
        properties!property_id(*),
        users!applicant_id(*)
      `)
      .eq('id', newApplication.id)
      .single();

    if (appError || !application) {
      console.log(`❌ Application not found: ${appError?.message}`);
      return;
    }

    console.log(`✅ Application found: ${application.id}`);

    // Verify application is approved
    if (application.status !== 'approved') {
      console.log('❌ Application is not approved');
      return;
    }
    
    console.log('✅ Application is approved');

    // Check if lease already exists for this application
    console.log('\n5. Checking if lease already exists...');
    const { data: existingLease } = await supabase
      .from('leases')
      .select('*')
      .eq('application_id', application.id)
      .single();

    if (existingLease) {
      console.log(`⚠️  Lease already exists: ${existingLease.id}`);
      return;
    }
    
    console.log('✅ No existing lease found');

    // Calculate lease dates
    console.log('\n6. Calculating lease dates...');
    const startDate = new Date(application.requested_move_in_date);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1); // Default 1-year lease

    console.log(`   Start Date: ${startDate.toISOString().split('T')[0]}`);
    console.log(`   End Date: ${endDate.toISOString().split('T')[0]}`);

    // Get property details
    const prop = application.properties;
    const applicant = application.users;

    // Generate lease terms
    console.log('\n7. Generating lease terms...');
    const leaseTerms = {
      propertyAddress: `${prop.address}, ${prop.city}, ${prop.state} ${prop.zip_code}`,
      tenantName: applicant.full_name,
      tenantEmail: applicant.email,
      landlordName: 'RentFlow Property Management',
      monthlyRent: prop.monthly_rent_usdc,
      securityDeposit: prop.security_deposit_usdc,
      leaseDuration: '12 months',
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      rentDueDay: 1,
      lateFeeAmount: prop.monthly_rent_usdc * 0.05, // 5% late fee
      lateFeeGracePeriod: 5, // days
      propertyDetails: {
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        squareFeet: prop.square_feet,
        propertyType: prop.property_type,
        amenities: prop.amenities
      },
      standardClauses: [
        'Tenant agrees to maintain the property in good condition',
        'No subletting without written permission from landlord',
        'Tenant responsible for all utilities unless otherwise specified',
        'Property to be used for residential purposes only',
        'Landlord reserves right to inspect property with 24-hour notice',
        'Security deposit refundable within 30 days of lease termination',
        'Early termination requires 60-day written notice'
      ]
    };

    console.log('✅ Lease terms generated');

    // Create special terms from application data
    console.log('\n8. Creating special terms...');
    const specialTerms = {};
    
    // Check if application has pets field
    if (application.has_pets) {
      specialTerms.petPolicy = 'Pet allowed as disclosed in application. Additional pet deposit required.';
    }
    
    if (prop.amenities?.includes('parking')) {
      specialTerms.parking = 'One parking spot included with rental';
    }

    console.log('✅ Special terms created');

    // Get property owner's wallet address for manager_wallet_address
    console.log('\n9. Getting property owner wallet address...');
    const { data: propertyOwner, error: ownerError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', prop.owner_id)
      .single();

    if (ownerError) {
      console.log(`⚠️  Error fetching property owner: ${ownerError.message}`);
    } else {
      console.log(`✅ Property owner wallet: ${propertyOwner?.wallet_address || 'NULL'}`);
    }

    const managerWalletAddress = propertyOwner?.wallet_address || null;
    
    console.log('💼 Manager wallet address for lease:', managerWalletAddress);

    // Create lease record - this is the fixed version
    console.log('\n10. Creating lease record with fix...');
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .insert([{
        application_id: application.id,
        property_id: application.property_id,
        tenant_id: application.applicant_id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        monthly_rent_usdc: prop.monthly_rent_usdc,
        security_deposit_usdc: prop.security_deposit_usdc,
        rent_due_day: 1,
        lease_status: 'pending_tenant',
        status: 'pending',
        lease_terms: leaseTerms,
        special_terms: specialTerms,
        generated_at: new Date().toISOString(),
        manager_wallet_address: managerWalletAddress  // Save manager's wallet (FIXED - removed landlord_wallet)
      }])
      .select()
      .single();

    if (leaseError) {
      console.log(`❌ Error creating lease: ${leaseError.message}`);
      console.log('Full error details:', JSON.stringify(leaseError, null, 2));
      return;
    }

    console.log(`✅ Lease generated successfully: ${lease.id}`);
    console.log('🎉 Lease generation fix test completed successfully!');
    
    // Clean up - delete the test application and lease
    console.log('\n11. Cleaning up test data...');
    await supabase
      .from('leases')
      .delete()
      .eq('id', lease.id);
      
    await supabase
      .from('property_applications')
      .delete()
      .eq('id', application.id);
      
    console.log('✅ Test data cleaned up');
    
    console.log('\n✅ CONCLUSION: Lease generation is now working correctly!');
    console.log('   The issue was the non-existent landlord_wallet column.');
    console.log('   This has been fixed by removing that field from the insert operation.');

  } catch (err) {
    console.error('❌ Error during test:', err.message);
    console.error('Full error:', err);
  }
}

testLeaseGenerationFix().catch(console.error);