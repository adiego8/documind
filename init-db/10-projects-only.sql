-- AssistantJS Projects System - Safe Migration
-- This file only adds the new projects schema without touching existing tables

\c ragdb;

-- Create projects table for frontend integrations (only if not exists)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_code_id UUID NOT NULL REFERENCES admin_codes(id) ON DELETE CASCADE,
    
    -- Project identification (safe to expose in frontend)
    project_id VARCHAR(32) UNIQUE NOT NULL, -- "proj_abc123_public"
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Security settings
    allowed_domains JSONB DEFAULT '[]'::jsonb, -- ["mysite.com", "*.myapp.com"]
    allowed_assistants JSONB DEFAULT '[]'::jsonb, -- ["support", "sales"] or [] for all
    
    -- Rate limiting (per project)
    requests_per_minute INTEGER DEFAULT 10,
    requests_per_day INTEGER DEFAULT 100,
    requests_per_session INTEGER DEFAULT 50,
    
    -- Project settings
    session_duration_minutes INTEGER DEFAULT 60, -- How long sessions last
    max_concurrent_sessions INTEGER DEFAULT 100,
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create public_sessions table for short-lived authentication (only if not exists)
CREATE TABLE IF NOT EXISTS public_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(32) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    
    -- Session identification
    session_token VARCHAR(64) UNIQUE NOT NULL, -- "sess_xyz789abc"
    user_identifier VARCHAR(255), -- Optional: email, user_id, etc.
    
    -- Request tracking and security
    ip_address INET,
    user_agent TEXT,
    origin_domain VARCHAR(255), -- Where the request came from
    
    -- Session lifecycle
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Session metadata
    metadata JSONB DEFAULT '{}'::jsonb -- Store additional session data
);

-- Create session_usage table for tracking requests and rate limiting (only if not exists)
CREATE TABLE IF NOT EXISTS session_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public_sessions(id) ON DELETE CASCADE,
    project_id VARCHAR(32) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    
    -- Usage tracking
    assistant_id VARCHAR(100), -- Which assistant was used
    endpoint VARCHAR(100) NOT NULL, -- Which endpoint was called
    method VARCHAR(10) NOT NULL, -- HTTP method
    status_code INTEGER NOT NULL, -- Response status
    
    -- Rate limiting counters
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_hour INTEGER NOT NULL DEFAULT EXTRACT(HOUR FROM NOW()),
    request_minute INTEGER NOT NULL DEFAULT EXTRACT(MINUTE FROM NOW()),
    
    -- Request metadata
    message_length INTEGER, -- Length of user message
    response_length INTEGER, -- Length of assistant response
    processing_time_ms INTEGER, -- How long it took to process
    
    -- Timing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance (only if not exists)
CREATE INDEX IF NOT EXISTS idx_projects_admin_code_id ON projects(admin_code_id);
CREATE INDEX IF NOT EXISTS idx_projects_project_id ON projects(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_public_sessions_project_id ON public_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_public_sessions_token ON public_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_public_sessions_expires ON public_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_public_sessions_active ON public_sessions(project_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_session_usage_session_id ON session_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_session_usage_project_id ON session_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_session_usage_date ON session_usage(request_date);
CREATE INDEX IF NOT EXISTS idx_session_usage_rate_limit ON session_usage(session_id, request_date, request_hour, request_minute);

-- Function to update projects updated_at (replace if exists)
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS projects_updated_at_trigger ON projects;
CREATE TRIGGER projects_updated_at_trigger
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();

-- Function to generate unique project ID (replace if exists)
CREATE OR REPLACE FUNCTION generate_project_id()
RETURNS VARCHAR(32) AS $$
DECLARE
    new_id VARCHAR(32);
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Generate project ID: "proj_" + 8 random chars + "_public"
        new_id := 'proj_' || 
                  substring(md5(random()::text || clock_timestamp()::text) from 1 for 8) || 
                  '_public';
        
        -- Check if it already exists
        IF NOT EXISTS (SELECT 1 FROM projects WHERE project_id = new_id) THEN
            RETURN new_id;
        END IF;
        
        counter := counter + 1;
        IF counter > 100 THEN
            RAISE EXCEPTION 'Could not generate unique project ID after 100 attempts';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate session token (replace if exists)
CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS VARCHAR(64) AS $$
DECLARE
    new_token VARCHAR(64);
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Generate session token: "sess_" + 24 random chars
        new_token := 'sess_' || 
                     substring(md5(random()::text || clock_timestamp()::text) from 1 for 12) ||
                     substring(md5(random()::text || extract(epoch from now())::text) from 1 for 12);
        
        -- Check if it already exists
        IF NOT EXISTS (SELECT 1 FROM public_sessions WHERE session_token = new_token) THEN
            RETURN new_token;
        END IF;
        
        counter := counter + 1;
        IF counter > 100 THEN
            RAISE EXCEPTION 'Could not generate unique session token after 100 attempts';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions (replace if exists)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Also clean up old session usage records (keep last 30 days)
    DELETE FROM session_usage 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check project rate limits (replace if exists)
CREATE OR REPLACE FUNCTION check_project_rate_limit(
    p_project_id VARCHAR(32),
    p_session_id UUID,
    OUT current_minute_requests INTEGER,
    OUT current_day_requests INTEGER,
    OUT current_session_requests INTEGER,
    OUT minute_limit INTEGER,
    OUT day_limit INTEGER,
    OUT session_limit INTEGER,
    OUT is_rate_limited BOOLEAN
)
AS $$
DECLARE
    project_record RECORD;
    current_hour INTEGER;
    current_minute_val INTEGER;
    current_date_val DATE;
BEGIN
    -- Get project limits
    SELECT requests_per_minute, requests_per_day, requests_per_session
    INTO project_record
    FROM projects 
    WHERE project_id = p_project_id AND is_active = true;
    
    IF NOT FOUND THEN
        current_minute_requests := 0;
        current_day_requests := 0;
        current_session_requests := 0;
        minute_limit := 0;
        day_limit := 0;
        session_limit := 0;
        is_rate_limited := true;
        RETURN;
    END IF;
    
    -- Get current time components
    current_date_val := CURRENT_DATE;
    current_hour := EXTRACT(HOUR FROM NOW());
    current_minute_val := EXTRACT(MINUTE FROM NOW());
    
    -- Count requests in current minute (across all sessions for this project)
    SELECT COALESCE(COUNT(*), 0) INTO current_minute_requests
    FROM session_usage
    WHERE project_id = p_project_id
      AND request_date = current_date_val
      AND request_hour = current_hour
      AND request_minute = current_minute_val;
    
    -- Count requests in current day (across all sessions for this project)
    SELECT COALESCE(COUNT(*), 0) INTO current_day_requests
    FROM session_usage
    WHERE project_id = p_project_id
      AND request_date = current_date_val;
    
    -- Count requests for this specific session
    SELECT COALESCE(COUNT(*), 0) INTO current_session_requests
    FROM session_usage
    WHERE session_id = p_session_id;
    
    -- Set limits
    minute_limit := project_record.requests_per_minute;
    day_limit := project_record.requests_per_day;
    session_limit := project_record.requests_per_session;
    
    -- Check if rate limited
    is_rate_limited := (current_minute_requests >= minute_limit) OR 
                       (current_day_requests >= day_limit) OR 
                       (current_session_requests >= session_limit);
END;
$$ LANGUAGE plpgsql;

-- Function to record session usage (replace if exists)
CREATE OR REPLACE FUNCTION record_session_usage(
    p_session_id UUID,
    p_assistant_id VARCHAR(100),
    p_endpoint VARCHAR(100),
    p_method VARCHAR(10),
    p_status_code INTEGER,
    p_message_length INTEGER DEFAULT NULL,
    p_response_length INTEGER DEFAULT NULL,
    p_processing_time_ms INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    session_project_id VARCHAR(32);
BEGIN
    -- Get the project ID for this session
    SELECT project_id INTO session_project_id
    FROM public_sessions
    WHERE id = p_session_id AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Record the usage
    INSERT INTO session_usage (
        session_id, project_id, assistant_id, endpoint, method, status_code,
        request_date, request_hour, request_minute,
        message_length, response_length, processing_time_ms
    ) VALUES (
        p_session_id, session_project_id, p_assistant_id, p_endpoint, p_method, p_status_code,
        CURRENT_DATE, 
        EXTRACT(HOUR FROM NOW()),
        EXTRACT(MINUTE FROM NOW()),
        p_message_length, p_response_length, p_processing_time_ms
    );
    
    -- Update session last_used_at
    UPDATE public_sessions 
    SET last_used_at = CURRENT_TIMESTAMP 
    WHERE id = p_session_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a view for project statistics (replace if exists)
CREATE OR REPLACE VIEW project_stats AS
SELECT 
    p.id,
    p.project_id,
    p.name,
    p.admin_code_id,
    p.is_active,
    p.created_at,
    
    -- Session stats
    COALESCE(session_stats.active_sessions, 0) as active_sessions,
    COALESCE(session_stats.total_sessions_today, 0) as sessions_today,
    COALESCE(session_stats.total_sessions_30d, 0) as sessions_30d,
    
    -- Usage stats (last 30 days)
    COALESCE(usage_stats.total_requests_30d, 0) as requests_30d,
    COALESCE(usage_stats.requests_today, 0) as requests_today,
    COALESCE(usage_stats.avg_daily_requests, 0) as avg_daily_requests_30d,
    
    -- Rate limits
    p.requests_per_minute,
    p.requests_per_day,
    p.requests_per_session
    
FROM projects p
LEFT JOIN (
    SELECT 
        project_id,
        COUNT(*) FILTER (WHERE expires_at > NOW()) as active_sessions,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as total_sessions_today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as total_sessions_30d
    FROM public_sessions
    GROUP BY project_id
) session_stats ON p.project_id = session_stats.project_id
LEFT JOIN (
    SELECT 
        project_id,
        COUNT(*) as total_requests_30d,
        COUNT(*) FILTER (WHERE request_date = CURRENT_DATE) as requests_today,
        ROUND(COUNT(*)::numeric / GREATEST(DATE_PART('day', NOW() - MIN(created_at))::numeric, 1), 2) as avg_daily_requests
    FROM session_usage
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY project_id
) usage_stats ON p.project_id = usage_stats.project_id;

-- Print confirmation
SELECT 'AssistantJS Projects system created successfully' AS status;
SELECT 'Safe migration completed - only new tables added' AS info;