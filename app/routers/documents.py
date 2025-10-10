from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import List
import tempfile
import os
import uuid
from app.database import AssistantDB, DocumentDB
from app.auth import get_current_user, get_current_admin_user
from app.document_processor import DocumentProcessor
from app.rag_service import RAGService
from app.config import settings

router = APIRouter(prefix="/assistants", tags=["documents"])

# Initialize document processor
document_processor = DocumentProcessor()

# File upload limits
MAX_FILE_SIZE = settings.max_file_size_bytes
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.txt'}

@router.post("/{assistant_id}/documents")
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
    rag_service = RAGService.create_for_assistant(
        assistant_id,
        project_id=assistant.get('project_id'),
        assistant_config=assistant
    )
    
    print(f"🔧 Document upload - assistant_id: {assistant_id}, project_id: {assistant.get('project_id')}")
    print(f"🔧 Vector store project_id: {rag_service.vector_store.project_id}")
    
    uploaded_files = []

    for file in files:
        # Validate file extension
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")

        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{file_ext}' not allowed. Supported types: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Read file content
        content = await file.read()
        file_size = len(content)

        # Validate file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File '{file.filename}' is too large ({file_size / 1024 / 1024:.2f}MB). Maximum allowed size is {settings.max_file_size_mb}MB"
            )

        if file_size == 0:
            raise HTTPException(
                status_code=400,
                detail=f"File '{file.filename}' is empty"
            )

        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
            
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
                print(f"🔧 Adding {len(documents)} documents to vector store")
                rag_service.add_documents(documents)
                print(f"🔧 Documents added. Checking stats...")
                stats = rag_service.get_document_stats()
                print(f"🔧 Vector store stats after upload: {stats}")
                
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

@router.get("/{assistant_id}/documents/stats")
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

@router.get("/{assistant_id}/documents")
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

@router.delete("/{assistant_id}/documents/{document_id}")
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
        try:
            rag_service = RAGService.create_for_assistant(
                assistant_id,
                project_id=assistant.get('project_id'),
                assistant_config=assistant
            )
            
            # Delete document from vector store
            deleted_count = rag_service.delete_document(document_id_prefix)
            print(f"Successfully deleted {deleted_count} chunks from vector store for document {document_id_prefix}")
                
        except Exception as e:
            print(f"Warning: Failed to delete chunks from vector store for document {document_id_prefix}: {e}")
            # Continue with database cleanup even if vector store cleanup fails
        
        # Delete document record from database
        DocumentDB.delete_document(document_id)
        
        return {
            "message": f"Successfully deleted document {document['filename']}",
            "document_id": document_id,
            "chunks_deleted": document['chunk_count']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")

@router.delete("/{assistant_id}/documents")
async def clear_assistant_documents(
    assistant_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    # Verify assistant exists
    assistant = AssistantDB.get_assistant_by_id(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    try:
        # Get count of documents before clearing
        stats = DocumentDB.get_documents_stats_by_assistant(assistant_id)
        file_count = stats['file_count']
        
        # Create RAG service and clear all documents from vector store
        try:
            rag_service = RAGService.create_for_assistant(
                assistant_id,
                project_id=assistant.get('project_id'),
                assistant_config=assistant
            )
            rag_service.clear_all_documents()
            print(f"Successfully cleared all documents from ChromaDB for assistant {assistant_id}")
        except Exception as e:
            print(f"Warning: Failed to clear documents from vector store for assistant {assistant_id}: {e}")
            # Continue with database cleanup even if vector store cleanup fails
        
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