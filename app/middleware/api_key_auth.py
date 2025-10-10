"""
API Key Authentication Middleware
Handles API key validation, rate limiting, and usage tracking
"""
import time
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.models.api_keys import APIKeyDB
import logging

logger = logging.getLogger(__name__)

class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle API key authentication for external client access
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.api_key_endpoints = {
            # Chat endpoints that should support API key auth
            "/chat": ["POST"],
            "/queries/ask": ["POST"],
            
            # Assistant endpoints for API access
            "/assistants": ["GET"],
            "/assistants/{assistant_id}": ["GET"],
            
            # Document endpoints for API access
            "/documents": ["GET"],
            "/documents/{document_id}": ["GET"],
            
            # Health check (always allowed)
            "/health": ["GET"],
        }
        
        # Endpoints that should bypass API key auth (use JWT only)
        self.bypass_endpoints = {
            "/docs", "/redoc", "/openapi.json",
            "/auth/", "/admin/", "/cms/", "/api-keys/", "/projects/",
            "/api/public/", "/assistantjs.js",
            "/", "/health"
        }
    
    def should_check_api_key(self, path: str, method: str) -> bool:
        """Determine if this endpoint should be checked for API key auth"""
        
        # Skip bypass endpoints
        for bypass_path in self.bypass_endpoints:
            if path.startswith(bypass_path):
                return False
        
        # Check if it's an API endpoint that supports API key auth
        for endpoint_pattern, allowed_methods in self.api_key_endpoints.items():
            if self._path_matches_pattern(path, endpoint_pattern) and method in allowed_methods:
                return True
        
        return False
    
    def _path_matches_pattern(self, path: str, pattern: str) -> bool:
        """Check if a path matches a pattern with path parameters"""
        # Simple pattern matching for {param} style parameters
        if "{" not in pattern:
            return path == pattern
        
        path_parts = path.strip("/").split("/")
        pattern_parts = pattern.strip("/").split("/")
        
        if len(path_parts) != len(pattern_parts):
            return False
        
        for path_part, pattern_part in zip(path_parts, pattern_parts):
            if pattern_part.startswith("{") and pattern_part.endswith("}"):
                continue  # This is a parameter, accept any value
            if path_part != pattern_part:
                return False
        
        return True
    
    def extract_api_key(self, request: Request) -> str:
        """Extract API key from request headers or query params"""
        # Check Authorization header: "Bearer ak_live_..."
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer ak_"):
            return auth_header.replace("Bearer ", "")
        
        # Check X-API-Key header
        api_key_header = request.headers.get("X-API-Key", "")
        if api_key_header.startswith("ak_"):
            return api_key_header
        
        # Check query parameter (less secure, but supported)
        api_key_param = request.query_params.get("api_key", "")
        if api_key_param.startswith("ak_"):
            return api_key_param
        
        return ""
    
    async def dispatch(self, request: Request, call_next):
        """Main middleware logic"""
        start_time = time.time()
        
        # Check if this endpoint requires API key authentication
        if not self.should_check_api_key(request.url.path, request.method):
            # Continue with normal JWT authentication
            response = await call_next(request)
            return response
        
        # Extract API key
        api_key = self.extract_api_key(request)
        
        if not api_key:
            # No API key provided, continue with JWT auth
            response = await call_next(request)
            return response
        
        try:
            # Validate API key
            key_hash = APIKeyDB.hash_api_key(api_key)
            key_data = APIKeyDB.get_api_key_by_hash(key_hash)
            
            if not key_data or not key_data.get('is_active'):
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or inactive API key"}
                )
            
            # Check rate limits
            rate_limit_status = APIKeyDB.check_rate_limit(api_key)
            
            if rate_limit_status.get('is_rate_limited'):
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Rate limit exceeded",
                        "current_minute_requests": rate_limit_status.get('current_minute_requests'),
                        "minute_limit": rate_limit_status.get('minute_limit'),
                        "current_day_requests": rate_limit_status.get('current_day_requests'),
                        "day_limit": rate_limit_status.get('day_limit')
                    },
                    headers={
                        "X-RateLimit-Limit-Minute": str(rate_limit_status.get('minute_limit', 0)),
                        "X-RateLimit-Remaining-Minute": str(max(0, rate_limit_status.get('minute_limit', 0) - rate_limit_status.get('current_minute_requests', 0))),
                        "X-RateLimit-Limit-Day": str(rate_limit_status.get('day_limit', 0)),
                        "X-RateLimit-Remaining-Day": str(max(0, rate_limit_status.get('day_limit', 0) - rate_limit_status.get('current_day_requests', 0)))
                    }
                )
            
            # Check permissions (basic check - can be extended)
            permissions = key_data.get('permissions', {})
            if not self._check_endpoint_permission(request.url.path, request.method, permissions):
                return JSONResponse(
                    status_code=403,
                    content={"detail": "API key does not have permission for this endpoint"}
                )
            
            # Add API key context to request for downstream handlers
            request.state.api_key = api_key
            request.state.api_key_data = key_data
            request.state.admin_code_id = key_data.get('admin_code_id')
            request.state.admin_code = key_data.get('admin_code')
            
            # Process the request
            response = await call_next(request)
            
            # Record usage after successful request
            try:
                APIKeyDB.record_usage(
                    api_key=api_key,
                    endpoint=request.url.path,
                    method=request.method,
                    status_code=response.status_code,
                    user_agent=request.headers.get("User-Agent"),
                    ip_address=request.client.host if request.client else None
                )
            except Exception as e:
                logger.error(f"Failed to record API usage: {e}")
            
            # Add rate limit headers to response
            response.headers["X-RateLimit-Limit-Minute"] = str(rate_limit_status.get('minute_limit', 0))
            response.headers["X-RateLimit-Remaining-Minute"] = str(max(0, rate_limit_status.get('minute_limit', 0) - rate_limit_status.get('current_minute_requests', 0) - 1))
            response.headers["X-RateLimit-Limit-Day"] = str(rate_limit_status.get('day_limit', 0))
            response.headers["X-RateLimit-Remaining-Day"] = str(max(0, rate_limit_status.get('day_limit', 0) - rate_limit_status.get('current_day_requests', 0) - 1))
            
            # Add processing time header
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            logger.error(f"API key authentication error: {e}")
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error during authentication"}
            )
    
    def _check_endpoint_permission(self, path: str, method: str, permissions: dict) -> bool:
        """Check if the API key has permission for this endpoint"""
        
        # Chat endpoints
        if path.startswith("/chat") or path.startswith("/queries"):
            return permissions.get("chat", False)
        
        # Assistant endpoints
        if path.startswith("/assistants"):
            assistant_perm = permissions.get("assistants", "none")
            if method == "GET":
                return assistant_perm in ["read", "write", "admin"]
            elif method in ["POST", "PUT", "DELETE"]:
                return assistant_perm in ["write", "admin"]
        
        # Document endpoints
        if path.startswith("/documents"):
            document_perm = permissions.get("documents", "none")
            if method == "GET":
                return document_perm in ["read", "write", "admin"]
            elif method in ["POST", "PUT", "DELETE"]:
                return document_perm in ["write", "admin"]
        
        # Default: allow if no specific permission check
        return True