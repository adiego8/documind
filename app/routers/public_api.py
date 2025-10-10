"""
Public API Router
AssistantJS endpoints for frontend integration (like EmailJS)
"""
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import time
import html
import re
import logging
from datetime import datetime
from urllib.parse import urlparse
from app.models.projects import ProjectDB, SessionDB
from app.database import AssistantDB, ConversationDB
logger = logging.getLogger(__name__)

def redact_token(token: str, visible_chars: int = 8) -> str:
    """Redact sensitive tokens for safe logging"""
    if not token or len(token) <= visible_chars:
        return "***"
    return f"{token[:visible_chars]}...{token[-4:]}" if len(token) > visible_chars + 4 else f"{token[:visible_chars]}***"

router = APIRouter(prefix="/api/public", tags=["Public API"])

def sanitize_message(message: str) -> str:
    """Sanitize user message to prevent prompt injection and XSS"""
    if not message:
        return ""
    
    # Remove excessive whitespace
    message = message.strip()
    
    # Limit consecutive newlines
    message = re.sub(r'\n{3,}', '\n\n', message)
    
    # HTML escape to prevent XSS
    message = html.escape(message)
    
    # Remove potential prompt injection patterns
    injection_patterns = [
        r'(?i)ignore\s+previous\s+instructions',
        r'(?i)forget\s+everything',
        r'(?i)system\s*:',
        r'(?i)assistant\s*:',
        r'(?i)human\s*:',
        r'(?i)user\s*:',
        r'(?i)<\s*/?system\s*>',
        r'(?i)<\s*/?assistant\s*>',
        r'(?i)act\s+as\s+if',
        r'(?i)pretend\s+to\s+be',
        r'(?i)roleplay\s+as',
    ]
    
    for pattern in injection_patterns:
        message = re.sub(pattern, '[FILTERED]', message)
    
    return message

# Pydantic models
class SessionCreateRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    user_identifier: Optional[str] = Field(None, max_length=255)
    metadata: Optional[Dict[str, Any]] = None

class SessionCreateResponse(BaseModel):
    session_token: str
    expires_at: str
    project_id: str

class MessageRequest(BaseModel):
    session_token: str = Field(..., min_length=1)
    assistant_id: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1, max_length=10000)
    metadata: Optional[Dict[str, Any]] = None

class MessageResponse(BaseModel):
    message: str
    conversation_id: str
    processing_time_ms: int

def validate_domain(allowed_domains: List[str], origin: str) -> bool:
    """Check if origin domain is allowed"""
    if not allowed_domains:  # Empty list means all domains allowed
        return True
    
    if not origin:
        return False
    
    try:
        parsed = urlparse(origin)
        domain = parsed.netloc.lower()
        
        for allowed in allowed_domains:
            # Handle wildcards like *.example.com
            if allowed.startswith('*.'):
                pattern = allowed[2:]  # Remove *.
                if domain.endswith(f'.{pattern}') or domain == pattern:
                    return True
            else:
                if domain == allowed.lower():
                    return True
        
        return False
    except:
        return False

def get_client_info(request: Request) -> Dict[str, str]:
    """Extract client information from request"""
    return {
        'ip_address': request.client.host if request.client else None,
        'user_agent': request.headers.get('user-agent'),
        'origin': request.headers.get('origin'),
        'referer': request.headers.get('referer')
    }

@router.post("/sessions/create", response_model=SessionCreateResponse)
async def create_session(
    session_request: SessionCreateRequest,
    request: Request
):
    """Create a new public session (like EmailJS init)"""
    logger.info(f"Session creation request for project: {session_request.project_id}")
    try:
        start_time = time.time()

        # Get project
        project = ProjectDB.get_project_by_id(session_request.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or inactive"
            )

        # Get client info
        client_info = get_client_info(request)

        # Validate domain if restrictions are set
        if not validate_domain(project['allowed_domains'], client_info['origin']):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Domain not allowed for this project"
            )

        # Create session
        session = SessionDB.create_session(
            project_id=session_request.project_id,
            user_identifier=session_request.user_identifier,
            ip_address=client_info['ip_address'],
            user_agent=client_info['user_agent'],
            origin_domain=client_info['origin'],
            metadata=session_request.metadata
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session"
            )

        # Log with redacted token
        logger.info(f"Session created successfully: {redact_token(session['session_token'])}")

        return SessionCreateResponse(
            session_token=session['session_token'],
            expires_at=session['expires_at'].isoformat(),
            project_id=session['project_id']
        )

    except HTTPException as he:
        logger.warning(f"Session creation failed: {he.status_code} - {he.detail}")
        raise
    except Exception as e:
        logger.error(f"Session creation error for project {session_request.project_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session"
        )

@router.post("/assistants/message", response_model=MessageResponse)
async def send_message(
    message_request: MessageRequest,
):
    """Send message to assistant (like EmailJS send)"""
    # Log with redacted token
    logger.info(f"Message request - Session: {redact_token(message_request.session_token)}, Assistant: {message_request.assistant_id}")
    try:
        start_time = time.time()

        # Validate session
        session = SessionDB.get_session_by_token(message_request.session_token)
        logger.debug(f"Session validation result: {'valid' if session else 'invalid'}")
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token"
            )
        
        # Check rate limits
        rate_limit_status = SessionDB.check_rate_limit(message_request.session_token)
        if rate_limit_status['is_rate_limited']:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "limits": {
                        "minute": f"{rate_limit_status['current_minute_requests']}/{rate_limit_status['minute_limit']}",
                        "day": f"{rate_limit_status['current_day_requests']}/{rate_limit_status['day_limit']}",
                        "session": f"{rate_limit_status['current_session_requests']}/{rate_limit_status['session_limit']}"
                    }
                }
            )
        
        # Check if assistant is allowed for this project first
        allowed_assistants = session['allowed_assistants']
        if allowed_assistants and message_request.assistant_id not in allowed_assistants:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Assistant '{message_request.assistant_id}' not allowed for this project"
            )
        
        # Get assistant by name (public API uses assistant names, not IDs)
        assistant = None
        assistants = AssistantDB.get_all_assistants()
        for a in assistants:
            if a['name'] == message_request.assistant_id and a['is_active']:
                assistant = a
                break
        
        if not assistant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assistant '{message_request.assistant_id}' not found or inactive"
            )
        
        # Use project owner as the user for conversations
        from app.database import UserDB
        # Get the admin code for this project
        admin_code_id = session.get('admin_code_id') or ProjectDB.get_project_by_id(session['project_id'])['admin_code_id']
        
        # Get the first user with this admin code (project owner)
        users = UserDB.get_users_by_admin_code(admin_code_id)
        if not users:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No users found for this project"
            )
        user_id = users[0]['id']  # Use first user as project owner
        
        # Get or create conversation for this user and assistant
        conversation = ConversationDB.get_or_create_conversation(
            user_id=user_id,
            assistant_id=assistant['id']
        )
        conversation_id = conversation['id']
        
        # Sanitize user message
        sanitized_message = sanitize_message(message_request.message)
        
        # Validate message length after sanitization
        if len(sanitized_message) > 8000:  # Reduced from 10k for safety
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message too long after sanitization"
            )
        
        if not sanitized_message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )
        
        # Add user message
        ConversationDB.add_message(
            conversation_id=conversation_id,
            user_id=user_id,
            assistant_id=assistant['id'],
            role='user',
            content=sanitized_message,
            metadata=message_request.metadata
        )
        
        # Get assistant response using RAG
        from app.rag_service import RAGService
        # Use same scoping as frontend - assistant-based, not project-based
        assistant_rag_service = RAGService.create_for_assistant(
            assistant['id'], 
            project_id=assistant.get('project_id'),  # Same as frontend
            assistant_config=assistant
        )
        # Check vector store stats (debug level only)
        vector_stats = assistant_rag_service.vector_store.get_stats()
        logger.debug(f"Vector store stats for project {session['project_id']}: {vector_stats}")

        rag_result = assistant_rag_service.query(
            sanitized_message,
            system_instructions=assistant['initial_context']
        )

        logger.debug(f"RAG result - context_used: {rag_result.get('context_used', False)}, sources: {len(rag_result.get('sources', []))}")
        
        # Add assistant response
        ConversationDB.add_message(
            conversation_id=conversation_id,
            user_id=user_id,
            assistant_id=assistant['id'],
            role='assistant',
            content=rag_result["answer"],
            metadata={"sources": rag_result.get("sources", [])}
        )
        
        assistant_message = rag_result["answer"]
        
        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Record usage
        SessionDB.record_usage(
            session_token=message_request.session_token,
            assistant_id=message_request.assistant_id,
            endpoint="/assistants/message",
            method="POST",
            status_code=200,
            message_length=len(message_request.message),
            response_length=len(assistant_message),
            processing_time_ms=processing_time_ms
        )
        
        return MessageResponse(
            message=assistant_message,
            conversation_id=conversation_id,
            processing_time_ms=processing_time_ms
        )
        
    except HTTPException:
        # Record failed usage
        try:
            SessionDB.record_usage(
                session_token=message_request.session_token,
                assistant_id=message_request.assistant_id,
                endpoint="/assistants/message",
                method="POST",
                status_code=getattr(HTTPException, 'status_code', 500),
                message_length=len(message_request.message) if message_request.message else 0
            )
        except:
            pass  # Don't fail the main request if usage recording fails
        raise
    except Exception as e:
        # Log detailed error for debugging
        logger.error(f"Message processing failed for session {message_request.session_token}: {str(e)}")
        
        # Record failed usage
        try:
            SessionDB.record_usage(
                session_token=message_request.session_token,
                assistant_id=message_request.assistant_id if hasattr(message_request, 'assistant_id') else "unknown",
                endpoint="/assistants/message",
                method="POST",
                status_code=500,
                message_length=len(message_request.message) if hasattr(message_request, 'message') and message_request.message else 0
            )
        except:
            pass  # Don't fail the main request if usage recording fails
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Message processing failed"
        )

@router.get("/projects/{project_id}/info")
async def get_project_info(
    project_id: str,
    request: Request
):
    """Get basic project information (public endpoint)"""
    logger.info(f"Project info request - Project: {project_id}, Origin: {request.headers.get('origin')}")
    try:
        
        # Get project
        project = ProjectDB.get_project_by_id(project_id)
        if not project:
            logger.warning(f"Project not found: {project_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Get client info
        client_info = get_client_info(request)

        # Validate domain if restrictions are set
        domain_valid = validate_domain(project['allowed_domains'], client_info['origin'])

        if not domain_valid:
            logger.warning(f"Domain not allowed - Project: {project_id}, Origin: {client_info['origin']}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Domain not allowed for this project"
            )

        # Return safe project info
        return {
            "project_id": project['project_id'],
            "name": project['name'],
            "description": project['description'],
            "allowed_assistants": project['allowed_assistants'],
            "session_duration_minutes": project['session_duration_minutes'],
            "rate_limits": {
                "requests_per_minute": project['requests_per_minute'],
                "requests_per_day": project['requests_per_day'],
                "requests_per_session": project['requests_per_session']
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in project info for {project_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get project information"
        )

@router.get("/health")
async def health_check():
    """Public health check endpoint"""
    return {
        "status": "healthy",
        "service": "AssistantJS Public API",
        "timestamp": time.time()
    }