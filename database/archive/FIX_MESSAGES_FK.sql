-- Fix Messages Table Foreign Key Constraints
-- Run this in Supabase SQL Editor to allow messages without user FK constraints

-- Make sender_id and recipient_id nullable
ALTER TABLE messages 
ALTER COLUMN sender_id DROP NOT NULL,
ALTER COLUMN recipient_id DROP NOT NULL;

-- Verify the changes
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('sender_id', 'recipient_id');

-- Success message
SELECT '✅ Messages table updated - sender_id and recipient_id are now nullable!' AS status;
