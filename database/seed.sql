-- Seed Data for RentFlow AI
-- Sample data for testing and development

-- Insert sample users
INSERT INTO users (id, wallet_address, email, full_name, phone, user_type) VALUES
    ('a0000000-0000-0000-0000-000000000001', '8kr6b3uuYx4MgvY8BW9ETogd3cc5ibTj3g8oVZCkKyiz', 'deployer@rentflow.ai', 'Property Manager', '+1-555-0101', 'property_manager'),
    ('a0000000-0000-0000-0000-000000000002', 'CqQT3otUUcvpvsUCkWzfebanHZeGqKEJprjw5NPLwx4m', 'ai@rentflow.ai', 'RentFlow AI Agent', NULL, 'ai_agent'),
    ('a0000000-0000-0000-0000-000000000003', 'Tenant1WalletAddress111111111111111111', 'john.doe@email.com', 'John Doe', '+1-555-0102', 'tenant'),
    ('a0000000-0000-0000-0000-000000000004', 'Tenant2WalletAddress222222222222222222', 'jane.smith@email.com', 'Jane Smith', '+1-555-0103', 'tenant')
ON CONFLICT (wallet_address) DO NOTHING;

-- Insert sample properties
INSERT INTO properties (id, owner_id, title, description, property_type, address, city, state, zip_code, monthly_rent_usdc, security_deposit_usdc, bedrooms, bathrooms, square_feet, amenities, is_active) VALUES
    ('b0000000-0000-0000-0000-000000000001', 
     'a0000000-0000-0000-0000-000000000001',
     'Modern Downtown Apartment',
     'Beautiful 2-bedroom apartment in the heart of downtown with stunning city views. Recently renovated with modern appliances and amenities.',
     'apartment',
     '123 Main Street, Apt 5B',
     'San Francisco',
     'CA',
     '94102',
     2500.00,
     5000.00,
     2,
     2.0,
     1200,
     '["parking", "gym", "pool", "concierge", "pet_friendly"]'::jsonb,
     true),
    ('b0000000-0000-0000-0000-000000000002',
     'a0000000-0000-0000-0000-000000000001',
     'Cozy Studio Near University',
     'Perfect for students! Cozy studio apartment walking distance to campus with all utilities included.',
     'studio',
     '456 College Ave, Unit 12',
     'Berkeley',
     'CA',
     '94704',
     1500.00,
     3000.00,
     0,
     1.0,
     500,
     '["wifi", "utilities_included", "laundry"]'::jsonb,
     true),
    ('b0000000-0000-0000-0000-000000000003',
     'a0000000-0000-0000-0000-000000000001',
     'Luxury 3BR House with Garden',
     'Spacious family home with private garden, garage, and modern kitchen. Located in quiet, safe neighborhood.',
     'house',
     '789 Oak Street',
     'Palo Alto',
     'CA',
     '94301',
     4500.00,
     9000.00,
     3,
     2.5,
     2000,
     '["garden", "garage", "fireplace", "hardwood_floors"]'::jsonb,
     true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample leases
INSERT INTO leases (id, property_id, tenant_id, start_date, end_date, monthly_rent_usdc, security_deposit_usdc, rent_due_day, status) VALUES
    ('c0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000003',
     CURRENT_DATE,
     CURRENT_DATE + INTERVAL '12 months',
     2500.00,
     5000.00,
     1,
     'active'),
    ('c0000000-0000-0000-0000-000000000002',
     'b0000000-0000-0000-0000-000000000002',
     'a0000000-0000-0000-0000-000000000004',
     CURRENT_DATE - INTERVAL '3 months',
     CURRENT_DATE + INTERVAL '9 months',
     1500.00,
     3000.00,
     5,
     'active')
ON CONFLICT (id) DO NOTHING;

-- Insert sample rent payments
INSERT INTO rent_payments (lease_id, tenant_id, amount_usdc, payment_date, due_date, status, transaction_hash) VALUES
    ('c0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000003',
     2500.00,
     CURRENT_DATE - INTERVAL '1 day',
     CURRENT_DATE,
     'completed',
     'SolanaTransactionSignature1234567890abcdef'),
    ('c0000000-0000-0000-0000-000000000002',
     'a0000000-0000-0000-0000-000000000004',
     1500.00,
     CURRENT_DATE - INTERVAL '2 days',
     CURRENT_DATE - INTERVAL '5 days',
     'completed',
     'SolanaTransactionSignature0987654321fedcba')
ON CONFLICT DO NOTHING;

-- Insert sample maintenance requests
INSERT INTO maintenance_requests (id, property_id, requested_by, title, description, category, priority, status, estimated_cost_usdc) VALUES
    ('d0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000003',
     'Leaking Kitchen Faucet',
     'The kitchen faucet has been dripping continuously for the past 3 days. It''s wasting water and making noise at night.',
     'plumbing',
     'medium',
     'pending',
     150.00),
    ('d0000000-0000-0000-0000-000000000002',
     'b0000000-0000-0000-0000-000000000002',
     'a0000000-0000-0000-0000-000000000004',
     'AC Not Cooling Properly',
     'The air conditioning unit is running but not cooling the apartment adequately. Temperature stays around 78°F even when set to 68°F.',
     'hvac',
     'high',
     'approved',
     300.00),
    ('d0000000-0000-0000-0000-000000000003',
     'b0000000-0000-0000-0000-000000000003',
     'a0000000-0000-0000-0000-000000000001',
     'Garage Door Opener Broken',
     'The garage door opener remote stopped working. Need to manually open and close the door.',
     'other',
     'low',
     'in_progress',
     200.00)
ON CONFLICT (id) DO NOTHING;

-- Insert sample messages
INSERT INTO messages (sender_id, recipient_id, property_id, subject, message_body, message_type, is_read) VALUES
    ('a0000000-0000-0000-0000-000000000003',
     'a0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000001',
     'Question about parking',
     'Hi, I wanted to confirm if the parking spot is included in the rent or if there''s an additional fee?',
     'in_app',
     true),
    ('a0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000003',
     'b0000000-0000-0000-0000-000000000001',
     'Re: Question about parking',
     'Hello John, yes the parking spot is included in your monthly rent. You''ll receive your parking pass when you move in.',
     'in_app',
     false),
    ('a0000000-0000-0000-0000-000000000002',
     'a0000000-0000-0000-0000-000000000004',
     'b0000000-0000-0000-0000-000000000002',
     'Rent Payment Reminder',
     'This is a friendly reminder that your rent payment of 1500 USDC is due in 3 days. Please ensure you have sufficient balance in your wallet.',
     'ai_generated',
     false)
ON CONFLICT DO NOTHING;

-- Confirmation message
DO $$
BEGIN
    RAISE NOTICE 'Seed data inserted successfully!';
    RAISE NOTICE 'Sample users: 4 (1 property manager, 1 AI agent, 2 tenants)';
    RAISE NOTICE 'Sample properties: 3';
    RAISE NOTICE 'Sample leases: 2';
    RAISE NOTICE 'Sample payments: 2';
    RAISE NOTICE 'Sample maintenance requests: 3';
    RAISE NOTICE 'Sample messages: 3';
END $$;
