-- (Previous content omitted due to accidental overwrite)

-- Migration: Add full-text search to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search_vector
CREATE OR REPLACE FUNCTION update_product_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.generic_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.company, coalesce(NEW.manufacturer, ''))), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search_vector
DROP TRIGGER IF EXISTS tr_product_search_vector ON products;
CREATE TRIGGER tr_product_search_vector
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- Create GIN index on search_vector
CREATE INDEX IF NOT EXISTS products_search_vector_idx ON products USING GIN (search_vector);
