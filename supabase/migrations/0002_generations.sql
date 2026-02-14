-- Generations table
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  source_url TEXT,  -- uploaded image/video source (if any)
  result_url TEXT NOT NULL,  -- generated image on AWS S3
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_created_at ON generations(created_at DESC);
