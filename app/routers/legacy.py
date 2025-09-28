from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import List, Optional
import os
import tempfile
from app.database import AssistantDB, AdminCodeDB, UserQueryDB
from app.auth import get_current_user, get_current_admin_user
from app.schemas import QueryRequest
from app.document_processor import DocumentProcessor
from app.vector_store import VectorStore
from app.rag_service import RAGService

router = APIRouter(tags=["legacy"])

# Initialize services
document_processor = DocumentProcessor()

def check_vector_store():
    """Check if vector store is available"""
    from app.main import vector_store
    if not vector_store:
        raise HTTPException(status_code=503, detail="Vector store not available - OpenAI API key required")
    return vector_store

def check_rag_service():
    """Check if RAG service is available"""
    from app.main import rag_service
    if not rag_service:
        raise HTTPException(status_code=503, detail="RAG service not available - OpenAI API key required")
    return rag_service

@router.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...), current_user: dict = Depends(get_current_admin_user)):
    """Legacy document upload endpoint"""
    vector_store = check_vector_store()
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

@router.post("/upload-directory")
async def upload_directory(directory_path: str = Form(...), current_user: dict = Depends(get_current_admin_user)):
    """Legacy directory upload endpoint"""
    vector_store = check_vector_store()
    
    if not os.path.exists(directory_path):
        raise HTTPException(status_code=400, detail="Directory does not exist")
    
    try:
        documents = document_processor.process_directory(directory_path)
        vector_store.add_documents(documents)
        return {"message": f"Successfully processed directory with {len(documents)} document chunks"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing directory: {str(e)}")

@router.post("/query", response_model=dict)
async def query_documents(question: str = Form(...), n_results: int = Form(5)):
    """Legacy query endpoint"""
    rag_service = check_rag_service()
    
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

@router.post("/query-json", response_model=dict)
async def query_documents_json(request: QueryRequest):
    """Legacy JSON query endpoint"""
    rag_service = check_rag_service()
    
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

@router.get("/stats")
async def get_stats():
    """Legacy stats endpoint"""
    vector_store = check_vector_store()
    return {
        "document_count": vector_store.get_collection_count(),
        "collection_name": vector_store.collection_name
    }

@router.delete("/documents")
async def clear_documents(current_user: dict = Depends(get_current_admin_user)):
    """Legacy clear documents endpoint"""
    vector_store = check_vector_store()
    vector_store.delete_collection()
    return {"message": "All documents cleared from the database"}

@router.get("/assistant/config")
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

@router.put("/assistant/config")
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

@router.get("/admin/codes/{code}/validate")
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

@router.get("/user-codes/{user_code}/validate")
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