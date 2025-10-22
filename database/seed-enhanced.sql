-- ENHANCED Seed Data for RentFlow AI with More Sample Data
-- Run this in Supabase SQL Editor after schema deployment

-- Clear existing data first (optional - remove if you want to keep existing)
TRUNCATE TABLE messages, rent_payments, maintenance_requests, leases, properties, users CASCADE;

-- Insert sample users (10 total)
INSERT INTO users (id, wallet_address, email, full_name, phone, user_type, is_active) VALUES
    ('a0000000-0000-0000-0000-000000000001', '8kr6b3uuYx4MgvY8BW9ETogd3cc5ibTj3g8oVZCkKyiz', 'manager@rentflow.ai', 'Sarah Johnson', '+1-555-0101', 'property_manager', true),
    ('a0000000-0000-0000-0000-000000000002', 'CqQT3otUUcvpvsUCkWzfebanHZeGqKEJprjw5NPLwx4m', 'ai@rentflow.ai', 'RentFlow AI Agent', NULL, 'ai_agent', true),
    ('a0000000-0000-0000-0000-000000000003', 'Sol1TenantAddress1111111111111111111111', 'john.doe@email.com', 'John Doe', '+1-555-0102', 'tenant', true),
    ('a0000000-0000-0000-0000-000000000004', 'Sol2TenantAddress2222222222222222222222', 'jane.smith@email.com', 'Jane Smith', '+1-555-0103', 'tenant', true),
    ('a0000000-0000-0000-0000-000000000005', 'Sol3TenantAddress3333333333333333333333', 'mike.wilson@email.com', 'Mike Wilson', '+1-555-0104', 'tenant', true),
    ('a0000000-0000-0000-0000-000000000006', 'Sol4TenantAddress4444444444444444444444', 'emma.davis@email.com', 'Emma Davis', '+1-555-0105', 'tenant', true),
    ('a0000000-0000-0000-0000-000000000007', 'Sol5TenantAddress5555555555555555555555', 'robert.brown@email.com', 'Robert Brown', '+1-555-0106', 'tenant', true),
    ('a0000000-0000-0000-0000-000000000008', 'Sol6TenantAddress6666666666666666666666', 'lisa.martinez@email.com', 'Lisa Martinez', '+1-555-0107', 'tenant', true),
    ('a0000000-0000-0000-0000-000000000009', 'Sol7TenantAddress7777777777777777777777', 'david.garcia@email.com', 'David Garcia', '+1-555-0108', 'tenant', true),
    ('a0000000-0000-0000-0000-000000000010', 'Sol8TenantAddress8888888888888888888888', 'sophia.lee@email.com', 'Sophia Lee', '+1-555-0109', 'tenant', true)
ON CONFLICT (id) DO NOTHING;

-- Insert 12 properties
INSERT INTO properties (id, owner_id, title, description, property_type, address, city, state, zip_code, monthly_rent_usdc, security_deposit_usdc, bedrooms, bathrooms, square_feet, amenities, is_active) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Modern Downtown Apartment', 'Luxurious 2BR apartment with stunning city views, modern appliances, and concierge service', 'apartment', '123 Main Street, Apt 5B', 'San Francisco', 'CA', '94102', 2500.00, 5000.00, 2, 2.0, 1200, '["parking", "gym", "pool", "concierge", "pet_friendly"]'::jsonb, true),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Cozy Studio Near University', 'Perfect for students! Walking distance to campus, utilities included', 'studio', '456 College Ave, Unit 12', 'Berkeley', 'CA', '94704', 1500.00, 3000.00, 0, 1.0, 500, '["wifi", "utilities_included", "laundry"]'::jsonb, true),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Luxury 3BR House with Garden', 'Spacious family home with private garden, garage, and modern kitchen', 'house', '789 Oak Street', 'Palo Alto', 'CA', '94301', 4500.00, 9000.00, 3, 2.5, 2000, '["garden", "garage", "fireplace", "hardwood_floors"]'::jsonb, true),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Executive Condo in Financial District', 'High-rise condo with panoramic views, 24/7 security, rooftop terrace', 'condo', '234 Market Street, Floor 25', 'San Francisco', 'CA', '94105', 3800.00, 7600.00, 2, 2.0, 1400, '["doorman", "rooftop", "gym", "business_center"]'::jsonb, true),
    ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Charming Victorian 2BR', 'Historic Victorian with original details, updated kitchen, close to BART', 'apartment', '567 Castro Street', 'San Francisco', 'CA', '94114', 2800.00, 5600.00, 2, 1.0, 1100, '["historic", "hardwood", "updated_kitchen"]'::jsonb, true),
    ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Waterfront Loft', 'Industrial-chic loft with exposed brick, high ceilings, water views', 'apartment', '890 Embarcadero', 'San Francisco', 'CA', '94111', 3200.00, 6400.00, 1, 1.5, 1300, '["waterfront", "exposed_brick", "high_ceilings", "parking"]'::jsonb, true),
    ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Family Home in Suburbs', 'Quiet neighborhood, excellent schools, large backyard', 'house', '345 Maple Drive', 'San Mateo', 'CA', '94403', 3500.00, 7000.00, 4, 3.0, 2200, '["backyard", "garage", "new_appliances", "ac"]'::jsonb, true),
    ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Tech Professional Studio', 'Furnished studio in tech hub, high-speed internet, co-working space', 'studio', '678 University Ave', 'Palo Alto', 'CA', '94301', 2200.00, 4400.00, 0, 1.0, 600, '["furnished", "coworking", "highspeed_internet"]'::jsonb, true),
    ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Penthouse Suite', 'Luxury penthouse, private elevator, wraparound terrace', 'apartment', '901 California Street, PH', 'San Francisco', 'CA', '94108', 6500.00, 13000.00, 3, 3.0, 2500, '["penthouse", "terrace", "private_elevator", "views"]'::jsonb, true),
    ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Artist Loft in SOMA', 'Creative space with natural light, exposed beams, art district', 'apartment', '123 Folsom Street', 'San Francisco', 'CA', '94103', 2600.00, 5200.00, 1, 1.0, 900, '["natural_light", "art_district", "open_plan"]'::jsonb, true),
    ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'Beachside Cottage', 'Steps from the beach, coastal living, pet-friendly', 'house', '456 Ocean Boulevard', 'Pacifica', 'CA', '94044', 3300.00, 6600.00, 2, 2.0, 1400, '["beachfront", "pet_friendly", "deck"]'::jsonb, true),
    ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'Modern 1BR Near Transit', 'Brand new building, walk to BART, in-unit laundry', 'apartment', '789 Mission Street', 'San Francisco', 'CA', '94103', 2400.00, 4800.00, 1, 1.0, 750, '["new_building", "transit", "in_unit_laundry"]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

-- Insert 8 active leases
INSERT INTO leases (id, property_id, tenant_id, start_date, end_date, monthly_rent_usdc, security_deposit_usdc, rent_due_day, status, total_paid_usdc, last_payment_date) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', '2024-07-01', '2025-07-01', 2500.00, 5000.00, 1, 'active', 10000.00, '2025-10-01'),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', '2024-09-01', '2025-09-01', 1500.00, 3000.00, 5, 'active', 3000.00, '2025-10-05'),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', '2024-08-15', '2025-08-15', 3800.00, 7600.00, 15, 'active', 7600.00, '2025-09-15'),
    ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006', '2024-10-01', '2025-10-01', 2800.00, 5600.00, 1, 'active', 2800.00, '2025-10-01'),
    ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000007', '2024-06-01', '2025-06-01', 3200.00, 6400.00, 1, 'active', 16000.00, '2025-10-01'),
    ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000008', '2024-07-15', '2025-07-15', 3500.00, 7000.00, 15, 'active', 10500.00, '2025-09-15'),
    ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000009', '2024-09-01', '2025-09-01', 2600.00, 5200.00, 1, 'active', 5200.00, '2025-10-01'),
    ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000010', '2024-08-01', '2025-08-01', 2400.00, 4800.00, 1, 'active', 7200.00, '2025-10-01')
ON CONFLICT (id) DO NOTHING;

-- Insert rent payment history (20 payments)
INSERT INTO rent_payments (lease_id, tenant_id, amount_usdc, payment_date, due_date, status, transaction_hash, blockchain_network) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 2500.00, '2025-10-01 09:15:00', '2025-10-01', 'completed', '4Xv2GpYzK8mN5jTqH9wL3rPbV1sC7aF6dE8uR9tY2hJ', 'solana'),
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 2500.00, '2025-09-01 10:30:00', '2025-09-01', 'completed', '7Bw3HpZzL9nO6kUrJ0xM4sSdW2tD8bG7eF9vS0uZ3iK', 'solana'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 1500.00, '2025-10-05 14:20:00', '2025-10-05', 'completed', '2Cy4IqAaM0oP7lVsK1yN5uTeX3uE9cH8fG0wT1vA4jL', 'solana'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 1500.00, '2025-09-05 11:45:00', '2025-09-05', 'completed', '5Dz5JrBbN1pQ8mWtL2zO6vUfY4vF0dI9gH1xU2wB5kM', 'solana'),
    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 3800.00, '2025-09-15 08:00:00', '2025-09-15', 'completed', '8Ea6KsCcO2qR9nXuM3aP7wVgZ5wG1eJ0hI2yV3xC6lN', 'solana'),
    ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', 2800.00, '2025-10-01 07:30:00', '2025-10-01', 'completed', '1Fb7LtDdP3rS0oYvN4bQ8xWhA6xH2fK1iJ3zW4yD7mO', 'solana'),
    ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000007', 3200.00, '2025-10-01 06:45:00', '2025-10-01', 'completed', '4Gc8MuEeQ4sT1pZwO5cR9yXiB7yI3gL2jK4aX5zE8nP', 'solana'),
    ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000007', 3200.00, '2025-09-01 09:00:00', '2025-09-01', 'completed', '7Hd9NvFfR5tU2qaP6dS0zYjC8zJ4hM3kL5bY6aF9oQ', 'solana'),
    ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000008', 3500.00, '2025-09-15 12:15:00', '2025-09-15', 'completed', '0Ie0OwGgS6uV3rbQ7eT1aZkD9aK5iN4lM6cZ7bG0pR', 'solana'),
    ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000009', 2600.00, '2025-10-01 13:30:00', '2025-10-01', 'completed', '3Jf1PxHhT7vW4scR8fU2bAlE0bL6jO5mN7dA8cH1qS', 'solana'),
    ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000009', 2600.00, '2025-09-01 10:00:00', '2025-09-01', 'completed', '6Kg2QyIiU8wX5tdS9gV3cBmF1cM7kP6nO8eB9dI2rT', 'solana'),
    ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000010', 2400.00, '2025-10-01 15:45:00', '2025-10-01', 'completed', '9Lh3RzJjV9xY6ueT0hW4dCnG2dN8lQ7oP9fC0eJ3sU', 'solana'),
    ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000010', 2400.00, '2025-09-01 11:20:00', '2025-09-01', 'completed', '2Mi4SaKkW0yZ7vfU1iX5eDo3eO9mR8pQ0gD1fK4tV', 'solana')
ON CONFLICT DO NOTHING;

-- Insert maintenance requests (10 requests with varying statuses)
INSERT INTO maintenance_requests (id, property_id, requested_by, title, description, category, priority, status, estimated_cost_usdc, approved_amount_usdc, ai_priority_score) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Leaking Kitchen Faucet', 'Kitchen faucet dripping continuously, wasting water', 'plumbing', 'medium', 'approved', 150.00, 150.00, 0.65),
    ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'AC Not Cooling', 'Air conditioning running but not cooling effectively', 'hvac', 'high', 'pending', 450.00, NULL, 0.85),
    ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Light Fixture Repair', 'Bedroom light fixture not working', 'electrical', 'low', 'completed', 80.00, 80.00, 0.35),
    ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006', 'Dishwasher Malfunction', 'Dishwasher not draining properly', 'appliance', 'medium', 'in_progress', 220.00, 220.00, 0.55),
    ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000008', 'Roof Leak', 'Water stain appearing on ceiling after rain', 'structural', 'emergency', 'pending', 850.00, NULL, 0.95),
    ('d0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'Garbage Disposal Jammed', 'Kitchen garbage disposal making loud noise and not working', 'appliance', 'medium', 'approved', 180.00, 180.00, 0.60),
    ('d0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000007', 'Window Lock Broken', 'Bedroom window lock not securing properly', 'other', 'high', 'pending', 95.00, NULL, 0.70),
    ('d0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000009', 'Toilet Running Constantly', 'Bathroom toilet continuously running, high water bill', 'plumbing', 'medium', 'in_progress', 120.00, 120.00, 0.58),
    ('d0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000010', 'Smoke Detector Beeping', 'Smoke detector beeping intermittently', 'other', 'high', 'approved', 50.00, 50.00, 0.75),
    ('d0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000008', 'Fence Repair Needed', 'Back fence section damaged, needs repair', 'structural', 'low', 'completed', 350.00, 350.00, 0.40)
ON CONFLICT (id) DO NOTHING;

-- Insert sample messages
INSERT INTO messages (sender_id, recipient_id, property_id, subject, message_body, message_type, is_read, is_ai_generated) VALUES
    ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Parking Question', 'Hi, is parking included with the rent?', 'in_app', true, false),
    ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Re: Parking Question', 'Yes, one parking spot is included.', 'in_app', false, false),
    ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'Rent Payment Reminder', 'Your rent of $1,500 is due in 3 days.', 'ai_generated', false, true),
    ('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'Lease Renewal', 'I would like to discuss renewing my lease for another year.', 'in_app', true, false),
    ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000006', NULL, 'Maintenance Update', 'Your maintenance request for dishwasher has been approved and scheduled.', 'ai_generated', false, true)
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=================================';
    RAISE NOTICE '✅ Enhanced seed data inserted!';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Users: 10 (1 manager, 1 AI, 8 tenants)';
    RAISE NOTICE 'Properties: 12';
    RAISE NOTICE 'Active Leases: 8';
    RAISE NOTICE 'Rent Payments: 13';
    RAISE NOTICE 'Maintenance Requests: 10';
    RAISE NOTICE 'Messages: 5';
    RAISE NOTICE '=================================';
END $$;
