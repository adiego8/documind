from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.database import test_connection
from app.document_processor import DocumentProcessor
from app.vector_store import VectorStore
from app.rag_service import RAGService
from app.middleware import APIKeyAuthMiddleware, CSRFProtectionMiddleware

# Import all routers
from app.routers import auth, assistants, documents, queries, admin, llm_config, legacy, cms, api_keys, projects, public_api

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=f"{settings.app_name} API",
    description=settings.app_description,
    version=settings.app_version
)

# Add rate limiter state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,  # Use configured origins from settings
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add API Key authentication middleware
app.add_middleware(APIKeyAuthMiddleware)

# Add CSRF protection middleware
app.add_middleware(CSRFProtectionMiddleware)

# Initialize services with error handling
document_processor = DocumentProcessor()

# Initialize vector store and RAG service only if OpenAI key is available
vector_store = None
rag_service = None

try:
    if settings.openai_api_key:
        vector_store = VectorStore()
        rag_service = RAGService()
    else:
        print("⚠️  OpenAI API key not provided - vector store and RAG features disabled")
except Exception as e:
    print(f"⚠️  Failed to initialize vector store: {e}")
    print("Vector store and RAG features disabled")

# Test database connection on startup
@app.on_event("startup")
async def startup_event():
    if not test_connection():
        print("❌ Database connection failed!")
    else:
        print("✅ Database connected successfully")

@app.get("/health")
async def health_check():
    """Health check endpoint for Railway"""
    try:
        # Test database connection if available
        from app.database import test_connection
        db_status = "connected" if test_connection() else "disconnected"
    except Exception:
        db_status = "unknown"
    
    return {
        "status": "healthy",
        "service": "Persona API", 
        "database": db_status,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
async def read_root():
    return {"message": f"Welcome to {settings.app_name} API", "docs": "/docs", "health": "/health"}

# Include all routers
app.include_router(auth.router)
app.include_router(assistants.router)
app.include_router(documents.router)
app.include_router(queries.router)
app.include_router(admin.router)
app.include_router(llm_config.router)
app.include_router(legacy.router)
app.include_router(cms.router)
app.include_router(api_keys.router)
app.include_router(projects.router)
app.include_router(public_api.router)

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        reload=settings.reload
    )