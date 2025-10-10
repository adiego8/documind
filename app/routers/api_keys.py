"""
API Keys Management Router
Admin-scoped API key generation and management
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
import logging

from app.models.api_keys import APIKeyDB
from app.schemas import (
    APIKeyCreate, APIKeyResponse, APIKeyCreatedResponse, 
    APIKeyUpdate, APIKeyUsageStats, RateLimitStatus
)
from app.auth import get_current_admin_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api-keys", tags=["API Keys"])

@router.post("/", response_model=APIKeyCreatedResponse)
async def create_api_key(
    request: APIKeyCreate,
    current_user: dict = Depends(get_current_admin_user)
):
    """Create a new admin-scoped API key"""
    try:
        admin_code_id = current_user.get('admin_code_id')
        if not admin_code_id:
            raise HTTPException(status_code=400, detail="Admin must have an admin code")
        
        # Set default permissions if not provided
        permissions = request.permissions or {
            "chat": True,
            "assistants": "read",
            "documents": "read"
        }
        
        api_key = APIKeyDB.create_api_key(
            admin_code_id=admin_code_id,
            name=request.name,
            description=request.description,
            permissions=permissions,
            rate_limit_per_minute=request.rate_limit_per_minute or 60,
            rate_limit_per_day=request.rate_limit_per_day or 1000,
            expires_in_days=request.expires_in_days,
            created_by_user_id=current_user.get('user_id')
        )
        
        logger.info(f"Created API key '{request.name}' for admin {admin_code_id}")
        return api_key
        
    except Exception as e:
        logger.error(f"Failed to create API key: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create API key: {str(e)}")

@router.get("/", response_model=List[APIKeyResponse])
async def list_api_keys(
    current_user: dict = Depends(get_current_admin_user)
):
    """List all API keys for the current admin"""
    try:
        admin_code_id = current_user.get('admin_code_id')
        if not admin_code_id:
            raise HTTPException(status_code=400, detail="Admin must have an admin code")
        
        api_keys = APIKeyDB.get_api_keys_by_admin_code(admin_code_id)
        return api_keys
        
    except Exception as e:
        logger.error(f"Failed to list API keys: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list API keys: {str(e)}")

@router.get("/{key_id}", response_model=APIKeyResponse)
async def get_api_key(
    key_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Get a specific API key by ID"""
    try:
        admin_code_id = current_user.get('admin_code_id')
        if not admin_code_id:
            raise HTTPException(status_code=400, detail="Admin must have an admin code")
        
        api_key = APIKeyDB.get_api_key_by_id(key_id, admin_code_id)
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        return api_key
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get API key: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get API key: {str(e)}")

@router.put("/{key_id}", response_model=APIKeyResponse)
async def update_api_key(
    key_id: str,
    request: APIKeyUpdate,
    current_user: dict = Depends(get_current_admin_user)
):
    """Update an API key"""
    try:
        admin_code_id = current_user.get('admin_code_id')
        if not admin_code_id:
            raise HTTPException(status_code=400, detail="Admin must have an admin code")
        
        # Check if key exists
        existing_key = APIKeyDB.get_api_key_by_id(key_id, admin_code_id)
        if not existing_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        # Update the key
        updated_key = APIKeyDB.update_api_key(
            key_id=key_id,
            admin_code_id=admin_code_id,
            name=request.name,
            description=request.description,
            permissions=request.permissions,
            rate_limit_per_minute=request.rate_limit_per_minute,
            rate_limit_per_day=request.rate_limit_per_day,
            is_active=request.is_active
        )
        
        if not updated_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        logger.info(f"Updated API key {key_id} for admin {admin_code_id}")
        return updated_key
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update API key: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update API key: {str(e)}")

@router.delete("/{key_id}")
async def delete_api_key(
    key_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Delete an API key"""
    try:
        admin_code_id = current_user.get('admin_code_id')
        if not admin_code_id:
            raise HTTPException(status_code=400, detail="Admin must have an admin code")
        
        # Check if key exists
        existing_key = APIKeyDB.get_api_key_by_id(key_id, admin_code_id)
        if not existing_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        # Delete the key
        success = APIKeyDB.delete_api_key(key_id, admin_code_id)
        if not success:
            raise HTTPException(status_code=404, detail="API key not found")
        
        logger.info(f"Deleted API key {key_id} for admin {admin_code_id}")
        return {"message": "API key deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete API key: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete API key: {str(e)}")

@router.get("/{key_id}/usage", response_model=APIKeyUsageStats)
async def get_api_key_usage(
    key_id: str,
    days: int = 30,
    current_user: dict = Depends(get_current_admin_user)
):
    """Get usage statistics for an API key"""
    try:
        admin_code_id = current_user.get('admin_code_id')
        if not admin_code_id:
            raise HTTPException(status_code=400, detail="Admin must have an admin code")
        
        # Check if key exists
        existing_key = APIKeyDB.get_api_key_by_id(key_id, admin_code_id)
        if not existing_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        # Validate days parameter
        if days < 1 or days > 365:
            raise HTTPException(status_code=400, detail="Days must be between 1 and 365")
        
        # Get usage stats
        stats = APIKeyDB.get_usage_stats(key_id, admin_code_id, days)
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get API key usage: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get API key usage: {str(e)}")

@router.post("/{key_id}/regenerate", response_model=APIKeyCreatedResponse)
async def regenerate_api_key(
    key_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Regenerate an API key (creates new key, invalidates old one)"""
    try:
        admin_code_id = current_user.get('admin_code_id')
        if not admin_code_id:
            raise HTTPException(status_code=400, detail="Admin must have an admin code")
        
        # Check if key exists
        existing_key = APIKeyDB.get_api_key_by_id(key_id, admin_code_id)
        if not existing_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        # Create new key with same settings
        new_api_key = APIKeyDB.create_api_key(
            admin_code_id=admin_code_id,
            name=f"{existing_key['name']} (Regenerated)",
            description=existing_key['description'],
            permissions=existing_key['permissions'],
            rate_limit_per_minute=existing_key['rate_limit_per_minute'],
            rate_limit_per_day=existing_key['rate_limit_per_day'],
            created_by_user_id=current_user.get('user_id')
        )
        
        # Deactivate old key
        APIKeyDB.update_api_key(
            key_id=key_id,
            admin_code_id=admin_code_id,
            is_active=False
        )
        
        logger.info(f"Regenerated API key {key_id} for admin {admin_code_id}")
        return new_api_key
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to regenerate API key: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to regenerate API key: {str(e)}")

# Public endpoint for checking rate limits (used by middleware)
@router.get("/check-rate-limit/{api_key}", response_model=RateLimitStatus, include_in_schema=False)
async def check_rate_limit(api_key: str):
    """Internal endpoint to check rate limits for an API key"""
    try:
        rate_limit_status = APIKeyDB.check_rate_limit(api_key)
        return rate_limit_status
    except Exception as e:
        logger.error(f"Failed to check rate limit: {str(e)}")
        # Return rate limited status on error
        return {
            'current_minute_requests': 999,
            'current_day_requests': 999,
            'minute_limit': 0,
            'day_limit': 0,
            'is_rate_limited': True
        }

# Internal endpoint for recording usage (used by middleware)
@router.post("/record-usage", include_in_schema=False)
async def record_usage(
    request: Request
):
    """Internal endpoint to record API usage"""
    try:
        data = await request.json()
        
        success = APIKeyDB.record_usage(
            api_key=data.get('api_key'),
            endpoint=data.get('endpoint'),
            method=data.get('method'),
            status_code=data.get('status_code'),
            user_agent=data.get('user_agent'),
            ip_address=data.get('ip_address')
        )
        
        return {"success": success}
        
    except Exception as e:
        logger.error(f"Failed to record usage: {str(e)}")
        return {"success": False, "error": str(e)}