-- Seed Data for RentFlow AI
-- Sample data for testing and development

-- Insert sample users
INSERT INTO users (id, wallet_address, email, full_name, phone, user_type) VALUES
    ('a0000000-0000-0000-0000-000000000001', '8kr6b3uuYx4MgvY8BW9ETogd3cc5ibTj3g8oVZCkKyiz', 'deployer@rentflow.ai', 'Property Manager', '+1-555-0101', 'property_manager'),
    ('a0000000-0000-0000-0000-000000000002', 'CqQT3otUUcvpvsUCkWzfebanHZeGqKEJprjw5NPLwx4m', 'ai@rentflow.ai', 'RentFlow AI Agent', NULL, 'ai_agent'),
    ('a0000000-0000-0000-0000-000000000003', '4Ugn6vamVywNM8iPSKDXPTVnmhjF6v8P45HtEu4PwfLV', 'john.doe@email.com', 'John Doe', '+1-555-0102', 'tenant'),
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
     2500.000000,
     5000.000000,
     2,
     2.5,
     1200,
     '["gym", "pool", "parking", "laundry"]',
     true
    ),
    ('b0000000-0000-0000-0000-000000000002',
     'a0000000-0000-0000-0000-000000000001',
     'Cozy Studio Near University',
     'Compact and efficient studio apartment perfect for students or young professionals. Close to public transportation and campus.',
     'studio',
     '456 College Ave, Unit 304',
     'Berkeley',
     'CA',
     '94702',
     1500.000000,
     2000.000000,
     0,
     1.0,
     450,
     '["laundry", "bike_storage"]',
     true
    )
ON CONFLICT (id) DO NOTHING;

-- Insert sample leases
INSERT INTO leases (id, property_id, tenant_id, start_date, end_date, monthly_rent_usdc, security_deposit_usdc, rent_due_day, status) VALUES
    ('c0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000003',
     '2024-01-01',
     '2025-01-01',
     2500.000000,
     5000.000000,
     1,
     'active'
    ),
    ('c0000000-0000-0000-0000-000000000002',
     'b0000000-0000-0000-0000-000000000002',
     'a0000000-0000-0000-0000-000000000004',
     '2024-02-01',
     '2025-02-01',
     1500.000000,
     2000.000000,
     5,
     'active'
    )
ON CONFLICT (id) DO NOTHING;

-- Insert sample maintenance requests
INSERT INTO maintenance_requests (id, property_id, requested_by, title, description, category, priority, status, estimated_cost_usdc) VALUES
    ('d0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000003',
     'Leaky Faucet',
     'Kitchen sink faucet is leaking when turned on. Water is dripping continuously.',
     'plumbing',
     'medium',
     'completed',
     75.000000
    ),
    ('d0000000-0000-0000-0000-000000000002',
     'b0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000003',
     'AC Not Cooling',
     'Air conditioning unit is not cooling properly. Warm air coming out.',
     'hvac',
     'high',
     'in_progress',
     300.000000
    )
ON CONFLICT (id) DO NOTHING;

-- Insert sample payments
INSERT INTO rent_payments (id, lease_id, tenant_id, amount_usdc, payment_date, due_date, status, payment_type) VALUES
    ('e0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000003',
     2500.000000,
     '2024-01-01',
     '2024-01-01',
     'completed',
     'rent'
    ),
    ('e0000000-0000-0000-0000-000000000002',
     'c0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000003',
     2500.000000,
     '2024-02-01',
     '2024-02-01',
     'completed',
     'rent'
    )
ON CONFLICT (id) DO NOTHING;