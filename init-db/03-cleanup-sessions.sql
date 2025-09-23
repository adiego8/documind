-- Cleanup script to remove old session-based tables
-- Run this after confirming the new multiple assistants system is working

\c ragdb;

-- Drop old session tables (no longer needed with multiple assistants)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- Keep assistant_config for legacy compatibility in admin panel
-- but it's no longer the primary configuration source

-- Print confirmation
SELECT 'Session tables cleaned up successfully' AS status;
SELECT 'Old chat sessions and messages have been removed' AS info;