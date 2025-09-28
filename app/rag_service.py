from typing import List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from app.config import settings
from app.vector_store import VectorStore
from app.llm_config import LLMConfig

class RAGService:
    def __init__(self, collection_name: str = "documents", llm_config: Optional[Dict[str, Any]] = None):
        self.vector_store = VectorStore(collection_name=collection_name)
        
        # Use provided config or default
        if llm_config:
            config = LLMConfig.normalize_config(llm_config)
        else:
            config = LLMConfig.get_default_config()
        
        self.llm = ChatOpenAI(
            model=config["model"],
            api_key=settings.openai_api_key,
            max_tokens=config["max_tokens"],
            temperature=config["temperature"]
        )
    
    @classmethod
    def create_for_assistant(cls, assistant_id: str, document_collection: str = None, assistant_config: Optional[Dict[str, Any]] = None):
        """Create a RAGService instance for a specific assistant"""
        if document_collection and document_collection != 'default':
            collection_name = document_collection
        else:
            collection_name = f"assistant_{assistant_id}_docs"
        
        # Extract LLM config from assistant config if provided
        llm_config = None
        if assistant_config:
            # Only include non-None values from assistant config
            llm_config = {}
            if assistant_config.get("temperature") is not None:
                llm_config["temperature"] = assistant_config["temperature"]
            if assistant_config.get("max_tokens") is not None:
                llm_config["max_tokens"] = assistant_config["max_tokens"]
            
            # If no valid config values, use default
            if not llm_config:
                llm_config = None
        
        return cls(collection_name=collection_name, llm_config=llm_config)
    
    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        """Add documents to this assistant's vector store"""
        self.vector_store.add_documents(documents)
    
    def get_document_stats(self) -> Dict[str, Any]:
        """Get document statistics for this assistant"""
        return self.vector_store.get_collection_stats()
    
    def clear_documents(self) -> None:
        """Clear all documents for this assistant"""
        self.vector_store.delete_collection()
    
    def generate_response(self, query: str, context_docs: List[Dict[str, Any]], system_instructions: str = None) -> str:
        context = "\n\n".join([doc["content"] for doc in context_docs])
        
        # Use provided system instructions or default
        instructions = system_instructions or "You are a helpful AI assistant. Use the provided documents to answer questions accurately and helpfully."
        
        if context:
            prompt = f"""{instructions}

Context:
{context}

Question: {query}

Answer:"""
        else:
            prompt = f"""{instructions}

Question: {query}

Answer:"""
        
        response = self.llm.invoke(prompt)
        return response.content
    
    def query(self, question: str, n_results: int = 5, system_instructions: str = None) -> Dict[str, Any]:
        relevant_docs = self.vector_store.similarity_search(question, n_results)
        
        if not relevant_docs:
            response = self.generate_response(question, [], system_instructions)
            return {
                "answer": response,
                "sources": [],
                "context_used": False
            }
        
        response = self.generate_response(question, relevant_docs, system_instructions)
        
        sources = []
        for doc in relevant_docs:
            sources.append({
                "source": doc["metadata"]["source"],
                "chunk_id": doc["metadata"]["chunk_id"],
                "similarity_score": doc["similarity_score"],
                "content_preview": doc["content"][:200] + "..." if len(doc["content"]) > 200 else doc["content"]
            })
        
        return {
            "answer": response,
            "sources": sources,
            "context_used": True,
            "total_documents_found": len(relevant_docs)
        }
    
    def get_document_stats(self) -> Dict[str, Any]:
        """Get document statistics for this RAG service"""
        return self.vector_store.get_collection_stats()
    
    def delete_documents_by_prefix(self, document_id_prefix: str) -> int:
        """Delete all documents with the given prefix"""
        return self.vector_store.delete_documents_by_prefix(document_id_prefix)
    
    def clear_all_documents(self):
        """Clear all documents from the vector store"""
        self.vector_store.delete_collection()
    
    def delete_collection_if_empty(self) -> bool:
        """Delete the collection if it becomes empty after document deletion"""
        return self.vector_store.delete_collection_if_empty()
    
    def delete_collection(self):
        """Force delete the entire collection"""
        self.vector_store.delete_collection()