from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
from typing import List, Optional
import os
import tempfile
import uuid
import json
from app.document_processor import DocumentProcessor
from app.vector_store import VectorStore
from app.rag_service import RAGService
from app.database import UserDB, AssistantDB, UserQueryDB, AdminCodeDB, ConversationDB, DocumentDB, test_connection
from app.auth import authenticate_user, create_access_token, get_current_user, get_current_admin_user, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from app.config import settings
from app.schemas import (
    UserCreate, UserLogin, User as UserSchema, Token,
    AssistantCreate, AssistantUpdate, AssistantResponse, AssistantsListResponse,
    QueryCreate, QueryResponse, QueryHistoryResponse, QueryRequest, LegacyQueryResponse
)
from app.llm_config import LLMConfig

app = FastAPI(
    title=f"{settings.app_name} API",
    description=settings.app_description,
    version=settings.app_version
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

document_processor = DocumentProcessor()
vector_store = VectorStore()
rag_service = RAGService()

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
    return {"status": "healthy", "service": "RAG API"}

@app.get("/", response_class=HTMLResponse)
async def read_root():
    return f"""
    <html>
        <head>
            <title>{settings.app_name} API</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .container {{ max-width: 800px; margin: 0 auto; }}
                .form-group {{ margin: 20px 0; }}
                textarea, input {{ width: 100%; padding: 10px; }}
                button {{ background: #007bff; color: white; padding: 10px 20px; border: none; cursor: pointer; }}
                .response {{ background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px; }}
                .sources {{ margin-top: 10px; font-size: 0.9em; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>{settings.app_name} API</h1>
                
                <h2>Upload Documents</h2>
                <form action="/upload" method="post" enctype="multipart/form-data">
                    <div class="form-group">
                        <input type="file" name="files" multiple accept=".pdf,.docx,.txt">
                    </div>
                    <button type="submit">Upload Documents</button>
                </form>
                
                <h2>Ask a Question</h2>
                <form action="/query" method="post">
                    <div class="form-group">
                        <textarea name="question" placeholder="Enter your question here..." rows="4"></textarea>
                    </div>
                    <button type="submit">Ask Question</button>
                </form>
                
                <div id="stats">
                    <p>Documents in database: <span id="doc-count">Loading...</span></p>
                </div>
            </div>
            
            <script>
                fetch('/stats').then(r => r.json()).then(data => {{
                    document.getElementById('doc-count').textContent = data.document_count;
                }});
            </script>
        </body>
    </html>
    """

@app.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...), current_user: dict = Depends(get_current_admin_user)):
    uploaded_files = []
    
    for file in files:
        if file.filename and file.filename.endswith(('.pdf', '.docx', '.txt')):
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
                content = await file.read()
                tmp_file.write(content)
                tmp_file_path = tmp_file.name
            
            try:
                documents = document_processor.process_document(tmp_file_path)
                vector_store.add_documents(documents)
                uploaded_files.append(file.filename)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error processing {file.filename}: {str(e)}")
            finally:
                os.unlink(tmp_file_path)
    
    return {"message": f"Successfully uploaded {len(uploaded_files)} files", "files": uploaded_files}

@app.post("/upload-directory")
async def upload_directory(directory_path: str = Form(...), current_user: dict = Depends(get_current_admin_user)):
    if not os.path.exists(directory_path):
        raise HTTPException(status_code=400, detail="Directory does not exist")
    
    try:
        documents = document_processor.process_directory(directory_path)
        vector_store.add_documents(documents)
        return {"message": f"Successfully processed directory with {len(documents)} document chunks"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing directory: {str(e)}")

@app.post("/query", response_model=dict)
async def query_documents(question: str = Form(...), n_results: int = Form(5)):
    try:
        # Use first available assistant for legacy endpoint
        assistants = AssistantDB.get_all_assistants()
        if not assistants:
            raise HTTPException(status_code=404, detail="No assistants available")
        
        assistant = assistants[0]
        system_instructions = assistant.get('initial_context')
        result = rag_service.query(question, n_results, system_instructions=system_instructions)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.post("/query-json", response_model=dict)
async def query_documents_json(request: QueryRequest):
    try:
        # Use first available assistant for legacy endpoint
        assistants = AssistantDB.get_all_assistants()
        if not assistants:
            raise HTTPException(status_code=404, detail="No assistants available")
        
        assistant = assistants[0]
        system_instructions = assistant.get('initial_context')
        result = rag_service.query(request.question, request.n_results, system_instructions=system_instructions)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.get("/stats")
async def get_stats():
    return {
        "document_count": vector_store.get_collection_count(),
        "collection_name": vector_store.collection_name
    }

@app.delete("/documents")
async def clear_documents(current_user: dict = Depends(get_current_admin_user)):
    vector_store.delete_collection()
    return {"message": "All documents cleared from the database"}

# Authentication endpoints
@app.post("/auth/register", response_model=dict)
async def register(
    user_data: UserCreate, 
    user_code: Optional[str] = None, 
    admin_code: Optional[str] = None
):
    # Check if user already exists
    if UserDB.user_exists(user_data.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Determine registration flow based on role and provided codes
    if user_data.role == 'admin':
        # Admin registration requires admin_code
        if not admin_code:
            raise HTTPException(status_code=400, detail="Admin code is required for admin registration")
        
        if not AdminCodeDB.can_register_user(admin_code):
            raise HTTPException(status_code=400, detail="Invalid or expired admin code")
        
        admin_code_data = AdminCodeDB.get_admin_code_by_code(admin_code)
        admin_code_id = admin_code_data['id']
    else:
        # User registration requires user_code
        if not user_code:
            raise HTTPException(status_code=400, detail="User code is required for user registration")
        
        if not AdminCodeDB.can_register_user_with_user_code(user_code):
            raise HTTPException(status_code=400, detail="Invalid or expired user code")
        
        admin_code_data = AdminCodeDB.get_admin_code_by_user_code(user_code)
        admin_code_id = admin_code_data['id']
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    try:
        user = UserDB.create_user(user_data.username, hashed_password, user_data.role, admin_code_id)
        
        # Increment user count for the admin code
        AdminCodeDB.increment_user_count(admin_code)
        
        return {"message": "User created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

@app.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user = authenticate_user(user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['username']}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "role": user['role']
    }

# Assistant endpoints
@app.get("/assistants", response_model=AssistantsListResponse)
async def get_assistants(current_user: dict = Depends(get_current_user)):
    try:
        # If user has admin_code_id, only show assistants from their admin
        if current_user.get('admin_code_id'):
            assistants = AssistantDB.get_assistants_by_admin_code(current_user['admin_code_id'])
        else:
            # Fallback to all assistants for users without admin_code_id
            assistants = AssistantDB.get_all_assistants()
        return {"assistants": assistants}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting assistants: {str(e)}")

@app.get("/assistants/{assistant_id}", response_model=AssistantResponse)
async def get_assistant(assistant_id: int, current_user: dict = Depends(get_current_user)):
    assistant = AssistantDB.get_assistant_by_id(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    return assistant

@app.post("/assistants", response_model=AssistantResponse)
async def create_assistant(
    assistant_data: AssistantCreate,
    current_user: dict = Depends(get_current_admin_user)
):
    try:
        # Get admin's admin_code_id 
        admin_code_id = current_user.get('admin_code_id')
        if not admin_code_id:
            raise HTTPException(status_code=400, detail="Admin must have an admin code to create assistants")
        
        # Handle LLM preset if provided
        temperature = assistant_data.temperature
        max_tokens = assistant_data.max_tokens
        
        if assistant_data.llm_preset:
            try:
                preset_config = LLMConfig.get_configuration(assistant_data.llm_preset)
                temperature = preset_config["temperature"]
                max_tokens = preset_config["max_tokens"]
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
        
        assistant = AssistantDB.create_assistant(
            name=assistant_data.name,
            description=assistant_data.description,
            initial_context=assistant_data.initial_context,
            temperature=temperature,
            max_tokens=max_tokens,
            document_collection=assistant_data.document_collection,
            admin_code_id=admin_code_id
        )
        return assistant
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating assistant: {str(e)}")

@app.put("/assistants/{assistant_id}", response_model=AssistantResponse)
async def update_assistant(
    assistant_id: str,
    assistant_data: AssistantUpdate,
    current_user: dict = Depends(get_current_admin_user)
):
    try:
        # Handle LLM preset if provided
        temperature = assistant_data.temperature
        max_tokens = assistant_data.max_tokens
        
        if assistant_data.llm_preset:
            try:
                preset_config = LLMConfig.get_configuration(assistant_data.llm_preset)
                temperature = preset_config["temperature"]
                max_tokens = preset_config["max_tokens"]
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
        
        assistant = AssistantDB.update_assistant(
            assistant_id=assistant_id,
            name=assistant_data.name,
            description=assistant_data.description,
            initial_context=assistant_data.initial_context,
            temperature=temperature,
            max_tokens=max_tokens,
            document_collection=assistant_data.document_collection
        )
        return assistant
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating assistant: {str(e)}")

@app.delete("/assistants/{assistant_id}")
async def delete_assistant(
    assistant_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    success = AssistantDB.delete_assistant(assistant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Assistant not found")
    return {"message": "Assistant deleted successfully"}

# Document management endpoints
@app.post("/assistants/{assistant_id}/documents")
async def upload_documents_to_assistant(
    assistant_id: str,
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_admin_user)
):
    # Verify assistant exists
    assistant = AssistantDB.get_assistant_by_id(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Create RAG service for this assistant with its configuration
    rag_service = RAGService.create_for_assistant(assistant_id, assistant.get('document_collection'), assistant)
    
    uploaded_files = []
    
    for file in files:
        if file.filename and file.filename.endswith(('.pdf', '.docx', '.txt')):
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
                content = await file.read()
                tmp_file.write(content)
                tmp_file_path = tmp_file.name
                file_size = len(content)
            
            try:
                # Generate unique document ID prefix for tracking chunks
                document_id_prefix = f"doc_{assistant_id}_{uuid.uuid4().hex[:8]}"
                
                # Process document with tracking
                documents = document_processor.process_document(
                    tmp_file_path, 
                    document_id_prefix=document_id_prefix,
                    original_filename=file.filename
                )
                
                # Add documents to vector store
                rag_service.add_documents(documents)
                
                # Create document record in database
                document_record = DocumentDB.create_document(
                    assistant_id=assistant_id,
                    filename=file.filename,
                    file_size=file_size,
                    chunk_count=len(documents),
                    document_id_prefix=document_id_prefix
                )
                
                uploaded_files.append({
                    "filename": file.filename,
                    "file_size": file_size,
                    "chunk_count": len(documents),
                    "document_id": document_record['id']
                })
                
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error processing {file.filename}: {str(e)}")
            finally:
                os.unlink(tmp_file_path)
    
    total_chunks = sum(f["chunk_count"] for f in uploaded_files)
    return {
        "message": f"Successfully uploaded {len(uploaded_files)} files to assistant {assistant['name']}",
        "files": uploaded_files,
        "assistant_id": assistant_id,
        "total_files": len(uploaded_files),
        "total_chunks": total_chunks
    }

@app.get("/assistants/{assistant_id}/documents/stats")
async def get_assistant_document_stats(
    assistant_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Verify assistant exists
    assistant = AssistantDB.get_assistant_by_id(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    try:
        # Get file-level statistics from database
        stats = DocumentDB.get_documents_stats_by_assistant(assistant_id)
        return {
            "collection_name": assistant.get('document_collection', 'default'),
            "file_count": stats['file_count'],
            "total_chunks": stats['total_chunks'],
            "total_size_bytes": stats['total_size']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting document stats: {str(e)}")

@app.get("/assistants/{assistant_id}/documents")
async def get_assistant_documents(
    assistant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all documents for an assistant"""
    # Verify assistant exists
    assistant = AssistantDB.get_assistant_by_id(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    try:
        documents = DocumentDB.get_documents_by_assistant(assistant_id)
        return {
            "assistant_id": assistant_id,
            "documents": documents
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting documents: {str(e)}")

@app.delete("/assistants/{assistant_id}/documents/{document_id}")
async def delete_assistant_document(
    assistant_id: str,
    document_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Delete a specific document and all its chunks"""
    # Verify assistant exists
    assistant = AssistantDB.get_assistant_by_id(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Verify document exists and belongs to this assistant
    document = DocumentDB.get_document_by_id(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document['assistant_id'] != assistant_id:
        raise HTTPException(status_code=403, detail="Document does not belong to this assistant")
    
    try:
        # Get document prefix for chunk deletion
        document_id_prefix = document['document_id_prefix']
        
        # Create RAG service and delete chunks from vector store
        rag_service = RAGService.create_for_assistant(assistant_id, assistant.get('document_collection'))
        
        # Delete chunks by prefix (we'll need to implement this method)
        try:
            rag_service.delete_documents_by_prefix(document_id_prefix)
        except Exception as e:
            print(f"Warning: Failed to delete chunks from vector store: {e}")
        
        # Delete document record from database
        DocumentDB.delete_document(document_id)
        
        return {
            "message": f"Successfully deleted document {document['filename']}",
            "document_id": document_id,
            "chunks_deleted": document['chunk_count']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")

@app.delete("/assistants/{assistant_id}/documents")
async def clear_assistant_documents(
    assistant_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    # Verify assistant exists
    assistant = AssistantDB.get_assistant_by_id(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Create RAG service for this assistant with its configuration
    rag_service = RAGService.create_for_assistant(assistant_id, assistant.get('document_collection'), assistant)
    
    try:
        # Get count of documents before clearing
        stats = DocumentDB.get_documents_stats_by_assistant(assistant_id)
        file_count = stats['file_count']
        
        # Clear all documents from vector store
        rag_service.clear_all_documents()
        
        # Clear all document records from database
        documents = DocumentDB.get_documents_by_assistant(assistant_id)
        for doc in documents:
            DocumentDB.delete_document(doc['id'])
        
        return {
            "message": f"All documents cleared for assistant {assistant['name']}",
            "assistant_id": assistant_id,
            "files_deleted": file_count,
            "chunks_deleted": stats['total_chunks']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing documents: {str(e)}")

# Query endpoints
@app.post("/assistants/{assistant_id}/query")
async def query_assistant(
    assistant_id: str,
    query_data: QueryCreate,
    current_user: dict = Depends(get_current_user)
):
    # Get assistant
    assistant = AssistantDB.get_assistant_by_id(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    try:
        # Create RAG service for this assistant with its configuration
        assistant_rag_service = RAGService.create_for_assistant(assistant_id, assistant.get('document_collection'), assistant)
        
        # Get AI response
        system_instructions = assistant['initial_context']
        result = assistant_rag_service.query(query_data.question, system_instructions=system_instructions)
        
        # Get or create conversation
        conversation = ConversationDB.get_or_create_conversation(current_user['id'], assistant_id)
        
        # Add user message to conversation
        ConversationDB.add_message(
            conversation_id=conversation['id'],
            user_id=current_user['id'],
            assistant_id=assistant_id,
            role='user',
            content=query_data.question
        )
        
        # Add assistant response to conversation
        ConversationDB.add_message(
            conversation_id=conversation['id'],
            user_id=current_user['id'],
            assistant_id=assistant_id,
            role='assistant',
            content=result["answer"],
            metadata={"sources": result.get("sources", [])}
        )
        
        # Save query to history (for backward compatibility)
        query_record = UserQueryDB.create_query(
            user_id=current_user['id'],
            assistant_id=assistant_id,
            question=query_data.question,
            answer=result["answer"],
            sources=result.get("sources", [])
        )
        
        return {
            "id": query_record['id'],
            "question": query_record['question'],
            "answer": query_record['answer'],
            "sources": query_record['sources'],
            "timestamp": query_record['timestamp'].isoformat(),
            "username": current_user['username']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.get("/assistants/{assistant_id}/history", response_model=QueryHistoryResponse)
async def get_assistant_query_history(
    assistant_id: str,
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    # Verify assistant exists
    assistant = AssistantDB.get_assistant_by_id(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    try:
        # If user is admin, show all queries for this assistant within their admin code
        if current_user.get('role') == 'admin' and current_user.get('admin_code_id'):
            queries = UserQueryDB.get_all_queries_for_assistant_by_admin_code(current_user['admin_code_id'], assistant_id, limit)
        else:
            # Regular users only see their own queries
            queries = UserQueryDB.get_user_queries_for_assistant(current_user['id'], assistant_id, limit)
        return {"queries": queries}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting query history: {str(e)}")

@app.get("/queries/history", response_model=QueryHistoryResponse)
async def get_all_query_history(
    current_user: dict = Depends(get_current_user),
    limit: int = 100
):
    try:
        # If user is admin, show all queries from users under their admin code
        if current_user.get('role') == 'admin':
            queries = UserQueryDB.get_all_queries_by_admin_code(current_user['admin_code_id'], limit)
        else:
            # Regular users only see their own queries
            queries = UserQueryDB.get_all_user_queries(current_user['id'], limit)
        return {"queries": queries}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting query history: {str(e)}")

# LLM Configuration endpoints
@app.get("/llm/configurations")
async def get_llm_configurations(current_user: dict = Depends(get_current_admin_user)):
    """Get available LLM configurations for admins"""
    return {
        "default": LLMConfig.get_default_config(),
        "predefined": LLMConfig.get_available_configurations(),
        "validation": {
            "temperature_range": LLMConfig.TEMPERATURE_RANGE,
            "max_tokens_range": LLMConfig.MAX_TOKENS_RANGE
        }
    }

@app.post("/llm/validate")
async def validate_llm_config(
    config: dict,
    current_user: dict = Depends(get_current_admin_user)
):
    """Validate LLM configuration parameters"""
    errors = LLMConfig.validate_config(config)
    if errors:
        return {"valid": False, "errors": errors}
    else:
        normalized = LLMConfig.normalize_config(config)
        return {"valid": True, "normalized_config": normalized}

# Legacy endpoints for backward compatibility
@app.get("/assistant/config")
async def get_legacy_assistant_config(current_user: dict = Depends(get_current_user)):
    """Legacy endpoint - returns first assistant or default config"""
    try:
        assistants = AssistantDB.get_all_assistants()
        if assistants:
            assistant = assistants[0]
            return {
                "name": assistant['name'],
                "initial_context": assistant['initial_context'],
                "temperature": assistant['temperature'],
                "max_tokens": assistant['max_tokens'],
                "updated_at": assistant['updated_at']
            }
        else:
            # Return default config if no assistants exist
            return {
                "name": "Assistant",
                "initial_context": "You are a helpful AI assistant.",
                "temperature": 0.7,
                "max_tokens": 1000,
                "updated_at": "2025-01-01T00:00:00"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting legacy config: {str(e)}")

@app.put("/assistant/config")
async def update_legacy_assistant_config(
    config_data: dict,
    current_user: dict = Depends(get_current_admin_user)
):
    """Legacy endpoint - updates first assistant or creates one"""
    try:
        assistants = AssistantDB.get_all_assistants()
        if assistants:
            # Update first assistant
            assistant = AssistantDB.update_assistant(
                assistant_id=assistants[0]['id'],
                name=config_data.get('name'),
                initial_context=config_data.get('initial_context'),
                temperature=config_data.get('temperature'),
                max_tokens=config_data.get('max_tokens')
            )
            return {
                "name": assistant['name'],
                "initial_context": assistant['initial_context'],
                "temperature": assistant['temperature'],
                "max_tokens": assistant['max_tokens'],
                "updated_at": assistant['updated_at']
            }
        else:
            # Create new assistant if none exist
            assistant = AssistantDB.create_assistant(
                name=config_data.get('name', 'Assistant'),
                description="Legacy assistant configuration",
                initial_context=config_data.get('initial_context', 'You are a helpful AI assistant.'),
                temperature=config_data.get('temperature', 0.7),
                max_tokens=config_data.get('max_tokens', 1000)
            )
            return {
                "name": assistant['name'],
                "initial_context": assistant['initial_context'],
                "temperature": assistant['temperature'],
                "max_tokens": assistant['max_tokens'],
                "updated_at": assistant['updated_at']
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating legacy config: {str(e)}")

# Admin code management endpoints

@app.get("/admin/codes")
async def get_admin_codes(current_user: dict = Depends(get_current_admin_user)):
    """Get all admin codes created by current admin"""
    try:
        codes = AdminCodeDB.get_admin_codes_by_admin(current_user['id'])
        return {"codes": codes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting admin codes: {str(e)}")

@app.get("/admin/codes/{code}/validate")
async def validate_admin_code(code: str):
    """Validate if an admin code is valid for registration (legacy endpoint)"""
    try:
        is_valid = AdminCodeDB.can_register_user(code)
        admin_code = AdminCodeDB.get_admin_code_by_code(code) if is_valid else None
        return {
            "valid": is_valid,
            "admin_code": admin_code
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating admin code: {str(e)}")

@app.get("/user-codes/{user_code}/validate")
async def validate_user_code(user_code: str):
    """Validate if a user code is valid for registration"""
    try:
        is_valid = AdminCodeDB.can_register_user_with_user_code(user_code)
        admin_code = AdminCodeDB.get_admin_code_by_user_code(user_code) if is_valid else None
        return {
            "valid": is_valid,
            "admin_code": admin_code
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating user code: {str(e)}")

# Conversation monitoring endpoints
@app.get("/admin/conversations")
async def get_admin_conversations(
    current_user: dict = Depends(get_current_admin_user),
    limit: int = 100,
    user_id: Optional[str] = None,
    assistant_id: Optional[str] = None,
    username: Optional[str] = None
):
    """Get all conversations for users registered under current admin with optional filters"""
    try:
        print(f"Debug - Admin ID: {current_user['id']}, Filters: user_id={user_id}, assistant_id={assistant_id}, username={username}, limit={limit}")
        conversations = ConversationDB.get_conversations_by_admin(
            current_user['id'], 
            limit=limit,
            user_id=user_id,
            assistant_id=assistant_id,
            username=username
        )
        print(f"Debug - Found {len(conversations)} conversations")
        return {"conversations": conversations}
    except Exception as e:
        print(f"Debug - Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error getting conversations: {str(e)}")

@app.get("/admin/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Get all messages in a conversation"""
    try:
        messages = ConversationDB.get_conversation_messages(conversation_id)
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting conversation messages: {str(e)}")

# User management endpoints
@app.get("/admin/users")
async def get_admin_users(current_user: dict = Depends(get_current_admin_user)):
    """Get all users under the same admin code"""
    try:
        users = UserDB.get_users_by_admin_code(current_user['admin_code_id'])
        # Remove sensitive information
        for user in users:
            user.pop('hashed_password', None)
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting users: {str(e)}")

@app.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_admin_user)):
    """Delete a user and all their associated data"""
    try:
        # Check if user exists and belongs to the same admin code
        user_to_delete = UserDB.get_user_by_id(user_id)
        if not user_to_delete:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user_to_delete['admin_code_id'] != current_user['admin_code_id']:
            raise HTTPException(status_code=403, detail="Cannot delete user from different admin code")
        
        # Prevent admin from deleting themselves
        if user_id == current_user['id']:
            raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
        # Prevent deletion of other admins
        if user_to_delete['role'] == 'admin':
            raise HTTPException(status_code=400, detail="Cannot delete admin users")
        
        success = UserDB.delete_user_and_data(user_id, current_user['admin_code_id'])
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete user")
        
        return {"message": f"User {user_to_delete['username']} and all associated data deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        reload=settings.reload
    )