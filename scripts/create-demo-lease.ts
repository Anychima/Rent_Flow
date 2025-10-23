import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createDemoLease() {
  console.log('🏠 Creating Demo Lease for John Doe\n');

  try {
    // Get John Doe's user ID
    const { data: johnDoe, error: johnError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'john.doe@email.com')
      .single();

    if (johnError || !johnDoe) {
      console.error('❌ Could not find John Doe');
      return;
    }

    console.log('✅ Found John Doe:', johnDoe.email);
    console.log('   User ID:', johnDoe.id);

    // Check if property exists, if not create one
    let property;
    const { data: existingProperty } = await supabaseAdmin
      .from('properties')
      .select('*')
      .limit(1)
      .single();

    if (existingProperty) {
      property = existingProperty;
      console.log('✅ Using existing property:', property.title);
    } else {
      // Create a demo property
      const { data: newProperty, error: propError } = await supabaseAdmin
        .from('properties')
        .insert([{
          owner_id: 'a0000000-0000-0000-0000-000000000001', // Manager ID
          title: 'Sunset Apartments',
          address: '123 Sunset Boulevard',
          city: 'Los Angeles',
          state: 'CA',
          zip_code: '90001',
          description: 'Beautiful 2-bedroom apartment with ocean view',
          property_type: 'apartment',
          monthly_rent_usdc: 1500,
          security_deposit_usdc: 3000,
          bedrooms: 2,
          bathrooms: 2,
          square_feet: 1200,
          amenities: ['Pool', 'Gym', 'Parking', 'Balcony'],
          is_active: true
        }])
        .select()
        .single();

      if (propError) {
        console.error('❌ Error creating property:', propError);
        return;
      }

      property = newProperty;
      console.log('✅ Created new property:', property.title);
    }

    console.log('   Property ID:', property.id);

    // Check if lease already exists
    const { data: existingLease } = await supabaseAdmin
      .from('leases')
      .select('*')
      .eq('tenant_id', johnDoe.id)
      .eq('status', 'active')
      .single();

    if (existingLease) {
      console.log('⚠️  John Doe already has an active lease!');
      console.log('   Lease ID:', existingLease.id);
      console.log('   Property:', existingLease.property_id);
      return;
    }

    // Create lease for John Doe
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year lease

    const { data: lease, error: leaseError } = await supabaseAdmin
      .from('leases')
      .insert([{
        property_id: property.id,
        tenant_id: johnDoe.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        monthly_rent_usdc: property.monthly_rent_usdc,
        security_deposit_usdc: property.security_deposit_usdc,
        rent_due_day: 1,
        status: 'active'
      }])
      .select()
      .single();

    if (leaseError) {
      console.error('❌ Error creating lease:', leaseError);
      return;
    }

    console.log('\n✅ Lease created successfully!');
    console.log('═'.repeat(80));
    console.log('Lease Details:');
    console.log('  Lease ID:', lease.id);
    console.log('  Tenant:', johnDoe.full_name, `(${johnDoe.email})`);
    console.log('  Property:', property.title);
    console.log('  Address:', property.address);
    console.log('  Monthly Rent:', property.monthly_rent_usdc, 'USDC');
    console.log('  Security Deposit:', property.security_deposit_usdc, 'USDC');
    console.log('  Start Date:', startDate.toLocaleDateString());
    console.log('  End Date:', endDate.toLocaleDateString());
    console.log('  Rent Due Day:', 1);
    console.log('  Status:', lease.status);
    console.log('═'.repeat(80));

    // Create initial rent payment records
    console.log('\n📋 Creating payment records...');
    
    const payments = [];
    for (let month = 0; month < 3; month++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + month);
      dueDate.setDate(1);

      const status = month === 0 ? 'pending' : 'scheduled';

      payments.push({
        lease_id: lease.id,
        tenant_id: johnDoe.id,
        amount_usdc: property.monthly_rent_usdc,
        payment_type: 'rent',
        status: status,
        due_date: dueDate.toISOString().split('T')[0]
      });
    }

    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert(payments);

    if (paymentError) {
      console.error('⚠️  Error creating payments:', paymentError);
    } else {
      console.log('✅ Created', payments.length, 'payment records');
    }

    console.log('\n🎉 Demo lease setup complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Login as John Doe: john.doe@email.com / Tenant2024!');
    console.log('   2. You should see the lease information');
    console.log('   3. Test submitting maintenance requests');
    console.log('   4. View payment history');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║          Demo Lease Creation Tool                         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

createDemoLease()
  .then(() => {
    console.log('\n✅ Script complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
