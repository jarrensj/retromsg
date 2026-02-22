-- Add reference_images column to store all reference images (up to 3)
-- This replaces the single source_url column for new entries
ALTER TABLE generations ADD COLUMN IF NOT EXISTS reference_images JSONB DEFAULT '[]';

-- Migrate existing source_url data to reference_images
UPDATE generations
SET reference_images = jsonb_build_array(source_url)
WHERE source_url IS NOT NULL AND (reference_images IS NULL OR reference_images = '[]');
