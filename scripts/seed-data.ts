import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function seedDatabase() {
  console.log('🌱 Seeding RentFlow AI Database...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );

  try {
    // Check current state
    const { count: propCount } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    if ((propCount || 0) > 0) {
      console.log('✅ Database already has data!');
      console.log(`   Properties: ${propCount}`);
      const { count: leaseCount } = await supabase
        .from('leases')
        .select('*', { count: 'exact', head: true });
      console.log(`   Leases: ${leaseCount || 0}`);
      return;
    }

    console.log('📝 Inserting properties...');
    
    // Insert properties
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .insert([
        {
          id: 'b0000000-0000-0000-0000-000000000001',
          owner_id: 'a0000000-0000-0000-0000-000000000001',
          title: 'Modern Downtown Apartment',
          description: 'Beautiful 2-bedroom apartment in the heart of downtown with stunning city views.',
          property_type: 'apartment',
          address: '123 Main Street, Apt 5B',
          city: 'San Francisco',
          state: 'CA',
          zip_code: '94102',
          monthly_rent_usdc: 2500.00,
          security_deposit_usdc: 5000.00,
          bedrooms: 2,
          bathrooms: 2.0,
          square_feet: 1200,
          amenities: ["parking", "gym", "pool"],
          is_active: true
        },
        {
          id: 'b0000000-0000-0000-0000-000000000002',
          owner_id: 'a0000000-0000-0000-0000-000000000001',
          title: 'Cozy Studio Near University',
          description: 'Perfect for students! Walking distance to campus.',
          property_type: 'studio',
          address: '456 College Ave, Unit 12',
          city: 'Berkeley',
          state: 'CA',
          zip_code: '94704',
          monthly_rent_usdc: 1500.00,
          security_deposit_usdc: 3000.00,
          bedrooms: 0,
          bathrooms: 1.0,
          square_feet: 500,
          amenities: ["wifi", "laundry"],
          is_active: true
        },
        {
          id: 'b0000000-0000-0000-0000-000000000003',
          owner_id: 'a0000000-0000-0000-0000-000000000001',
          title: 'Luxury 3BR House with Garden',
          description: 'Spacious family home with private garden.',
          property_type: 'house',
          address: '789 Oak Street',
          city: 'Palo Alto',
          state: 'CA',
          zip_code: '94301',
          monthly_rent_usdc: 4500.00,
          security_deposit_usdc: 9000.00,
          bedrooms: 3,
          bathrooms: 2.5,
          square_feet: 2000,
          amenities: ["garden", "garage"],
          is_active: true
        }
      ])
      .select();

    if (propError) {
      console.error('❌ Error inserting properties:', propError);
      return;
    }
    console.log('✅ Properties inserted:', properties?.length);

    console.log('📝 Inserting leases...');
    
    // Insert leases
    const { data: leases, error: leaseError } = await supabase
      .from('leases')
      .insert([
        {
          id: 'c0000000-0000-0000-0000-000000000001',
          property_id: 'b0000000-0000-0000-0000-000000000001',
          tenant_id: 'a0000000-0000-0000-0000-000000000003',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          monthly_rent_usdc: 2500.00,
          security_deposit_usdc: 5000.00,
          rent_due_day: 1,
          status: 'active'
        },
        {
          id: 'c0000000-0000-0000-0000-000000000002',
          property_id: 'b0000000-0000-0000-0000-000000000002',
          tenant_id: 'a0000000-0000-0000-0000-000000000004',
          start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          monthly_rent_usdc: 1500.00,
          security_deposit_usdc: 3000.00,
          rent_due_day: 5,
          status: 'active'
        }
      ])
      .select();

    if (leaseError) {
      console.error('❌ Error inserting leases:', leaseError);
      return;
    }
    console.log('✅ Leases inserted:', leases?.length);

    console.log('📝 Inserting maintenance requests...');
    
    // Insert maintenance requests
    const { data: maintenance, error: maintError } = await supabase
      .from('maintenance_requests')
      .insert([
        {
          id: 'd0000000-0000-0000-0000-000000000001',
          property_id: 'b0000000-0000-0000-0000-000000000001',
          requested_by: 'a0000000-0000-0000-0000-000000000003',
          title: 'Leaking Kitchen Faucet',
          description: 'The kitchen faucet has been dripping continuously.',
          category: 'plumbing',
          priority: 'medium',
          status: 'pending',
          estimated_cost_usdc: 150.00
        },
        {
          id: 'd0000000-0000-0000-0000-000000000002',
          property_id: 'b0000000-0000-0000-0000-000000000002',
          requested_by: 'a0000000-0000-0000-0000-000000000004',
          title: 'AC Not Cooling Properly',
          description: 'Air conditioning unit not cooling adequately.',
          category: 'hvac',
          priority: 'high',
          status: 'approved',
          estimated_cost_usdc: 300.00
        },
        {
          id: 'd0000000-0000-0000-0000-000000000003',
          property_id: 'b0000000-0000-0000-0000-000000000003',
          requested_by: 'a0000000-0000-0000-0000-000000000001',
          title: 'Garage Door Opener Broken',
          description: 'Remote stopped working.',
          category: 'other',
          priority: 'low',
          status: 'in_progress',
          estimated_cost_usdc: 200.00
        }
      ])
      .select();

    if (maintError) {
      console.error('❌ Error inserting maintenance:', maintError);
      return;
    }
    console.log('✅ Maintenance requests inserted:', maintenance?.length);

    console.log('📝 Inserting rent payments...');
    
    // Insert payments
    const { data: payments, error: payError } = await supabase
      .from('rent_payments')
      .insert([
        {
          lease_id: 'c0000000-0000-0000-0000-000000000001',
          tenant_id: 'a0000000-0000-0000-0000-000000000003',
          amount_usdc: 2500.00,
          due_date: new Date().toISOString().split('T')[0],
          status: 'completed',
          transaction_hash: 'SolanaSignature123456789abcdef'
        },
        {
          lease_id: 'c0000000-0000-0000-0000-000000000002',
          tenant_id: 'a0000000-0000-0000-0000-000000000004',
          amount_usdc: 1500.00,
          due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'completed',
          transaction_hash: 'SolanaSignature987654321fedcba'
        }
      ])
      .select();

    if (payError) {
      console.error('❌ Error inserting payments:', payError);
      return;
    }
    console.log('✅ Payments inserted:', payments?.length);

    console.log('\n✨ Database seeding complete!');
    console.log('\n📊 Summary:');
    console.log('   - Properties: 3');
    console.log('   - Leases: 2');
    console.log('   - Maintenance Requests: 3');
    console.log('   - Payments: 2');
    console.log('\n🚀 You can now run: npm run dev');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
