from fastapi import APIRouter, HTTPException, Depends
from app.database import AssistantDB, DocumentDB
from app.auth import get_current_user, get_current_admin_user
from app.schemas import AssistantCreate, AssistantUpdate, AssistantResponse, AssistantsListResponse
from app.llm_config import LLMConfig
from app.rag_service import RAGService

router = APIRouter(prefix="/assistants", tags=["assistants"])

@router.get("", response_model=AssistantsListResponse)
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

@router.get("/{assistant_id}", response_model=AssistantResponse)
async def get_assistant(assistant_id: int, current_user: dict = Depends(get_current_user)):
    assistant = AssistantDB.get_assistant_by_id(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    return assistant

@router.post("", response_model=AssistantResponse)
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

@router.put("/{assistant_id}", response_model=AssistantResponse)
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

@router.delete("/{assistant_id}")
async def delete_assistant(
    assistant_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    # Verify assistant exists before deletion
    assistant = AssistantDB.get_assistant_by_id(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    try:
        # Get all documents for this assistant to clean up ChromaDB
        documents = DocumentDB.get_documents_by_assistant(assistant_id)
        
        # Delete the entire ChromaDB collection for this assistant
        collection_deleted = False
        try:
            # Create RAG service for this assistant
            rag_service = RAGService.create_for_assistant(
                assistant_id,
                project_id=assistant.get('project_id'),
                assistant_config=assistant
            )
            
            # Delete the entire collection for this assistant
            rag_service.clear_all_documents()
            collection_deleted = True
            print(f"Successfully deleted entire collection for assistant {assistant_id}")
                
        except Exception as e:
            print(f"Warning: Failed to delete ChromaDB collection for assistant {assistant_id}: {e}")
            # Continue with database cleanup even if vector store cleanup fails
        
        # Delete all document records from database
        for document in documents:
            DocumentDB.delete_document(document['id'])
        
        # Finally, soft delete the assistant
        success = AssistantDB.delete_assistant(assistant_id)
        if not success:
            raise HTTPException(status_code=404, detail="Assistant not found")
        
        return {
            "message": "Assistant deleted successfully",
            "assistant_id": assistant_id,
            "documents_deleted": len(documents),
            "collection_deleted": collection_deleted
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting assistant: {str(e)}")