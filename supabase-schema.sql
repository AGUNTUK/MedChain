-- ============================================================================
-- MEDICHAIN PRODUCTION DATABASE SCHEMA FOR SUPABASE
-- ============================================================================
-- This SQL script sets up the complete, production-ready PostgreSQL relational
-- database for the MediChain B2B Pharma Procurement platform.
-- It includes Tables, Relationships, Primary/Foreign keys, Advanced Indexes, 
-- Row Level Security (RLS) planning, and automatic update triggers.
-- ============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom enum types for User Roles and Statuses
CREATE TYPE user_role AS ENUM ('pharmacy', 'admin', 'depot_staff', 'delivery');
CREATE TYPE order_status AS ENUM ('Confirmed', 'Processing', 'Packed', 'Out for Delivery', 'Delivered');
CREATE TYPE payment_method AS ENUM ('Cash on Delivery', 'bKash', 'Nagad');
CREATE TYPE payment_status AS ENUM ('Pending', 'Paid', 'Failed', 'Refunded');
CREATE TYPE return_status AS ENUM ('None', 'Pending', 'Approved', 'Rejected');
CREATE TYPE prescription_status AS ENUM ('Processing', 'Completed', 'Failed');

-- ==========================================
-- 1. USERS & ROLES TABLE
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'pharmacy',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. PHARMACIES TABLE
-- ==========================================
CREATE TABLE pharmacies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    pharmacy_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    license_information TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. CATEGORIES TABLE
-- ==========================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. PRODUCTS TABLE
-- ==========================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    category_name_fallback VARCHAR(100) NOT NULL, -- "Tablet", "Capsule", etc. for fallback
    strength VARCHAR(100) NOT NULL,
    pack_size VARCHAR(100) NOT NULL,
    mrp DECIMAL(12, 2) NOT NULL CHECK (mrp >= 0),
    selling_price DECIMAL(12, 2) NOT NULL CHECK (selling_price >= 0),
    discount_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (ROUND((1.0 - (selling_price / mrp)) * 100.0, 2)) STORED,
    stock_status VARCHAR(50) DEFAULT 'In Stock',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_selling_price_mrp CHECK (selling_price <= mrp)
);

-- ==========================================
-- 5. INVENTORY TABLE (FEFO Optimized)
-- ==========================================
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    available_stock INTEGER NOT NULL DEFAULT 0 CHECK (available_stock >= 0),
    reserved_stock INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
    sold_stock INTEGER NOT NULL DEFAULT 0 CHECK (sold_stock >= 0),
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. SUPPLIERS TABLE
-- ==========================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. PRODUCT SUPPLIERS TABLE (M:N relationship)
-- ==========================================
CREATE TABLE product_suppliers (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    purchase_price DECIMAL(12, 2) NOT NULL CHECK (purchase_price >= 0),
    available_qty INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, supplier_id)
);

-- ==========================================
-- 8. CREDIT ACCOUNTS TABLE (B2B Credit Lines)
-- ==========================================
CREATE TABLE credit_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID UNIQUE REFERENCES pharmacies(id) ON DELETE CASCADE,
    credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 100000.00 CHECK (credit_limit >= 0),
    used_credit DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (used_credit >= 0),
    available_credit DECIMAL(12, 2) GENERATED ALWAYS AS (credit_limit - used_credit) STORED,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 9. ORDERS TABLE
-- ==========================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    status order_status NOT NULL DEFAULT 'Confirmed',
    payment_method payment_method NOT NULL DEFAULT 'Cash on Delivery',
    payment_status payment_status NOT NULL DEFAULT 'Pending',
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
    total_savings DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_mrp DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    has_return_requested BOOLEAN DEFAULT FALSE,
    return_reason TEXT,
    return_status return_status DEFAULT 'None'
);

-- ==========================================
-- 10. ORDER ITEMS TABLE
-- ==========================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    subtotal DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * price) STORED
);

-- ==========================================
-- 11. INVOICES TABLE
-- ==========================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    issued_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE,
    amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    amount_due DECIMAL(12, 2) NOT NULL
);

-- ==========================================
-- 12. PAYMENTS TABLE
-- ==========================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    payment_method payment_method NOT NULL,
    transaction_reference VARCHAR(255),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_status payment_status NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 13. FAVOURITES TABLE
-- ==========================================
CREATE TABLE favourites (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, product_id)
);

-- ==========================================
-- 14. NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL means broadcast
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'offer', 'order', 'price_drop', 'system'
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 15. PRESCRIPTIONS TABLE (Optical OCR uploads)
-- ==========================================
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    extracted_text TEXT,
    status prescription_status NOT NULL DEFAULT 'Processing',
    items_matched JSONB, -- list of matched products & confidence values
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 16. RETURNS TABLE
-- ==========================================
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT NOT NULL,
    status return_status NOT NULL DEFAULT 'Pending',
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- DB INDEXES (Optimization & Rapid Query Performance)
-- ============================================================================
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name_generic ON products(name, generic_name);
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_expiry ON inventory(expiry_date); -- Critical for FEFO queries
CREATE INDEX idx_orders_pharmacy ON orders(pharmacy_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read = FALSE;


-- ============================================================================
-- AUTOMATIC TIMESTAMP UPDATERS (PL/pgSQL triggers)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_pharmacies_modtime BEFORE UPDATE ON pharmacies FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_inventory_modtime BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_modified_column();


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- 1. Users Policies:
-- Users can read their own user profile; Admins can read all.
CREATE POLICY "Users can view own data" ON users 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view and manage all users" ON users 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- 2. Pharmacies Policies:
-- Pharmacy owners can read/update their own profile.
CREATE POLICY "Pharmacies can view own profile" ON pharmacies 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Pharmacies can update own profile" ON pharmacies 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins have full access on pharmacies" ON pharmacies 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- 3. Credit Accounts Policies:
-- Read-only for pharmacy owners, complete management for admins.
CREATE POLICY "Pharmacies can view own credit account" ON credit_accounts 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pharmacies 
            WHERE pharmacies.id = credit_accounts.pharmacy_id AND pharmacies.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can update credit lines" ON credit_accounts 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- 4. Orders Policies:
-- Pharmacies can read/create their own orders. Admins/Depot/Delivery can view all.
CREATE POLICY "Pharmacies can view own orders" ON orders 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pharmacies 
            WHERE pharmacies.id = orders.pharmacy_id AND pharmacies.user_id = auth.uid()
        )
    );

CREATE POLICY "Pharmacies can insert own orders" ON orders 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pharmacies 
            WHERE pharmacies.id = orders.pharmacy_id AND pharmacies.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff/Admins can view all orders" ON orders 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.role IN ('admin', 'depot_staff', 'delivery')
        )
    );

-- 5. Order Items Policies:
CREATE POLICY "Pharmacies can view own order items" ON order_items 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            JOIN pharmacies ON orders.pharmacy_id = pharmacies.id
            WHERE order_items.order_id = orders.id AND pharmacies.user_id = auth.uid()
        )
    );

-- 6. Notifications Policies:
-- Users can see general broadcasts or targeted notifications.
CREATE POLICY "Users can view relevant notifications" ON notifications 
    FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
