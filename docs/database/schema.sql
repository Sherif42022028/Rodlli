-- ============================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone_number TEXT,
    avatar_url TEXT,
    account_type TEXT CHECK (account_type IN ('merchant', 'buyer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. MERCHANTS
-- ============================================
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_category TEXT NOT NULL,
    short_description TEXT,
    store_address TEXT,
    business_phone TEXT,
    website_url TEXT,
    chatbot_link TEXT UNIQUE, -- /merchant/slug
    slug TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10,2),
    description TEXT,
    image_urls TEXT[],
    catalog_file_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. WORKING_HOURS
-- ============================================
CREATE TABLE IF NOT EXISTS working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT false
);

-- ============================================
-- 5. FAQS
-- ============================================
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    order_index INTEGER DEFAULT 0
);

-- ============================================
-- 6. CHATBOT_RESPONSES (Rule-based)
-- ============================================
CREATE TABLE IF NOT EXISTS chatbot_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    trigger_keywords TEXT[], -- ['menu', 'today', 'price']
    response_text_en TEXT NOT NULL,
    response_text_ar TEXT,
    response_type TEXT CHECK (response_type IN ('text', 'products', 'hours', 'faq', 'link')),
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0
);

-- ============================================
-- 7. CONVERSATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES profiles(id),
    buyer_session_id TEXT, -- for anonymous buyers
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type TEXT CHECK (sender_type IN ('bot', 'buyer', 'merchant')),
    content TEXT NOT NULL,
    content_ar TEXT, -- translated version
    quick_replies JSONB, -- [{text: "See Menu", action: "show_menu"}]
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. ANALYTICS
-- ============================================
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    metric_type TEXT CHECK (metric_type IN ('conversation', 'message', 'product_view', 'link_click')),
    value INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    icon TEXT,
    store_count INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0
);

-- ============================================
-- 11. TRENDING_STORES
-- ============================================
CREATE TABLE IF NOT EXISTS trending_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    rank_position INTEGER,
    is_online BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- Merchants: Public read, owner write
CREATE POLICY "Merchants public read"
    ON merchants FOR SELECT USING (true);

CREATE POLICY "Merchants owner write"
    ON merchants FOR ALL USING (auth.uid() = profile_id);

-- Messages: Participants only
CREATE POLICY "Messages participants"
    ON messages FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.buyer_id = auth.uid() OR c.merchant_id IN (
                SELECT id FROM merchants WHERE profile_id = auth.uid()
            ))
        )
    );
