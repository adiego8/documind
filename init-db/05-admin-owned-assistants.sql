-- Make assistants belong to specific admins via admin codes
-- This ensures each admin has their own assistants

\c ragdb;

-- Add admin_code_id to assistants table
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS admin_code_id UUID REFERENCES admin_codes(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_assistants_admin_code_id ON assistants(admin_code_id);

-- Make admin_code_id NOT NULL for fresh database
ALTER TABLE assistants ALTER COLUMN admin_code_id SET NOT NULL;

-- Create documents table to track original uploaded files
-- This separates user-facing files from internal chunks in ChromaDB
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    chunk_count INTEGER DEFAULT 0,
    document_id_prefix VARCHAR(50) NOT NULL UNIQUE, -- unique prefix for all chunks of this document in ChromaDB
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update trigger for documents updated_at
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at_trigger
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_assistant_id ON documents(assistant_id);
CREATE INDEX IF NOT EXISTS idx_documents_prefix ON documents(document_id_prefix);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date);

