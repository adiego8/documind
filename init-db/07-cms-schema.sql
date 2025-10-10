-- CMS Database Schema
-- This file creates the content management system tables

-- Articles table
CREATE TABLE IF NOT EXISTS cms_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_code_id UUID NOT NULL REFERENCES admin_codes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    seo_title VARCHAR(255),
    meta_description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Add search indexes
    CONSTRAINT cms_articles_title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT cms_articles_content_not_empty CHECK (length(trim(content)) > 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cms_articles_admin_code_id ON cms_articles(admin_code_id);
CREATE INDEX IF NOT EXISTS idx_cms_articles_status ON cms_articles(status);
CREATE INDEX IF NOT EXISTS idx_cms_articles_slug ON cms_articles(slug);
CREATE INDEX IF NOT EXISTS idx_cms_articles_published_at ON cms_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_cms_articles_tags ON cms_articles USING GIN(tags);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_cms_articles_search ON cms_articles USING GIN(
    to_tsvector('english', title || ' ' || COALESCE(excerpt, '') || ' ' || content)
);

-- Article analytics table
CREATE TABLE IF NOT EXISTS cms_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES cms_articles(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    avg_time_on_page INTERVAL,
    bounce_rate DECIMAL(5,2),
    date DATE DEFAULT CURRENT_DATE,
    
    -- Ensure one record per article per day
    UNIQUE(article_id, date)
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_cms_analytics_article_id ON cms_analytics(article_id);
CREATE INDEX IF NOT EXISTS idx_cms_analytics_date ON cms_analytics(date);

-- Article categories table (optional, for future use)
CREATE TABLE IF NOT EXISTS cms_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_code_id UUID NOT NULL REFERENCES admin_codes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(admin_code_id, slug)
);

-- Article-category junction table
CREATE TABLE IF NOT EXISTS cms_article_categories (
    article_id UUID REFERENCES cms_articles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES cms_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, category_id)
);

-- Function to auto-generate slug from title
CREATE OR REPLACE FUNCTION generate_article_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate slug from title if not provided
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := lower(regexp_replace(
            regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'),
            '\s+', '-', 'g'
        ));
        
        -- Ensure uniqueness by appending number if needed
        DECLARE
            counter INTEGER := 1;
            base_slug TEXT := NEW.slug;
        BEGIN
            WHILE EXISTS (SELECT 1 FROM cms_articles WHERE slug = NEW.slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)) LOOP
                NEW.slug := base_slug || '-' || counter;
                counter := counter + 1;
            END LOOP;
        END;
    END IF;
    
    -- Update published_at when status changes to published
    IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status != 'published') THEN
        NEW.published_at := NOW();
    END IF;
    
    -- Update updated_at
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-slug generation
DROP TRIGGER IF EXISTS cms_articles_slug_trigger ON cms_articles;
CREATE TRIGGER cms_articles_slug_trigger
    BEFORE INSERT OR UPDATE ON cms_articles
    FOR EACH ROW
    EXECUTE FUNCTION generate_article_slug();

-- Function to update analytics
CREATE OR REPLACE FUNCTION update_article_analytics(
    p_article_id UUID,
    p_is_unique_visitor BOOLEAN DEFAULT TRUE
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO cms_analytics (article_id, views, unique_visitors, date)
    VALUES (p_article_id, 1, CASE WHEN p_is_unique_visitor THEN 1 ELSE 0 END, CURRENT_DATE)
    ON CONFLICT (article_id, date)
    DO UPDATE SET
        views = cms_analytics.views + 1,
        unique_visitors = cms_analytics.unique_visitors + CASE WHEN p_is_unique_visitor THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample categories for testing
INSERT INTO cms_categories (admin_code_id, name, slug, description)
SELECT 
    ac.id,
    category_name,
    lower(regexp_replace(category_name, '\s+', '-', 'g')),
    'Sample category for ' || category_name
FROM admin_codes ac,
     (VALUES 
        ('Technology'),
        ('Business'),
        ('Productivity'),
        ('AI & Machine Learning'),
        ('Documentation')
     ) AS categories(category_name)
ON CONFLICT (admin_code_id, slug) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE cms_articles IS 'Content management system articles with multi-tenant support';
COMMENT ON TABLE cms_analytics IS 'Article view analytics and engagement metrics';
COMMENT ON TABLE cms_categories IS 'Article categories for organization and filtering';
COMMENT ON COLUMN cms_articles.admin_code_id IS 'Links article to specific admin/tenant';
COMMENT ON COLUMN cms_articles.slug IS 'URL-friendly identifier, auto-generated from title';
COMMENT ON COLUMN cms_articles.tags IS 'JSON array of tags for categorization and search';
COMMENT ON COLUMN cms_articles.status IS 'Article publication status: draft, published, or archived';