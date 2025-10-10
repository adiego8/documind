-- =========================================
-- PGVECTOR SETUP FOR DOCUMENT EMBEDDINGS
-- =========================================
-- This replaces ChromaDB with native PostgreSQL vector storage

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================
-- DOCUMENT EMBEDDINGS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS document_embeddings (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE CASCADE,  -- Nullable: for API access control only
    assistant_id VARCHAR(100) NOT NULL,  -- Required: documents belong to assistants
    document_id VARCHAR(255),   -- Unique identifier for the document
    chunk_index INTEGER,        -- Index of chunk within document
    content TEXT NOT NULL,      -- The actual text content
    metadata JSONB DEFAULT '{}', -- Flexible metadata storage
    embedding vector(1536),     -- OpenAI text-embedding-3-small dimension
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique chunks per document per assistant
    UNIQUE(assistant_id, document_id, chunk_index)
);

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================
-- Vector similarity search index (using ivfflat for better performance on large datasets)
CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector 
    ON document_embeddings 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Regular indexes for filtering
CREATE INDEX IF NOT EXISTS idx_document_embeddings_project 
    ON document_embeddings(project_id);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_assistant 
    ON document_embeddings(assistant_id) 
    WHERE assistant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_embeddings_document 
    ON document_embeddings(document_id);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_metadata 
    ON document_embeddings 
    USING gin(metadata);

-- =========================================
-- HELPER FUNCTIONS
-- =========================================

-- Drop old function signature if exists
DROP FUNCTION IF EXISTS search_similar_documents(vector, VARCHAR(50), VARCHAR(100), INTEGER, FLOAT);

-- Function to search for similar documents by assistant
CREATE OR REPLACE FUNCTION search_similar_documents(
    query_embedding vector(1536),
    target_assistant_id VARCHAR(100),
    target_project_id VARCHAR(50) DEFAULT NULL,
    max_results INTEGER DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    id INTEGER,
    content TEXT,
    metadata JSONB,
    similarity FLOAT,
    document_id VARCHAR(255),
    chunk_index INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        de.id,
        de.content,
        de.metadata,
        1 - (de.embedding <=> query_embedding) AS similarity,
        de.document_id,
        de.chunk_index
    FROM document_embeddings de
    WHERE 
        de.assistant_id = target_assistant_id
        AND (target_project_id IS NULL OR de.project_id = target_project_id)
        AND de.embedding IS NOT NULL
        AND 1 - (de.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY de.embedding <=> query_embedding
    LIMIT max_results;
END;
$$;

-- Function to delete all embeddings for a document
CREATE OR REPLACE FUNCTION delete_document_embeddings(
    target_project_id VARCHAR(50),
    target_document_id VARCHAR(255)
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM document_embeddings
    WHERE project_id = target_project_id AND document_id = target_document_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Drop old function signature if exists
DROP FUNCTION IF EXISTS get_project_document_stats(VARCHAR(50));

-- Function to get document statistics by assistant
CREATE OR REPLACE FUNCTION get_assistant_document_stats(target_assistant_id VARCHAR(100))
RETURNS TABLE (
    total_documents BIGINT,
    total_chunks BIGINT,
    total_size_bytes BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT document_id) as total_documents,
        COUNT(*) as total_chunks,
        SUM(LENGTH(content)) as total_size_bytes
    FROM document_embeddings
    WHERE assistant_id = target_assistant_id;
END;
$$;

-- =========================================
-- MIGRATION FROM CHROMADB (if needed)
-- =========================================
-- This table can temporarily store ChromaDB migration status
CREATE TABLE IF NOT EXISTS vector_migration_log (
    id SERIAL PRIMARY KEY,
    collection_name VARCHAR(255),
    documents_migrated INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_document_embeddings_updated_at ON document_embeddings;
CREATE TRIGGER update_document_embeddings_updated_at
    BEFORE UPDATE ON document_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed for your user)
GRANT ALL ON document_embeddings TO postgres;
GRANT ALL ON vector_migration_log TO postgres;
GRANT EXECUTE ON FUNCTION search_similar_documents TO postgres;
GRANT EXECUTE ON FUNCTION delete_document_embeddings TO postgres;
GRANT EXECUTE ON FUNCTION get_assistant_document_stats TO postgres;

-- =========================================
-- INITIAL SETUP CONFIRMATION
-- =========================================
DO $$
BEGIN
    RAISE NOTICE 'pgvector setup completed successfully!';
    RAISE NOTICE 'Document embeddings table created with vector(1536) for OpenAI text-embedding-3-small';
    RAISE NOTICE 'Helper functions created for similarity search and document management';
END $$;