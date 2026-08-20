-- Hero Slides Table
CREATE TABLE IF NOT EXISTS hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'greeting', 'promo', 'announcement', 'reorder_nudge', 'custom'
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_label TEXT,
  cta_route TEXT,
  background_preset TEXT DEFAULT 'purple-lime', -- 'purple-lime', 'purple-dominant', 'lime-dominant'
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Hero Carousel Settings Table
CREATE TABLE IF NOT EXISTS hero_carousel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default greeting slide
INSERT INTO hero_slides (type, title, subtitle, cta_label, cta_route, background_preset, display_order)
VALUES ('greeting', 'Good morning, {pharmacyName}', 'Manage your daily inventory', 'Browse Catalog', '/search', 'purple-lime', 1)
ON CONFLICT DO NOTHING;

-- Insert default interval setting
INSERT INTO hero_carousel_settings (key, value)
VALUES ('auto_advance_interval', '5000'::jsonb)
ON CONFLICT (key) DO NOTHING;
