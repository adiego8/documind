-- API Keys System for Client Authentication
-- Admin-scoped keys that provide access to all assistants under an admin code

\c ragdb;

-- Create api_keys table for admin-scoped API keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_code_id UUID NOT NULL REFERENCES admin_codes(id) ON DELETE CASCADE,
    
    -- Key identification and security
    key_prefix VARCHAR(8) NOT NULL, -- First 8 chars for identification (e.g., "ak_live_")
    key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of the full key
    
    -- Key metadata
    name VARCHAR(100) NOT NULL, -- Human-readable name for the key
    description TEXT, -- Optional description of key purpose
    
    -- Permissions and limits
    permissions JSONB DEFAULT '{"chat": true, "assistants": "read"}'::jsonb, -- What the key can access
    rate_limit_per_minute INTEGER DEFAULT 60, -- Requests per minute limit
    rate_limit_per_day INTEGER DEFAULT 1000, -- Requests per day limit
    
    -- Lifecycle management
    expires_at TIMESTAMP NULL, -- Optional expiration
    last_used_at TIMESTAMP NULL, -- Track last usage
    is_active BOOLEAN DEFAULT TRUE, -- Enable/disable key
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL -- Who created this key
);

-- Create api_key_usage table for tracking usage and rate limiting
CREATE TABLE IF NOT EXISTS api_key_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Usage tracking
    endpoint VARCHAR(100) NOT NULL, -- Which endpoint was called
    method VARCHAR(10) NOT NULL, -- HTTP method
    status_code INTEGER NOT NULL, -- Response status
    
    -- Rate limiting counters
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_hour INTEGER NOT NULL DEFAULT EXTRACT(HOUR FROM NOW()),
    request_minute INTEGER NOT NULL DEFAULT EXTRACT(MINUTE FROM NOW()),
    
    -- Request metadata
    user_agent TEXT,
    ip_address INET,
    
    -- Timing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_admin_code_id ON api_keys(admin_code_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_id ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_date ON api_key_usage(request_date);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_rate_limit ON api_key_usage(api_key_id, request_date, request_hour);

-- Function to update api_keys updated_at
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for api_keys updated_at
DROP TRIGGER IF EXISTS api_keys_updated_at_trigger ON api_keys;
CREATE TRIGGER api_keys_updated_at_trigger
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_api_keys_updated_at();

-- Function to clean up old usage records (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_usage()
RETURNS void AS $$
BEGIN
    DELETE FROM api_key_usage 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get rate limit status for a key
CREATE OR REPLACE FUNCTION get_api_key_rate_limit_status(
    p_key_hash VARCHAR(64),
    OUT current_minute_requests INTEGER,
    OUT current_day_requests INTEGER,
    OUT minute_limit INTEGER,
    OUT day_limit INTEGER,
    OUT is_rate_limited BOOLEAN
)
AS $$
DECLARE
    key_record RECORD;
    current_hour INTEGER;
    current_minute_val INTEGER;
    current_date_val DATE;
BEGIN
    -- Get key details
    SELECT rate_limit_per_minute, rate_limit_per_day 
    INTO key_record
    FROM api_keys 
    WHERE key_hash = p_key_hash AND is_active = true;
    
    IF NOT FOUND THEN
        current_minute_requests := 0;
        current_day_requests := 0;
        minute_limit := 0;
        day_limit := 0;
        is_rate_limited := true;
        RETURN;
    END IF;
    
    -- Get current time components
    current_date_val := CURRENT_DATE;
    current_hour := EXTRACT(HOUR FROM NOW());
    current_minute_val := EXTRACT(MINUTE FROM NOW());
    
    -- Count requests in current minute
    SELECT COALESCE(COUNT(*), 0) INTO current_minute_requests
    FROM api_key_usage u
    JOIN api_keys k ON u.api_key_id = k.id
    WHERE k.key_hash = p_key_hash
      AND u.request_date = current_date_val
      AND u.request_hour = current_hour
      AND u.request_minute = current_minute_val;
    
    -- Count requests in current day
    SELECT COALESCE(COUNT(*), 0) INTO current_day_requests
    FROM api_key_usage u
    JOIN api_keys k ON u.api_key_id = k.id
    WHERE k.key_hash = p_key_hash
      AND u.request_date = current_date_val;
    
    -- Set limits
    minute_limit := key_record.rate_limit_per_minute;
    day_limit := key_record.rate_limit_per_day;
    
    -- Check if rate limited
    is_rate_limited := (current_minute_requests >= minute_limit) OR (current_day_requests >= day_limit);
END;
$$ LANGUAGE plpgsql;

-- Function to record API usage
CREATE OR REPLACE FUNCTION record_api_usage(
    p_key_hash VARCHAR(64),
    p_endpoint VARCHAR(100),
    p_method VARCHAR(10),
    p_status_code INTEGER,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    key_id UUID;
BEGIN
    -- Get the API key ID
    SELECT id INTO key_id
    FROM api_keys
    WHERE key_hash = p_key_hash AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Record the usage
    INSERT INTO api_key_usage (
        api_key_id, endpoint, method, status_code,
        request_date, request_hour, request_minute,
        user_agent, ip_address
    ) VALUES (
        key_id, p_endpoint, p_method, p_status_code,
        CURRENT_DATE, 
        EXTRACT(HOUR FROM NOW()),
        EXTRACT(MINUTE FROM NOW()),
        p_user_agent, p_ip_address
    );
    
    -- Update last_used_at
    UPDATE api_keys 
    SET last_used_at = CURRENT_TIMESTAMP 
    WHERE id = key_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a view for API key statistics
CREATE OR REPLACE VIEW api_key_stats AS
SELECT 
    k.id,
    k.name,
    k.key_prefix,
    k.admin_code_id,
    k.is_active,
    k.expires_at,
    k.last_used_at,
    k.created_at,
    
    -- Usage stats (last 30 days)
    COALESCE(stats.total_requests, 0) as total_requests_30d,
    COALESCE(stats.requests_today, 0) as requests_today,
    COALESCE(stats.avg_daily_requests, 0) as avg_daily_requests_30d,
    
    -- Rate limits
    k.rate_limit_per_minute,
    k.rate_limit_per_day
    
FROM api_keys k
LEFT JOIN (
    SELECT 
        u.api_key_id,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE u.request_date = CURRENT_DATE) as requests_today,
        ROUND(COUNT(*)::numeric / GREATEST(DATE_PART('day', NOW() - MIN(u.created_at))::numeric, 1), 2) as avg_daily_requests
    FROM api_key_usage u
    WHERE u.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY u.api_key_id
) stats ON k.id = stats.api_key_id;

-- Print confirmation
SELECT 'API Keys system tables created successfully' AS status;
SELECT 'Admin-scoped API keys with rate limiting and usage tracking enabled' AS info;