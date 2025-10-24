-- Migration 012: Add image_urls to properties table (Multiple Images Support)
-- Purpose: Allow managers to upload multiple custom property images
-- Date: 2025-10-24

BEGIN;

-- Add image_urls column to properties table (JSONB array for multiple images)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN properties.image_urls IS 'Array of base64-encoded images or URLs for property photos uploaded by manager (max 5 images)';

-- Create index for faster queries on properties with images
CREATE INDEX IF NOT EXISTS idx_properties_with_images 
ON properties USING GIN (image_urls) WHERE image_urls != '[]'::jsonb;

COMMIT;

-- Verify migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' 
    AND column_name = 'image_urls'
  ) THEN
    RAISE NOTICE '✅ image_urls column added to properties table';
  ELSE
    RAISE EXCEPTION '❌ Failed to add image_urls column';
  END IF;

  RAISE NOTICE '✅ MIGRATION 012 COMPLETE!';
  RAISE NOTICE 'Managers can now upload up to 5 property images';
  RAISE NOTICE 'Images are automatically compressed and resized for optimal performance';
END $$;
