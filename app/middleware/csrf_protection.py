"""
CSRF Protection Middleware
Validates Origin/Referer headers for state-changing requests
"""
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to protect against CSRF attacks by validating Origin/Referer headers
    for state-changing HTTP methods (POST, PUT, DELETE, PATCH)
    """

    def __init__(self, app):
        super().__init__(app)
        self.state_changing_methods = {"POST", "PUT", "DELETE", "PATCH"}
        self.exempt_paths = {
            "/docs", "/redoc", "/openapi.json",
            "/health", "/api/public/health"
        }

    def is_origin_valid(self, origin: str) -> bool:
        """Check if origin is in allowed list"""
        if not origin:
            return False

        # Check against configured allowed origins
        for allowed in settings.allowed_origins:
            if origin == allowed or origin.startswith(allowed):
                return True

        return False

    async def dispatch(self, request: Request, call_next):
        """Main middleware logic"""

        # Skip CSRF check for safe methods (GET, HEAD, OPTIONS)
        if request.method not in self.state_changing_methods:
            return await call_next(request)

        # Skip CSRF check for exempt paths
        for exempt_path in self.exempt_paths:
            if request.url.path.startswith(exempt_path):
                return await call_next(request)

        # Get Origin or Referer header
        origin = request.headers.get("origin") or request.headers.get("referer")

        # For API endpoints using JWT (not cookies), be more lenient
        # But still validate if Origin is present
        if origin and not self.is_origin_valid(origin):
            logger.warning(
                f"CSRF validation failed - Invalid origin: {origin} "
                f"for {request.method} {request.url.path}"
            )
            return JSONResponse(
                status_code=403,
                content={
                    "detail": "Invalid origin for cross-site request",
                    "origin": origin
                }
            )

        # If no Origin/Referer header, check if request has valid JWT
        # (API requests with JWT in Authorization header are generally safe from CSRF)
        auth_header = request.headers.get("authorization", "")
        if not origin and not auth_header.startswith("Bearer "):
            logger.warning(
                f"CSRF validation failed - No origin and no Bearer token "
                f"for {request.method} {request.url.path}"
            )
            return JSONResponse(
                status_code=403,
                content={"detail": "Missing origin or authentication for state-changing request"}
            )

        return await call_next(request)
