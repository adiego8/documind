from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.database import AdminCodeDB, ConversationDB, UserDB
from app.auth import get_current_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/codes")
async def get_admin_codes(current_user: dict = Depends(get_current_admin_user)):
    """Get all admin codes created by current admin"""
    try:
        codes = AdminCodeDB.get_admin_codes_by_admin(current_user['id'])
        return {"codes": codes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting admin codes: {str(e)}")

@router.get("/conversations")
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

@router.get("/conversations/{conversation_id}/messages")
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

@router.get("/users")
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

@router.delete("/users/{user_id}")
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