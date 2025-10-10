import json
import hashlib
import numpy as np
from typing import List, Dict, Any, Optional
from langchain_openai import OpenAIEmbeddings
from app.config import settings
from app.database import get_db_connection

class VectorStore:
    """PostgreSQL-based vector store using pgvector extension"""
    
    def __init__(self, project_id: str = None, assistant_id: str = None):
        """
        Initialize VectorStore with PostgreSQL/pgvector backend
        
        Args:
            project_id: Project identifier for scoping documents
            assistant_id: Optional assistant ID for further scoping
        """
        self.project_id = project_id
        self.assistant_id = assistant_id
        print(f"🔧 VectorStore initialized with project_id={project_id}, assistant_id={assistant_id}")
        self.embeddings = OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=settings.openai_api_key
        )
    
    def generate_document_id(self, content: str, source: str = None) -> str:
        """Generate a unique document ID based on content and source"""
        hash_input = f"{source or 'unknown'}:{content[:100]}"
        return hashlib.md5(hash_input.encode()).hexdigest()
    
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts"""
        return self.embeddings.embed_documents(texts)
    
    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        """
        Add documents with their embeddings to PostgreSQL
        
        Args:
            documents: List of document dictionaries containing:
                - content: The text content
                - metadata: Optional metadata dict
                - document_id: Optional document identifier
                - chunk_index: Optional chunk index
        """
        if not documents:
            return
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Extract texts for embedding
            texts = [doc.get('content', '') for doc in documents]
            
            # Generate embeddings
            embeddings = self.generate_embeddings(texts)
            
            # Prepare batch insert
            insert_data = []
            for i, doc in enumerate(documents):
                document_id = doc.get('document_id') or self.generate_document_id(
                    doc['content'], 
                    doc.get('metadata', {}).get('source')
                )
                
                # Assistant ID is required for document scoping
                if not self.assistant_id:
                    raise ValueError("assistant_id is required for document storage")
                
                print(f"🔧 Storing document chunk {i} under assistant_id: {self.assistant_id}")
                
                insert_data.append((
                    self.project_id,  # Can be None - only for API access control
                    self.assistant_id,  # Required - documents belong to assistants
                    document_id,
                    doc.get('chunk_index', i),
                    doc['content'],
                    json.dumps(doc.get('metadata', {})),
                    embeddings[i]
                ))
            
            # Batch insert with ON CONFLICT handling
            cursor.executemany("""
                INSERT INTO document_embeddings 
                (project_id, assistant_id, document_id, chunk_index, content, metadata, embedding)
                VALUES (%s, %s, %s, %s, %s, %s, %s::vector)
                ON CONFLICT (assistant_id, document_id, chunk_index) 
                DO UPDATE SET 
                    content = EXCLUDED.content,
                    metadata = EXCLUDED.metadata,
                    embedding = EXCLUDED.embedding,
                    updated_at = CURRENT_TIMESTAMP
            """, insert_data)
            
            conn.commit()
            print(f"✅ Added {len(documents)} documents to vector store")
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Error adding documents: {str(e)}")
            raise
        finally:
            cursor.close()
            conn.close()
    
    def search(self, 
               query: str, 
               k: int = 5, 
               threshold: float = 0.3,  # More reasonable threshold
               filter_metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Search for similar documents using vector similarity
        
        Args:
            query: The search query text
            k: Number of results to return
            threshold: Minimum similarity threshold (0-1)
            filter_metadata: Optional metadata filters
            
        Returns:
            List of similar documents with content, metadata, and similarity scores
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Generate embedding for query
            query_embedding = self.embeddings.embed_query(query)
            
            # Assistant ID is required for document scoping
            if not self.assistant_id:
                raise ValueError("assistant_id is required for document search")
            
            print(f"🔍 Vector search - Assistant ID: {self.assistant_id}, k={k}, threshold={threshold}")
            
            # Build metadata filter if provided
            metadata_filter = ""
            params = [
                query_embedding,
                self.assistant_id,
                self.project_id,  # Can be None
                k,
                threshold
            ]
            
            if filter_metadata:
                metadata_conditions = []
                for key, value in filter_metadata.items():
                    metadata_conditions.append(f"metadata->>{key} = %s")
                    params.append(json.dumps(value))
                metadata_filter = " AND " + " AND ".join(metadata_conditions)
            
            # Use the stored function for similarity search
            # Cast the embedding array to vector type
            sql = f"""
                SELECT 
                    id,
                    content,
                    metadata,
                    similarity,
                    document_id,
                    chunk_index
                FROM search_similar_documents(%s::vector, %s, %s, %s, %s)
                {metadata_filter}
            """
            print(f"🔍 SQL params: assistant_id={params[1]}, project_id={params[2]}, k={params[3]}, threshold={params[4]}")
            
            cursor.execute(sql, params[:5])  # Only use first 5 params for function
            
            results = []
            for row in cursor.fetchall():
                result = {
                    'id': row[0],
                    'content': row[1],
                    'metadata': row[2],
                    'score': row[3],
                    'document_id': row[4],
                    'chunk_index': row[5]
                }
                print(f"🔍 Found document: score={result['score']:.3f}, content={result['content'][:50]}...")
                results.append(result)
            
            print(f"🔍 Total results returned: {len(results)}")
            
            return results
            
        except Exception as e:
            print(f"❌ Error searching documents: {str(e)}")
            raise
        finally:
            cursor.close()
            conn.close()
    
    def delete_document(self, document_id: str) -> int:
        """
        Delete all chunks of a document
        
        Args:
            document_id: The document identifier to delete
            
        Returns:
            Number of chunks deleted
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "SELECT delete_document_embeddings(%s, %s)",
                (self.project_id, document_id)
            )
            
            deleted_count = cursor.fetchone()[0]
            conn.commit()
            
            print(f"🗑️ Deleted {deleted_count} chunks for document {document_id}")
            return deleted_count
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Error deleting document: {str(e)}")
            raise
        finally:
            cursor.close()
            conn.close()
    
    def clear_project_documents(self) -> int:
        """Delete all documents for the current project"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "DELETE FROM document_embeddings WHERE project_id = %s",
                (self.project_id,)
            )
            
            deleted_count = cursor.rowcount
            conn.commit()
            
            print(f"🗑️ Cleared {deleted_count} documents from project {self.project_id}")
            return deleted_count
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Error clearing project documents: {str(e)}")
            raise
        finally:
            cursor.close()
            conn.close()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics for the current assistant's documents"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Assistant ID is required for document scoping
            if not self.assistant_id:
                raise ValueError("assistant_id is required for stats")
            
            cursor.execute(
                "SELECT * FROM get_assistant_document_stats(%s)",
                (self.assistant_id,)
            )
            
            result = cursor.fetchone()
            if result:
                return {
                    'total_documents': result[0] or 0,
                    'total_chunks': result[1] or 0,
                    'total_size_bytes': result[2] or 0
                }
            return {
                'total_documents': 0,
                'total_chunks': 0,
                'total_size_bytes': 0
            }
            
        except Exception as e:
            print(f"❌ Error getting stats: {str(e)}")
            raise
        finally:
            cursor.close()
            conn.close()
    
    def update_metadata(self, document_id: str, metadata: Dict[str, Any]) -> int:
        """Update metadata for all chunks of a document"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                UPDATE document_embeddings 
                SET metadata = %s, updated_at = CURRENT_TIMESTAMP
                WHERE project_id = %s AND document_id = %s
            """, (json.dumps(metadata), self.project_id, document_id))
            
            updated_count = cursor.rowcount
            conn.commit()
            
            print(f"📝 Updated metadata for {updated_count} chunks")
            return updated_count
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Error updating metadata: {str(e)}")
            raise
        finally:
            cursor.close()
            conn.close()

# Backward compatibility wrapper for existing code
def get_vector_store(collection_name: str = "documents") -> VectorStore:
    """
    Factory function for backward compatibility
    The collection_name parameter is ignored since we use project_id for scoping
    """
    # This will need to be called with proper project_id in actual usage
    return VectorStore()