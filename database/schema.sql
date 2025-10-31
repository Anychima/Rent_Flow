-- RentFlow AI Database Schema for Supabase
-- PostgreSQL Schema for Property Management Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (Property Managers, Tenants, AI Agents)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    user_type TEXT NOT NULL CHECK (user_type IN ('property_manager', 'tenant', 'ai_agent')),
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Properties Table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blockchain_property_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    property_type TEXT CHECK (property_type IN ('apartment', 'house', 'condo', 'studio', 'commercial')),
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'USA',
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    square_feet INTEGER,
    monthly_rent_usdc DECIMAL(20,6) NOT NULL,
    security_deposit_usdc DECIMAL(20,6) NOT NULL,
    amenities JSONB DEFAULT '[]',
    images JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    blockchain_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leases Table
CREATE TABLE IF NOT EXISTS leases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blockchain_lease_id INTEGER UNIQUE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent_usdc DECIMAL(20,6) NOT NULL,
    security_deposit_usdc DECIMAL(20,6) NOT NULL,
    rent_due_day INTEGER CHECK (rent_due_day BETWEEN 1 AND 28),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'terminated', 'completed')),
    total_paid_usdc DECIMAL(20,6) DEFAULT 0,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    lease_terms JSONB,
    blockchain_status TEXT DEFAULT 'off-chain',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rent Payments Table
CREATE TABLE IF NOT EXISTS rent_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES users(id),
    amount_usdc DECIMAL(20,6) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'late')),
    transaction_hash TEXT,
    blockchain_network TEXT DEFAULT 'solana',
    late_fee_usdc DECIMAL(20,6) DEFAULT 0,
    notes TEXT,
    payment_type TEXT DEFAULT 'rent' CHECK (payment_type IN ('rent', 'security_deposit', 'late_fee', 'other')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Micropayments Table (for content creator features)
CREATE TABLE IF NOT EXISTS micropayments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    amount_usdc DECIMAL(20,6) NOT NULL,
    purpose TEXT NOT NULL,
    transaction_hash TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    blockchain_network TEXT DEFAULT 'solana',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance Requests Table
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blockchain_request_id INTEGER UNIQUE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT CHECK (category IN ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'other')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'rejected')),
    estimated_cost_usdc DECIMAL(20,6),
    approved_amount_usdc DECIMAL(20,6),
    actual_cost_usdc DECIMAL(20,6),
    contractor_name TEXT,
    contractor_contact TEXT,
    ai_analysis JSONB,
    ai_priority_score DECIMAL(3,2),
    images JSONB DEFAULT '[]',
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communications/Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id),
    recipient_id UUID REFERENCES users(id),
    property_id UUID REFERENCES properties(id),
    lease_id UUID REFERENCES leases(id),
    maintenance_request_id UUID REFERENCES maintenance_requests(id),
    subject TEXT,
    message_body TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('email', 'sms', 'in_app', 'ai_generated')),
    is_read BOOLEAN DEFAULT FALSE,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Analysis Cache Table
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('maintenance_request', 'property_description', 'tenant_screening', 'message')),
    entity_id UUID NOT NULL,
    analysis_type TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    model_used TEXT,
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Voice Notifications Table (ElevenLabs)
CREATE TABLE IF NOT EXISTS voice_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    notification_type TEXT,
    text_content TEXT NOT NULL,
    audio_url TEXT,
    voice_id TEXT,
    duration_seconds INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'sent', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blockchain Sync Log Table
CREATE TABLE IF NOT EXISTS blockchain_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    entity_id UUID,
    blockchain_id INTEGER,
    transaction_signature TEXT,
    event_type TEXT NOT NULL,
    event_data JSONB,
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_properties_owner ON properties(owner_id);
CREATE INDEX idx_properties_active ON properties(is_active);
CREATE INDEX idx_leases_property ON leases(property_id);
CREATE INDEX idx_leases_tenant ON leases(tenant_id);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_rent_payments_lease ON rent_payments(lease_id);
CREATE INDEX idx_rent_payments_due_date ON rent_payments(due_date);
CREATE INDEX idx_micropayments_from_user ON micropayments(from_user_id);
CREATE INDEX idx_micropayments_to_user ON micropayments(to_user_id);
CREATE INDEX idx_maintenance_property ON maintenance_requests(property_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_ai_cache_entity ON ai_analysis_cache(entity_type, entity_id);
CREATE INDEX idx_blockchain_sync_entity ON blockchain_sync_log(entity_type, entity_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON leases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tenant Reviews/Ratings Table
CREATE TABLE IF NOT EXISTS tenant_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id), -- Property manager reviewing tenant
    tenant_id UUID REFERENCES users(id), -- Tenant being reviewed
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    review_type TEXT DEFAULT 'post_tenancy' CHECK (review_type IN ('during_tenancy', 'post_tenancy', 'property_manager')), 
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for tenant reviews
CREATE INDEX idx_tenant_reviews_lease ON tenant_reviews(lease_id);
CREATE INDEX idx_tenant_reviews_tenant ON tenant_reviews(tenant_id);
CREATE INDEX idx_tenant_reviews_reviewer ON tenant_reviews(reviewer_id);
CREATE INDEX idx_tenant_reviews_rating ON tenant_reviews(rating);

-- Add trigger for tenant reviews updated_at
CREATE TRIGGER update_tenant_reviews_updated_at BEFORE UPDATE ON tenant_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();