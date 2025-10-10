"""
Projects Management Router
Admin interface for managing AssistantJS projects
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.models.projects import ProjectDB
from app.auth import get_current_admin_user

router = APIRouter(prefix="/projects", tags=["Projects"])

def get_admin_code_id(current_user: dict = Depends(get_current_admin_user)) -> str:
    """Helper function to extract admin_code_id from current user"""
    admin_code_id = current_user.get('admin_code_id')
    if not admin_code_id:
        raise HTTPException(status_code=400, detail="Admin must have an admin code")
    return admin_code_id

# Pydantic models
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    allowed_domains: Optional[List[str]] = Field(default_factory=list)
    allowed_assistants: Optional[List[str]] = Field(default_factory=list)
    requests_per_minute: int = Field(default=10, ge=1, le=1000)
    requests_per_day: int = Field(default=100, ge=1, le=10000)
    requests_per_session: int = Field(default=50, ge=1, le=1000)
    session_duration_minutes: int = Field(default=60, ge=5, le=1440)
    max_concurrent_sessions: int = Field(default=100, ge=1, le=10000)

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    allowed_domains: Optional[List[str]] = None
    allowed_assistants: Optional[List[str]] = None
    requests_per_minute: Optional[int] = Field(None, ge=1, le=1000)
    requests_per_day: Optional[int] = Field(None, ge=1, le=10000)
    requests_per_session: Optional[int] = Field(None, ge=1, le=1000)
    session_duration_minutes: Optional[int] = Field(None, ge=5, le=1440)
    max_concurrent_sessions: Optional[int] = Field(None, ge=1, le=10000)
    is_active: Optional[bool] = None

class ProjectResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str]
    allowed_domains: List[str]
    allowed_assistants: List[str]
    requests_per_minute: int
    requests_per_day: int
    requests_per_session: int
    session_duration_minutes: int
    max_concurrent_sessions: int
    is_active: bool
    created_at: str
    updated_at: str

class ProjectStatsResponse(BaseModel):
    active_sessions: int
    sessions_today: int
    sessions_30d: int
    requests_30d: int
    requests_today: int
    avg_daily_requests_30d: float
    requests_per_minute: int
    requests_per_day: int
    requests_per_session: int

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    admin_code_id: str = Depends(get_admin_code_id)
):
    """Create a new AssistantJS project"""
    try:
        created_project = ProjectDB.create_project(
            admin_code_id=admin_code_id,
            name=project.name,
            description=project.description,
            allowed_domains=project.allowed_domains,
            allowed_assistants=project.allowed_assistants,
            requests_per_minute=project.requests_per_minute,
            requests_per_day=project.requests_per_day,
            requests_per_session=project.requests_per_session,
            session_duration_minutes=project.session_duration_minutes,
            max_concurrent_sessions=project.max_concurrent_sessions
        )
        
        if not created_project:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create project"
            )
        
        return ProjectResponse(**created_project)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create project: {str(e)}"
        )

@router.get("/", response_model=List[ProjectResponse])
async def get_projects(
    admin_code_id: str = Depends(get_admin_code_id)
):
    """Get all projects for the admin code"""
    try:
        projects = ProjectDB.get_projects_by_admin_code(admin_code_id)
        return [ProjectResponse(**project) for project in projects]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch projects: {str(e)}"
        )

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    admin_code_id: str = Depends(get_admin_code_id)
):
    """Get a specific project by ID"""
    try:
        project = ProjectDB.get_project_by_admin_and_project_id(project_id, admin_code_id)
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        return ProjectResponse(**project)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project: {str(e)}"
        )

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    admin_code_id: str = Depends(get_admin_code_id)
):
    """Update a project"""
    try:
        # Check if project exists
        existing_project = ProjectDB.get_project_by_admin_and_project_id(project_id, admin_code_id)
        if not existing_project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Update project
        updated_project = ProjectDB.update_project(
            project_id=project_id,
            admin_code_id=admin_code_id,
            name=project_update.name,
            description=project_update.description,
            allowed_domains=project_update.allowed_domains,
            allowed_assistants=project_update.allowed_assistants,
            requests_per_minute=project_update.requests_per_minute,
            requests_per_day=project_update.requests_per_day,
            requests_per_session=project_update.requests_per_session,
            session_duration_minutes=project_update.session_duration_minutes,
            max_concurrent_sessions=project_update.max_concurrent_sessions,
            is_active=project_update.is_active
        )
        
        if not updated_project:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update project"
            )
        
        return ProjectResponse(**updated_project)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update project: {str(e)}"
        )

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    admin_code_id: str = Depends(get_admin_code_id)
):
    """Delete a project"""
    try:
        # Check if project exists
        existing_project = ProjectDB.get_project_by_admin_and_project_id(project_id, admin_code_id)
        if not existing_project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Delete project
        success = ProjectDB.delete_project(project_id, admin_code_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete project"
            )
        
        return {"message": "Project deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {str(e)}"
        )

@router.get("/{project_id}/stats", response_model=ProjectStatsResponse)
async def get_project_stats(
    project_id: str,
    admin_code_id: str = Depends(get_admin_code_id)
):
    """Get usage statistics for a project"""
    try:
        # Check if project exists
        existing_project = ProjectDB.get_project_by_admin_and_project_id(project_id, admin_code_id)
        if not existing_project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Get stats
        stats = ProjectDB.get_project_stats(project_id, admin_code_id)
        
        return ProjectStatsResponse(**stats)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project stats: {str(e)}"
        )