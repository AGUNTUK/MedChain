-- Create hero_slides table
CREATE TABLE public.hero_slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    cta_label VARCHAR(100),
    cta_route VARCHAR(255),
    background_preset VARCHAR(100),
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for hero_slides
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Allow public read access to hero_slides
CREATE POLICY "Allow public read access to hero_slides"
    ON public.hero_slides
    FOR SELECT
    USING (true);

-- Create hero_carousel_settings table for key-value settings
CREATE TABLE public.hero_carousel_settings (
    key VARCHAR(50) PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for hero_carousel_settings
ALTER TABLE public.hero_carousel_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to hero_carousel_settings
CREATE POLICY "Allow public read access to hero_carousel_settings"
    ON public.hero_carousel_settings
    FOR SELECT
    USING (true);

-- Insert a default greeting slide
INSERT INTO public.hero_slides (type, title, subtitle, cta_label, cta_route, background_preset, display_order, is_active)
VALUES (
    'greeting', 
    'Good morning, {pharmacyName}', 
    'Manage your daily inventory', 
    'Browse Catalog', 
    '/search', 
    'purple-lime', 
    1, 
    true
);

-- Insert default auto-advance interval (5 seconds)
INSERT INTO public.hero_carousel_settings (key, value)
VALUES ('auto_advance_interval', '5000');
