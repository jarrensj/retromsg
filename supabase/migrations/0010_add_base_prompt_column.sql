-- Add base_prompt column to store the default prompt from settings that was used
ALTER TABLE generations ADD COLUMN IF NOT EXISTS base_prompt TEXT;
