-- Add type column to generations table for distinguishing images from videos
ALTER TABLE generations ADD COLUMN type TEXT DEFAULT 'image';

-- Add check constraint for valid types
ALTER TABLE generations ADD CONSTRAINT generations_type_check
  CHECK (type IN ('image', 'video'));
