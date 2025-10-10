"""
API Keys Database Models
Admin-scoped API keys for client authentication
"""
import hashlib
import secrets
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import json
from app.database import get_db_connection

class APIKeyDB:
    """Database operations for API keys"""
    
    @staticmethod
    def generate_api_key() -> tuple[str, str, str]:
        """
        Generate a secure API key with prefix and hash
        Returns: (full_key, key_prefix, key_hash)
        """
        # Generate a secure random key (32 bytes = 256 bits)
        key_bytes = secrets.token_bytes(32)
        
        # Create the full key with prefix
        full_key = f"ak_live_{key_bytes.hex()}"
        
        # Extract prefix (first 8 characters for identification)
        key_prefix = full_key[:8]
        
        # Create hash for storage (never store the actual key)
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()
        
        return full_key, key_prefix, key_hash
    
    @staticmethod
    def hash_api_key(api_key: str) -> str:
        """Hash an API key for database lookup"""
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    @staticmethod
    def create_api_key(
        admin_code_id: str,
        name: str,
        description: Optional[str] = None,
        permissions: Optional[Dict[str, Any]] = None,
        rate_limit_per_minute: int = 60,
        rate_limit_per_day: int = 1000,
        expires_in_days: Optional[int] = None,
        created_by_user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new API key"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Generate the key
            full_key, key_prefix, key_hash = APIKeyDB.generate_api_key()
            
            # Set default permissions if not provided
            if permissions is None:
                permissions = {
                    "chat": True,
                    "assistants": "read",
                    "documents": "read"
                }
            
            # Calculate expiration if specified
            expires_at = None
            if expires_in_days:
                expires_at = datetime.now() + timedelta(days=expires_in_days)
            
            # Insert the key
            cursor.execute("""
                INSERT INTO api_keys (
                    admin_code_id, key_prefix, key_hash, name, description,
                    permissions, rate_limit_per_minute, rate_limit_per_day,
                    expires_at, created_by_user_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at, updated_at, last_used_at
            """, (
                admin_code_id, key_prefix, key_hash, name, description,
                json.dumps(permissions), rate_limit_per_minute, rate_limit_per_day,
                expires_at, created_by_user_id
            ))
            
            result = cursor.fetchone()
            conn.commit()
            
            if result:
                return {
                    'id': result[0],
                    'key': full_key,  # Only returned once during creation
                    'key_prefix': key_prefix,
                    'name': name,
                    'description': description,
                    'permissions': permissions,
                    'rate_limit_per_minute': rate_limit_per_minute,
                    'rate_limit_per_day': rate_limit_per_day,
                    'expires_at': expires_at,
                    'created_at': result[1],
                    'updated_at': result[2],
                    'last_used_at': result[3],
                    'is_active': True
                }
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_api_keys_by_admin_code(admin_code_id: str) -> List[Dict[str, Any]]:
        """Get all API keys for an admin code"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    id, key_prefix, name, description, permissions,
                    rate_limit_per_minute, rate_limit_per_day, expires_at,
                    last_used_at, is_active, created_at, updated_at
                FROM api_keys 
                WHERE admin_code_id = %s
                ORDER BY created_at DESC
            """, (admin_code_id,))
            
            results = cursor.fetchall()
            keys = []
            
            for result in results:
                keys.append({
                    'id': result[0],
                    'key_prefix': result[1],
                    'name': result[2],
                    'description': result[3],
                    'permissions': result[4] if isinstance(result[4], dict) else json.loads(result[4] or '{}'),
                    'rate_limit_per_minute': result[5],
                    'rate_limit_per_day': result[6],
                    'expires_at': result[7],
                    'last_used_at': result[8],
                    'is_active': result[9],
                    'created_at': result[10],
                    'updated_at': result[11]
                })
            
            return keys
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_api_key_by_hash(key_hash: str) -> Optional[Dict[str, Any]]:
        """Get API key details by hash for authentication"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    k.id, k.admin_code_id, k.key_prefix, k.name, k.permissions,
                    k.rate_limit_per_minute, k.rate_limit_per_day, k.expires_at,
                    k.last_used_at, k.is_active, k.created_at,
                    ac.code as admin_code
                FROM api_keys k
                JOIN admin_codes ac ON k.admin_code_id = ac.id
                WHERE k.key_hash = %s AND k.is_active = true
            """, (key_hash,))
            
            result = cursor.fetchone()
            if result:
                # Check if key is expired
                if result[7] and datetime.now() > result[7]:  # expires_at
                    return None
                
                return {
                    'id': result[0],
                    'admin_code_id': result[1],
                    'key_prefix': result[2],
                    'name': result[3],
                    'permissions': result[4] if isinstance(result[4], dict) else json.loads(result[4] or '{}'),
                    'rate_limit_per_minute': result[5],
                    'rate_limit_per_day': result[6],
                    'expires_at': result[7],
                    'last_used_at': result[8],
                    'is_active': result[9],
                    'created_at': result[10],
                    'admin_code': result[11]
                }
            return None
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def update_api_key(
        key_id: str,
        admin_code_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        permissions: Optional[Dict[str, Any]] = None,
        rate_limit_per_minute: Optional[int] = None,
        rate_limit_per_day: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> Optional[Dict[str, Any]]:
        """Update an API key"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Build dynamic update query
            updates = []
            params = []
            
            if name is not None:
                updates.append("name = %s")
                params.append(name)
            if description is not None:
                updates.append("description = %s")
                params.append(description)
            if permissions is not None:
                updates.append("permissions = %s")
                params.append(json.dumps(permissions))
            if rate_limit_per_minute is not None:
                updates.append("rate_limit_per_minute = %s")
                params.append(rate_limit_per_minute)
            if rate_limit_per_day is not None:
                updates.append("rate_limit_per_day = %s")
                params.append(rate_limit_per_day)
            if is_active is not None:
                updates.append("is_active = %s")
                params.append(is_active)
            
            if not updates:
                return APIKeyDB.get_api_key_by_id(key_id, admin_code_id)
            
            params.extend([key_id, admin_code_id])
            
            cursor.execute(f"""
                UPDATE api_keys 
                SET {', '.join(updates)}
                WHERE id = %s AND admin_code_id = %s
                RETURNING id, key_prefix, name, description, permissions,
                         rate_limit_per_minute, rate_limit_per_day, expires_at,
                         last_used_at, is_active, created_at, updated_at
            """, params)
            
            result = cursor.fetchone()
            conn.commit()
            
            if result:
                return {
                    'id': result[0],
                    'key_prefix': result[1],
                    'name': result[2],
                    'description': result[3],
                    'permissions': result[4] if isinstance(result[4], dict) else json.loads(result[4] or '{}'),
                    'rate_limit_per_minute': result[5],
                    'rate_limit_per_day': result[6],
                    'expires_at': result[7],
                    'last_used_at': result[8],
                    'is_active': result[9],
                    'created_at': result[10],
                    'updated_at': result[11]
                }
            return None
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_api_key_by_id(key_id: str, admin_code_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific API key by ID"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    id, key_prefix, name, description, permissions,
                    rate_limit_per_minute, rate_limit_per_day, expires_at,
                    last_used_at, is_active, created_at, updated_at
                FROM api_keys 
                WHERE id = %s AND admin_code_id = %s
            """, (key_id, admin_code_id))
            
            result = cursor.fetchone()
            if result:
                return {
                    'id': result[0],
                    'key_prefix': result[1],
                    'name': result[2],
                    'description': result[3],
                    'permissions': result[4] if isinstance(result[4], dict) else json.loads(result[4] or '{}'),
                    'rate_limit_per_minute': result[5],
                    'rate_limit_per_day': result[6],
                    'expires_at': result[7],
                    'last_used_at': result[8],
                    'is_active': result[9],
                    'created_at': result[10],
                    'updated_at': result[11]
                }
            return None
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def delete_api_key(key_id: str, admin_code_id: str) -> bool:
        """Delete an API key"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "DELETE FROM api_keys WHERE id = %s AND admin_code_id = %s",
                (key_id, admin_code_id)
            )
            conn.commit()
            return cursor.rowcount > 0
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def check_rate_limit(api_key: str) -> Dict[str, Any]:
        """Check if API key is within rate limits"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            key_hash = APIKeyDB.hash_api_key(api_key)
            
            cursor.execute("""
                SELECT * FROM get_api_key_rate_limit_status(%s)
            """, (key_hash,))
            
            result = cursor.fetchone()
            if result:
                return {
                    'current_minute_requests': result[0],
                    'current_day_requests': result[1],
                    'minute_limit': result[2],
                    'day_limit': result[3],
                    'is_rate_limited': result[4]
                }
            
            return {
                'current_minute_requests': 0,
                'current_day_requests': 0,
                'minute_limit': 0,
                'day_limit': 0,
                'is_rate_limited': True
            }
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def record_usage(
        api_key: str,
        endpoint: str,
        method: str,
        status_code: int,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        """Record API key usage"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            key_hash = APIKeyDB.hash_api_key(api_key)
            
            cursor.execute("""
                SELECT record_api_usage(%s, %s, %s, %s, %s, %s)
            """, (key_hash, endpoint, method, status_code, user_agent, ip_address))
            
            result = cursor.fetchone()
            conn.commit()
            
            return result[0] if result else False
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_usage_stats(key_id: str, admin_code_id: str, days: int = 30) -> Dict[str, Any]:
        """Get usage statistics for an API key"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                WITH usage_stats AS (
                    SELECT 
                        COUNT(*) as total_requests,
                        COUNT(DISTINCT request_date) as active_days,
                        COUNT(*) FILTER (WHERE status_code >= 400) as error_requests
                    FROM api_key_usage u
                    JOIN api_keys k ON u.api_key_id = k.id
                    WHERE k.id = %s AND k.admin_code_id = %s
                      AND u.created_at >= NOW() - INTERVAL '%s days'
                ),
                recent_usage AS (
                    SELECT COUNT(*) as recent_requests
                    FROM api_key_usage u
                    JOIN api_keys k ON u.api_key_id = k.id
                    WHERE k.id = %s AND k.admin_code_id = %s
                      AND u.created_at >= NOW() - INTERVAL '7 days'
                ),
                last_request AS (
                    SELECT MAX(u.created_at) as last_request_time
                    FROM api_key_usage u
                    JOIN api_keys k ON u.api_key_id = k.id
                    WHERE k.id = %s AND k.admin_code_id = %s
                      AND u.created_at >= NOW() - INTERVAL '%s days'
                )
                SELECT 
                    us.total_requests,
                    us.active_days,
                    COALESCE(ru.recent_requests / 7.0, 0) as avg_requests_last_7_days,
                    lr.last_request_time,
                    us.error_requests
                FROM usage_stats us
                CROSS JOIN recent_usage ru
                CROSS JOIN last_request lr
            """, (key_id, admin_code_id, days, key_id, admin_code_id, key_id, admin_code_id, days))
            
            result = cursor.fetchone()
            if result:
                total_requests = result[0] or 0
                error_requests = result[4] or 0
                return {
                    'total_requests': total_requests,
                    'active_days': result[1] or 0,
                    'avg_requests_last_7_days': float(result[2] or 0),
                    'last_request': result[3],
                    'error_requests': error_requests,
                    'success_rate': ((total_requests - error_requests) / total_requests * 100) if total_requests > 0 else 0
                }
            
            return {
                'total_requests': 0,
                'active_days': 0,
                'avg_requests_last_7_days': 0,
                'last_request': None,
                'error_requests': 0,
                'success_rate': 0
            }
            
        finally:
            cursor.close()
            conn.close()