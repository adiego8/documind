from fastapi import APIRouter, HTTPException, Depends
from app.database import AssistantDB, UserQueryDB, ConversationDB
from app.auth import get_current_user
from app.schemas import QueryCreate, QueryHistoryResponse
from app.rag_service import RAGService

router = APIRouter(tags=["queries"])

@router.post("/assistants/{assistant_id}/query")
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
        assistant_rag_service = RAGService.create_for_assistant(
            assistant_id, 
            project_id=assistant.get('project_id'),
            assistant_config=assistant
        )
        
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

@router.get("/assistants/{assistant_id}/history", response_model=QueryHistoryResponse)
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

@router.get("/queries/history", response_model=QueryHistoryResponse)
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