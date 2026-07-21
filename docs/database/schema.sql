-- ============================================
-- 1. PROFILES (Stores NextAuth users & type information)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Hashed password
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
    bot_avatar_url TEXT, -- Bot icon image URL
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    onboarding_step INTEGER DEFAULT 1,
    google_sheet_id TEXT,
    google_refresh_token TEXT, -- Encrypted refresh token
    sheet_sync_enabled BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    last_sync_status TEXT, -- 'success' | 'error' | 'pending'
    last_sync_error TEXT,
    orders_sheet_id TEXT,
    orders_last_synced_at TIMESTAMPTZ,
    orders_sync_enabled BOOLEAN DEFAULT false,
    orders_last_sync_status TEXT,
    orders_last_sync_error TEXT,
    widget_primary_color TEXT DEFAULT '#F26B1D',
    widget_bubble_text_color TEXT DEFAULT '#FFFFFF',
    show_powered_by BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 16. ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    order_id_external TEXT NOT NULL,
    customer_name TEXT,
    product_name TEXT,
    status TEXT CHECK (status IN ('PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED')) DEFAULT 'PENDING',
    expected_date TEXT,
    notes TEXT,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_merchant_order UNIQUE (merchant_id, order_id_external)
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
    product_type TEXT DEFAULT 'physical', -- 'physical' | 'service'
    in_stock BOOLEAN DEFAULT true,
    availability TEXT,
    colors TEXT,
    sizes TEXT,
    category_name TEXT,
    attributes JSONB,
    extra_attributes JSONB DEFAULT '{}'::jsonb,
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
    is_confident BOOLEAN DEFAULT true,
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
-- 12. UNANSWERED_QUESTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS unanswered_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. TOOL_CALL_LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS tool_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    tool_input JSONB,
    matched_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. CONTACT_REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. BUYER_INTERESTS
-- ============================================
CREATE TABLE IF NOT EXISTS buyer_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(buyer_id, category_id)
);
