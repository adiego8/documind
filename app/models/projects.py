"""
Projects Database Models
AssistantJS-style project management for frontend integrations
"""
import json
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from app.database import get_db_connection

class ProjectDB:
    """Database operations for AssistantJS projects"""
    
    @staticmethod
    def create_project(
        admin_code_id: str,
        name: str,
        description: Optional[str] = None,
        allowed_domains: Optional[List[str]] = None,
        allowed_assistants: Optional[List[str]] = None,
        requests_per_minute: int = 10,
        requests_per_day: int = 100,
        requests_per_session: int = 50,
        session_duration_minutes: int = 60,
        max_concurrent_sessions: int = 100,
        created_by_user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new project"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Generate unique project ID
            cursor.execute("SELECT generate_project_id()")
            project_id = cursor.fetchone()[0]
            
            # Set default values
            if allowed_domains is None:
                allowed_domains = []
            if allowed_assistants is None:
                allowed_assistants = []  # Empty means all assistants allowed
            
            # Insert the project
            cursor.execute("""
                INSERT INTO projects (
                    admin_code_id, project_id, name, description,
                    allowed_domains, allowed_assistants,
                    requests_per_minute, requests_per_day, requests_per_session,
                    session_duration_minutes, max_concurrent_sessions,
                    created_by_user_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at, updated_at
            """, (
                admin_code_id, project_id, name, description,
                json.dumps(allowed_domains), json.dumps(allowed_assistants),
                requests_per_minute, requests_per_day, requests_per_session,
                session_duration_minutes, max_concurrent_sessions,
                created_by_user_id
            ))
            
            result = cursor.fetchone()
            conn.commit()
            
            if result:
                return {
                    'id': str(result[0]),
                    'project_id': project_id,
                    'name': name,
                    'description': description,
                    'allowed_domains': allowed_domains,
                    'allowed_assistants': allowed_assistants,
                    'requests_per_minute': requests_per_minute,
                    'requests_per_day': requests_per_day,
                    'requests_per_session': requests_per_session,
                    'session_duration_minutes': session_duration_minutes,
                    'max_concurrent_sessions': max_concurrent_sessions,
                    'is_active': True,
                    'created_at': result[1].isoformat() if result[1] else None,
                    'updated_at': result[2].isoformat() if result[2] else None
                }
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_projects_by_admin_code(admin_code_id: str) -> List[Dict[str, Any]]:
        """Get all projects for an admin code"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    id, project_id, name, description, allowed_domains,
                    allowed_assistants, requests_per_minute, requests_per_day,
                    requests_per_session, session_duration_minutes,
                    max_concurrent_sessions, is_active, created_at, updated_at
                FROM projects 
                WHERE admin_code_id = %s
                ORDER BY created_at DESC
            """, (admin_code_id,))
            
            results = cursor.fetchall()
            projects = []
            
            for result in results:
                projects.append({
                    'id': str(result[0]),
                    'project_id': result[1],
                    'name': result[2],
                    'description': result[3],
                    'allowed_domains': result[4] if isinstance(result[4], list) else json.loads(result[4] or '[]'),
                    'allowed_assistants': result[5] if isinstance(result[5], list) else json.loads(result[5] or '[]'),
                    'requests_per_minute': result[6],
                    'requests_per_day': result[7],
                    'requests_per_session': result[8],
                    'session_duration_minutes': result[9],
                    'max_concurrent_sessions': result[10],
                    'is_active': result[11],
                    'created_at': result[12].isoformat() if result[12] else None,
                    'updated_at': result[13].isoformat() if result[13] else None
                })
            
            return projects
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_project_by_id(project_id: str) -> Optional[Dict[str, Any]]:
        """Get project by project_id (public ID)"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    id, admin_code_id, project_id, name, description,
                    allowed_domains, allowed_assistants,
                    requests_per_minute, requests_per_day, requests_per_session,
                    session_duration_minutes, max_concurrent_sessions,
                    is_active, created_at, updated_at
                FROM projects 
                WHERE project_id = %s AND is_active = true
            """, (project_id,))
            
            result = cursor.fetchone()
            if result:
                return {
                    'id': str(result[0]),
                    'admin_code_id': str(result[1]),
                    'project_id': result[2],
                    'name': result[3],
                    'description': result[4],
                    'allowed_domains': result[5] if isinstance(result[5], list) else json.loads(result[5] or '[]'),
                    'allowed_assistants': result[6] if isinstance(result[6], list) else json.loads(result[6] or '[]'),
                    'requests_per_minute': result[7],
                    'requests_per_day': result[8],
                    'requests_per_session': result[9],
                    'session_duration_minutes': result[10],
                    'max_concurrent_sessions': result[11],
                    'is_active': result[12],
                    'created_at': result[13].isoformat() if result[13] else None,
                    'updated_at': result[14].isoformat() if result[14] else None
                }
            return None
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def update_project(
        project_id: str,
        admin_code_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        allowed_domains: Optional[List[str]] = None,
        allowed_assistants: Optional[List[str]] = None,
        requests_per_minute: Optional[int] = None,
        requests_per_day: Optional[int] = None,
        requests_per_session: Optional[int] = None,
        session_duration_minutes: Optional[int] = None,
        max_concurrent_sessions: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> Optional[Dict[str, Any]]:
        """Update a project"""
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
            if allowed_domains is not None:
                updates.append("allowed_domains = %s")
                params.append(json.dumps(allowed_domains))
            if allowed_assistants is not None:
                updates.append("allowed_assistants = %s")
                params.append(json.dumps(allowed_assistants))
            if requests_per_minute is not None:
                updates.append("requests_per_minute = %s")
                params.append(requests_per_minute)
            if requests_per_day is not None:
                updates.append("requests_per_day = %s")
                params.append(requests_per_day)
            if requests_per_session is not None:
                updates.append("requests_per_session = %s")
                params.append(requests_per_session)
            if session_duration_minutes is not None:
                updates.append("session_duration_minutes = %s")
                params.append(session_duration_minutes)
            if max_concurrent_sessions is not None:
                updates.append("max_concurrent_sessions = %s")
                params.append(max_concurrent_sessions)
            if is_active is not None:
                updates.append("is_active = %s")
                params.append(is_active)
            
            if not updates:
                return ProjectDB.get_project_by_admin_and_project_id(project_id, admin_code_id)
            
            params.extend([project_id, admin_code_id])
            
            cursor.execute(f"""
                UPDATE projects 
                SET {', '.join(updates)}
                WHERE project_id = %s AND admin_code_id = %s
                RETURNING id, project_id, name, description, allowed_domains,
                         allowed_assistants, requests_per_minute, requests_per_day,
                         requests_per_session, session_duration_minutes,
                         max_concurrent_sessions, is_active, created_at, updated_at
            """, params)
            
            result = cursor.fetchone()
            conn.commit()
            
            if result:
                return {
                    'id': str(result[0]),
                    'project_id': result[1],
                    'name': result[2],
                    'description': result[3],
                    'allowed_domains': result[4] if isinstance(result[4], list) else json.loads(result[4] or '[]'),
                    'allowed_assistants': result[5] if isinstance(result[5], list) else json.loads(result[5] or '[]'),
                    'requests_per_minute': result[6],
                    'requests_per_day': result[7],
                    'requests_per_session': result[8],
                    'session_duration_minutes': result[9],
                    'max_concurrent_sessions': result[10],
                    'is_active': result[11],
                    'created_at': result[12].isoformat() if result[12] else None,
                    'updated_at': result[13].isoformat() if result[13] else None
                }
            return None
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_project_by_admin_and_project_id(project_id: str, admin_code_id: str) -> Optional[Dict[str, Any]]:
        """Get a project by project_id and admin_code_id (for admin operations)"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    id, project_id, name, description, allowed_domains,
                    allowed_assistants, requests_per_minute, requests_per_day,
                    requests_per_session, session_duration_minutes,
                    max_concurrent_sessions, is_active, created_at, updated_at
                FROM projects 
                WHERE project_id = %s AND admin_code_id = %s
            """, (project_id, admin_code_id))
            
            result = cursor.fetchone()
            if result:
                return {
                    'id': str(result[0]),
                    'project_id': result[1],
                    'name': result[2],
                    'description': result[3],
                    'allowed_domains': result[4] if isinstance(result[4], list) else json.loads(result[4] or '[]'),
                    'allowed_assistants': result[5] if isinstance(result[5], list) else json.loads(result[5] or '[]'),
                    'requests_per_minute': result[6],
                    'requests_per_day': result[7],
                    'requests_per_session': result[8],
                    'session_duration_minutes': result[9],
                    'max_concurrent_sessions': result[10],
                    'is_active': result[11],
                    'created_at': result[12].isoformat() if result[12] else None,
                    'updated_at': result[13].isoformat() if result[13] else None
                }
            return None
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def delete_project(project_id: str, admin_code_id: str) -> bool:
        """Delete a project"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "DELETE FROM projects WHERE project_id = %s AND admin_code_id = %s",
                (project_id, admin_code_id)
            )
            conn.commit()
            return cursor.rowcount > 0
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_project_stats(project_id: str, admin_code_id: str) -> Dict[str, Any]:
        """Get usage statistics for a project"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    active_sessions, sessions_today, sessions_30d,
                    requests_30d, requests_today, avg_daily_requests_30d,
                    requests_per_minute, requests_per_day, requests_per_session
                FROM project_stats 
                WHERE project_id = %s AND admin_code_id = %s
            """, (project_id, admin_code_id))
            
            result = cursor.fetchone()
            if result:
                return {
                    'active_sessions': result[0] or 0,
                    'sessions_today': result[1] or 0,
                    'sessions_30d': result[2] or 0,
                    'requests_30d': result[3] or 0,
                    'requests_today': result[4] or 0,
                    'avg_daily_requests_30d': float(result[5] or 0),
                    'requests_per_minute': result[6],
                    'requests_per_day': result[7],
                    'requests_per_session': result[8]
                }
            
            return {
                'active_sessions': 0,
                'sessions_today': 0,
                'sessions_30d': 0,
                'requests_30d': 0,
                'requests_today': 0,
                'avg_daily_requests_30d': 0,
                'requests_per_minute': 0,
                'requests_per_day': 0,
                'requests_per_session': 0
            }
            
        finally:
            cursor.close()
            conn.close()


class SessionDB:
    """Database operations for public sessions"""
    
    @staticmethod
    def create_session(
        project_id: str,
        user_identifier: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        origin_domain: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Create a new public session"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get project settings
            project = ProjectDB.get_project_by_id(project_id)
            if not project:
                return None
            
            # Generate session token
            cursor.execute("SELECT generate_session_token()")
            session_token = cursor.fetchone()[0]
            
            # Calculate expiration using UTC to match database NOW()
            expires_at = datetime.utcnow() + timedelta(minutes=project['session_duration_minutes'])
            
            # Create session
            cursor.execute("""
                INSERT INTO public_sessions (
                    project_id, session_token, user_identifier,
                    ip_address, user_agent, origin_domain, expires_at, metadata
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at
            """, (
                project_id, session_token, user_identifier,
                ip_address, user_agent, origin_domain, expires_at,
                json.dumps(metadata or {})
            ))
            
            result = cursor.fetchone()
            conn.commit()
            
            if result:
                return {
                    'id': result[0],
                    'session_token': session_token,
                    'project_id': project_id,
                    'expires_at': expires_at,
                    'created_at': result[1]
                }
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_session_by_token(session_token: str) -> Optional[Dict[str, Any]]:
        """Get session by token (for authentication)"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # First check the timestamps to debug the timezone issue
            cursor.execute("""
                SELECT 
                    s.expires_at, 
                    NOW() as current_time,
                    s.expires_at > NOW() as not_expired,
                    EXTRACT(EPOCH FROM s.expires_at) as expires_epoch,
                    EXTRACT(EPOCH FROM NOW()) as now_epoch
                FROM public_sessions s
                WHERE s.session_token = %s
            """, (session_token,))
            
            debug_result = cursor.fetchone()
            if debug_result:
                print(f"🕐 Timestamp debug - expires_at: {debug_result[0]}, NOW(): {debug_result[1]}")
                print(f"🕐 not_expired: {debug_result[2]}, expires_epoch: {debug_result[3]}, now_epoch: {debug_result[4]}")
                print(f"🕐 Difference: {debug_result[3] - debug_result[4]} seconds")
            
            cursor.execute("""
                SELECT 
                    s.id, s.project_id, s.user_identifier, s.expires_at,
                    s.last_used_at, s.created_at, s.metadata,
                    p.allowed_assistants, p.requests_per_minute,
                    p.requests_per_day, p.requests_per_session
                FROM public_sessions s
                JOIN projects p ON s.project_id = p.project_id
                WHERE s.session_token = %s AND s.expires_at > NOW() AND p.is_active = true
            """, (session_token,))
            
            result = cursor.fetchone()
            if result:
                return {
                    'id': result[0],
                    'project_id': result[1],
                    'user_identifier': result[2],
                    'expires_at': result[3],
                    'last_used_at': result[4],
                    'created_at': result[5],
                    'metadata': result[6] if isinstance(result[6], dict) else json.loads(result[6] or '{}'),
                    'allowed_assistants': result[7] if isinstance(result[7], list) else json.loads(result[7] or '[]'),
                    'requests_per_minute': result[8],
                    'requests_per_day': result[9],
                    'requests_per_session': result[10]
                }
            return None
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def check_rate_limit(session_token: str) -> Dict[str, Any]:
        """Check if session is within rate limits"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get session
            session = SessionDB.get_session_by_token(session_token)
            if not session:
                return {
                    'current_minute_requests': 0,
                    'current_day_requests': 0,
                    'current_session_requests': 0,
                    'minute_limit': 0,
                    'day_limit': 0,
                    'session_limit': 0,
                    'is_rate_limited': True
                }
            
            # Check rate limits using the database function
            cursor.execute("""
                SELECT * FROM check_project_rate_limit(%s, %s)
            """, (session['project_id'], session['id']))
            
            result = cursor.fetchone()
            if result:
                return {
                    'current_minute_requests': result[0],
                    'current_day_requests': result[1],
                    'current_session_requests': result[2],
                    'minute_limit': result[3],
                    'day_limit': result[4],
                    'session_limit': result[5],
                    'is_rate_limited': result[6]
                }
            
            return {
                'current_minute_requests': 0,
                'current_day_requests': 0,
                'current_session_requests': 0,
                'minute_limit': 0,
                'day_limit': 0,
                'session_limit': 0,
                'is_rate_limited': True
            }
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def record_usage(
        session_token: str,
        assistant_id: str,
        endpoint: str,
        method: str,
        status_code: int,
        message_length: Optional[int] = None,
        response_length: Optional[int] = None,
        processing_time_ms: Optional[int] = None
    ) -> bool:
        """Record session usage"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get session
            session = SessionDB.get_session_by_token(session_token)
            if not session:
                return False
            
            # Record usage using database function
            cursor.execute("""
                SELECT record_session_usage(%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                session['id'], assistant_id, endpoint, method, status_code,
                message_length, response_length, processing_time_ms
            ))
            
            result = cursor.fetchone()
            conn.commit()
            
            return result[0] if result else False
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def cleanup_expired_sessions() -> int:
        """Clean up expired sessions"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("SELECT cleanup_expired_sessions()")
            result = cursor.fetchone()
            conn.commit()
            
            return result[0] if result else 0
            
        finally:
            cursor.close()
            conn.close()