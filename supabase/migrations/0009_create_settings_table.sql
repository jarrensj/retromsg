-- Create settings table for storing app configuration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT  -- Email of admin who last updated
);

-- Insert default prompt for image generation
INSERT INTO settings (key, value) VALUES (
  'default_image_prompt',
  'Create a vintage 1940s style photograph. Add authentic film aging effects: random dust particles scattered across the image, subtle film grain texture, light scratches and scuff marks, slightly faded colors with a sepia-warm tone, and a dusty film overlay.'
) ON CONFLICT (key) DO NOTHING;

-- Insert default prompt for video generation
INSERT INTO settings (key, value) VALUES (
  'default_video_prompt',
  'Create a vintage 1940s style video. Add authentic film aging effects: random dust particles floating across the frame, film grain texture, light scratches and scuff marks on the film, slightly faded colors with a sepia-warm tone, and occasional film flicker.'
) ON CONFLICT (key) DO NOTHING;
