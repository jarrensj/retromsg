-- Create admins table
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT -- email of admin who added them, null for seed admins
);

-- Index for email lookups
CREATE INDEX idx_admins_email ON admins(email);

-- Seed initial admins
INSERT INTO admins (email) VALUES
  ('scott@retromsg.com'),
  ('sanjose.jarren@gmail.com');
