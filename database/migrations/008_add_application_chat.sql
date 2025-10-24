-- Migration: Add Application Chat Support
-- This adds support for messaging between landlord and prospective tenants during the application review process

-- Add application_id to messages table for pre-lease communication
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES property_applications(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_application ON messages(application_id);

-- Add comment for documentation
COMMENT ON COLUMN messages.application_id IS 'Reference to application for pre-lease landlord-applicant communication';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;
