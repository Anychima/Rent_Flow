-- Migration 012: Add image_url to properties table
-- Purpose: Allow managers to upload custom property images
-- Date: 2025-10-24

BEGIN;

-- Add image_url column to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN properties.image_url IS 'Base64-encoded image or URL for property photo uploaded by manager';

-- Create index for faster queries (optional, useful if filtering by images)
CREATE INDEX IF NOT EXISTS idx_properties_with_images 
ON properties(id) WHERE image_url IS NOT NULL;

COMMIT;

-- Verify migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' 
    AND column_name = 'image_url'
  ) THEN
    RAISE NOTICE '✅ image_url column added to properties table';
  ELSE
    RAISE EXCEPTION '❌ Failed to add image_url column';
  END IF;

  RAISE NOTICE '✅ MIGRATION 012 COMPLETE!';
  RAISE NOTICE 'Managers can now upload custom property images';
END $$;
