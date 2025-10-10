from typing import List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from app.config import settings
from app.vector_store import VectorStore
from app.llm_config import LLMConfig

class RAGService:
    def __init__(self, project_id: str = None, assistant_id: str = None, llm_config: Optional[Dict[str, Any]] = None):
        self.vector_store = VectorStore(project_id=project_id, assistant_id=assistant_id)
        
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
    def create_for_assistant(cls, assistant_id: str, project_id: str = None, assistant_config: Optional[Dict[str, Any]] = None):
        """Create a RAGService instance for a specific assistant"""
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
        
        print(f"🔧 Creating RAGService with project_id={project_id}, assistant_id={assistant_id}")
        return cls(project_id=project_id, assistant_id=assistant_id, llm_config=llm_config)
    
    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        """Add documents to this assistant's vector store"""
        self.vector_store.add_documents(documents)
    
    def get_document_stats(self) -> Dict[str, Any]:
        """Get document statistics for this assistant"""
        return self.vector_store.get_stats()
    
    def clear_documents(self) -> None:
        """Clear all documents for this assistant"""
        self.vector_store.clear_project_documents()
    
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
        print(f"🔍 RAG Query - Question: {question[:100]}")
        print(f"🔍 RAG Query - Assistant ID: {self.vector_store.assistant_id}")
        relevant_docs = self.vector_store.search(question, k=n_results)
        print(f"🔍 RAG Query - Found {len(relevant_docs)} relevant documents")
        
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
                "source": doc["metadata"].get("source", "unknown"),
                "chunk_id": doc.get("chunk_index", 0),
                "similarity_score": doc.get("score", 0.0),
                "content_preview": doc["content"][:200] + "..." if len(doc["content"]) > 200 else doc["content"]
            })
        
        return {
            "answer": response,
            "sources": sources,
            "context_used": True,
            "total_documents_found": len(relevant_docs)
        }
    
    
    def delete_document(self, document_id: str) -> int:
        """Delete a document by its ID"""
        return self.vector_store.delete_document(document_id)
    
    def clear_all_documents(self):
        """Clear all documents from the vector store"""
        self.vector_store.clear_project_documents()