-- Migration 005: Add Micropayments Table
-- This migration adds support for micropayments for content creator features

-- Create micropayments table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_micropayments_from_user ON micropayments(from_user_id);
CREATE INDEX IF NOT EXISTS idx_micropayments_to_user ON micropayments(to_user_id);

-- Add a comment to describe the table
COMMENT ON TABLE micropayments IS 'Table for storing micropayments between users for content creator features';