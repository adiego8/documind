import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any
from langchain_openai import OpenAIEmbeddings
from app.config import settings

class VectorStore:
    def __init__(self, collection_name: str = "documents"):
        # Check for Trychroma Cloud configuration first
        if settings.chroma_api_key:
            # Trychroma Cloud setup
            self.client = chromadb.CloudClient(
                tenant=settings.chroma_tenant,
                database=settings.chroma_database,
                api_key=settings.chroma_api_key
            )
        elif settings.chroma_host:
            # Local Docker HTTP client setup
            self.client = chromadb.HttpClient(
                host=settings.chroma_host,
                port=settings.chroma_port,
                settings=Settings(anonymized_telemetry=False)
            )
        else:
            # Local file-based storage
            self.client = chromadb.PersistentClient(
                path=settings.chroma_persist_directory,
                settings=Settings(anonymized_telemetry=False)
            )
        self.collection_name = collection_name
        self.collection = self._get_or_create_collection()
        self.embeddings = OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=settings.openai_api_key
        )
    
    def _get_or_create_collection(self):
        try:
            return self.client.get_collection(name=self.collection_name)
        except:
            return self.client.create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        return self.embeddings.embed_documents(texts)
    
    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        if not documents:
            return
        
        texts = [doc["content"] for doc in documents]
        embeddings = self.generate_embeddings(texts)
        
        ids = []
        metadatas = []
        
        for i, doc in enumerate(documents):
            doc_id = f"{doc['metadata']['source']}_{doc['metadata']['chunk_id']}"
            ids.append(doc_id)
            metadatas.append(doc["metadata"])
        
        self.collection.add(
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
            ids=ids
        )
    
    def similarity_search(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        query_embedding = self.embeddings.embed_query(query)
        
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"]
        )
        
        formatted_results = []
        for i in range(len(results["documents"][0])):
            formatted_results.append({
                "content": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "similarity_score": 1 - results["distances"][0][i]
            })
        
        return formatted_results
    
    def delete_collection(self):
        try:
            self.client.delete_collection(name=self.collection_name)
            self.collection = self._get_or_create_collection()
        except:
            pass
    
    def get_collection_count(self) -> int:
        return self.collection.count()
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get detailed stats for current collection"""
        return {
            "collection_name": self.collection_name,
            "document_count": self.collection.count()
        }
    
    def delete_documents_by_prefix(self, document_id_prefix: str):
        """Delete all documents with the given prefix"""
        try:
            # Get all documents from collection
            all_results = self.collection.get(include=["metadatas"])
            
            # Find documents with matching prefix
            ids_to_delete = []
            for i, metadata in enumerate(all_results["metadatas"]):
                if metadata and metadata.get("document_id_prefix") == document_id_prefix:
                    ids_to_delete.append(all_results["ids"][i])
            
            # Delete the found documents
            if ids_to_delete:
                self.collection.delete(ids=ids_to_delete)
                
            return len(ids_to_delete)
        except Exception as e:
            print(f"Error deleting documents by prefix {document_id_prefix}: {e}")
            return 0
    
    def list_collections(self) -> List[str]:
        """List all available collections"""
        collections = self.client.list_collections()
        return [col.name for col in collections]
    
    def delete_collection_by_name(self, collection_name: str) -> bool:
        """Delete a specific collection by name"""
        try:
            self.client.delete_collection(name=collection_name)
            return True
        except:
            return False
    
    @classmethod
    def create_for_assistant(cls, assistant_id: int, document_collection: str = None):
        """Create a VectorStore instance for a specific assistant"""
        if document_collection:
            collection_name = document_collection
        else:
            collection_name = f"assistant_{assistant_id}_docs"
        return cls(collection_name=collection_name)