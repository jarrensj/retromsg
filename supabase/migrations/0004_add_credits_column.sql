-- Add credits column to users table for Stripe payment system
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;

-- Create index for faster credit lookups
CREATE INDEX IF NOT EXISTS idx_users_credits ON users(credits);
