-- Bulk Deals Campaign Table
CREATE TABLE IF NOT EXISTS bulk_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtext TEXT,
  banner_color TEXT DEFAULT 'bg-brand-purple',
  banner_image_url TEXT,
  cta_text TEXT DEFAULT 'Shop Bulk Deals',
  status TEXT DEFAULT 'Draft', -- 'Draft', 'Live', 'Expired'
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bulk Deals Campaign Products Join Table
CREATE TABLE IF NOT EXISTS bulk_campaign_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES bulk_campaigns(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL, -- references products(id), using TEXT to accommodate UUIDs or custom IDs
  tiers JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. [{"minQty": 5, "discountPercent": 15}, {"minQty": 10, "discountPercent": 25}]
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, product_id)
);
