-- Add user_code to admin_codes table for user registration
-- This allows admins to create specific codes for users to register with

\c ragdb;

-- Add user_code column to admin_codes table
ALTER TABLE admin_codes ADD COLUMN IF NOT EXISTS user_code VARCHAR(50) UNIQUE;

-- Create index for performance on user_code lookups
CREATE INDEX IF NOT EXISTS idx_admin_codes_user_code ON admin_codes(user_code);

-- Add constraint to ensure user_code is not null for new records (idempotent)
-- (Allow existing records to have NULL for backward compatibility)
DO $$
BEGIN
    -- Only add constraint if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'admin_codes' 
        AND constraint_name = 'chk_user_code_not_empty'
    ) THEN
        ALTER TABLE admin_codes ADD CONSTRAINT chk_user_code_not_empty 
            CHECK (user_code IS NULL OR LENGTH(TRIM(user_code)) > 0);
    END IF;
END $$;

-- Print confirmation
SELECT 'user_code column added to admin_codes table successfully' AS status;