"""
PostgreSQL database connection and utilities
"""
import os
import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from typing import Dict, List, Any, Optional
import json
import uuid
from datetime import datetime
from app.config import settings

# Database configuration from settings
DB_CONFIG = {
    'host': settings.db_host,
    'port': settings.db_port,
    'database': settings.db_name,
    'user': settings.db_user,
    'password': settings.db_password
}

def get_db_connection():
    """Get a database connection"""
    return psycopg2.connect(**DB_CONFIG)

@contextmanager
def get_db_cursor(commit=True):
    """Get a database cursor with automatic connection management"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        yield cursor
        if commit:
            conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            cursor.close()
            conn.close()

def dict_to_json(data: Any) -> str:
    """Convert dictionary to JSON string"""
    if data is None:
        return None
    # If it's already a string, return as-is
    if isinstance(data, str):
        return data
    # If it's a list or dict, convert to JSON
    return json.dumps(data)

def json_to_dict(data: Any) -> Any:
    """Convert JSON string to dictionary"""
    if data is None:
        return None
    # If it's already parsed (list/dict), return as-is
    if isinstance(data, (list, dict)):
        return data
    # If it's a string, parse it
    if isinstance(data, str):
        return json.loads(data)
    return data

class UserDB:
    """User database operations"""
    
    @staticmethod
    def create_user(username: str, hashed_password: str, role: str = 'user', admin_code_id: str = None) -> Dict[str, Any]:
        """Create a new user"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO users (id, username, hashed_password, role, admin_code_id)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, username, role, created_at, is_active, admin_code_id
            """, (str(uuid.uuid4()), username, hashed_password, role, admin_code_id))
            return dict(cursor.fetchone())
    
    @staticmethod
    def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT id, username, hashed_password, role, created_at, is_active, admin_code_id
                FROM users WHERE username = %s
            """, (username,))
            result = cursor.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT id, username, role, created_at, is_active, admin_code_id
                FROM users WHERE id = %s
            """, (user_id,))
            result = cursor.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def user_exists(username: str) -> bool:
        """Check if user exists"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("SELECT 1 FROM users WHERE username = %s", (username,))
            return cursor.fetchone() is not None
    
    @staticmethod
    def get_users_by_admin_code(admin_code_id: str) -> List[Dict[str, Any]]:
        """Get all users under the same admin code (for admin user management)"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT id, username, role, created_at, is_active, admin_code_id
                FROM users 
                WHERE admin_code_id = %s
                ORDER BY created_at DESC
            """, (admin_code_id,))
            return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def delete_user_and_data(user_id: str, admin_code_id: str = None) -> bool:
        """Delete a user and all their associated data (conversations, queries, etc.)"""
        with get_db_cursor() as cursor:
            # Verify admin can delete this user (if admin_code_id provided)
            if admin_code_id:
                cursor.execute("""
                    SELECT id FROM users 
                    WHERE id = %s AND admin_code_id = %s
                """, (user_id, admin_code_id))
                if not cursor.fetchone():
                    return False
            
            # Delete user queries (cascades via FK)
            cursor.execute("DELETE FROM user_queries WHERE user_id = %s", (user_id,))
            
            # Delete conversation messages (cascades via FK)
            cursor.execute("""
                DELETE FROM conversation_messages 
                WHERE conversation_id IN (
                    SELECT id FROM conversations WHERE user_id = %s
                )
            """, (user_id,))
            
            # Delete conversations
            cursor.execute("DELETE FROM conversations WHERE user_id = %s", (user_id,))
            
            # Delete the user (this will also cascade to other tables if FKs are set up)
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            
            return cursor.rowcount > 0

class AssistantDB:
    """Assistant database operations"""
    
    @staticmethod
    def get_all_assistants() -> List[Dict[str, Any]]:
        """Get all active assistants"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT id, name, description, initial_context, temperature, max_tokens, 
                       document_collection, admin_code_id, is_active, created_at, updated_at
                FROM assistants 
                WHERE is_active = true
                ORDER BY created_at ASC
            """)
            assistants = [dict(row) for row in cursor.fetchall()]
            # Ensure document_collection is never None for API compatibility
            for assistant in assistants:
                if assistant['document_collection'] is None:
                    assistant['document_collection'] = ''
            return assistants
    
    @staticmethod
    def get_assistants_by_admin_code(admin_code_id: str) -> List[Dict[str, Any]]:
        """Get assistants that belong to a specific admin code"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT id, name, description, initial_context, temperature, max_tokens, 
                       document_collection, admin_code_id, is_active, created_at, updated_at
                FROM assistants 
                WHERE admin_code_id = %s AND is_active = true
                ORDER BY created_at DESC
            """, (admin_code_id,))
            assistants = [dict(row) for row in cursor.fetchall()]
            # Ensure document_collection is never None for API compatibility
            for assistant in assistants:
                if assistant['document_collection'] is None:
                    assistant['document_collection'] = ''
            return assistants
    
    @staticmethod
    def get_assistant_by_id(assistant_id: str) -> Optional[Dict[str, Any]]:
        """Get assistant by ID"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT id, name, description, initial_context, temperature, max_tokens, 
                       document_collection, is_active, created_at, updated_at
                FROM assistants 
                WHERE id = %s AND is_active = true
            """, (assistant_id,))
            result = cursor.fetchone()
            if result:
                assistant = dict(result)
                # Ensure document_collection is never None for API compatibility
                if assistant['document_collection'] is None:
                    assistant['document_collection'] = ''
                return assistant
            return None
    
    @staticmethod
    def create_assistant(name: str, description: str, initial_context: str, 
                        temperature: float = 0.7, max_tokens: int = 1000,
                        document_collection: str = 'default', admin_code_id: str = None) -> Dict[str, Any]:
        """Create a new assistant"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO assistants (id, name, description, initial_context, temperature, max_tokens, document_collection, admin_code_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, name, description, initial_context, temperature, max_tokens, 
                         document_collection, admin_code_id, is_active, created_at, updated_at
            """, (str(uuid.uuid4()), name, description, initial_context, temperature, max_tokens, document_collection, admin_code_id))
            return dict(cursor.fetchone())
    
    @staticmethod
    def update_assistant(assistant_id: str, name: str = None, description: str = None,
                        initial_context: str = None, temperature: float = None, 
                        max_tokens: int = None, document_collection: str = None) -> Dict[str, Any]:
        """Update assistant configuration"""
        # Get current assistant first
        current_assistant = AssistantDB.get_assistant_by_id(assistant_id)
        if not current_assistant:
            raise ValueError("Assistant not found")
        
        # Use current values if new ones not provided
        name = name if name is not None else current_assistant['name']
        description = description if description is not None else current_assistant['description']
        initial_context = initial_context if initial_context is not None else current_assistant['initial_context']
        temperature = temperature if temperature is not None else current_assistant['temperature']
        max_tokens = max_tokens if max_tokens is not None else current_assistant['max_tokens']
        document_collection = document_collection if document_collection is not None else current_assistant['document_collection']
        
        with get_db_cursor() as cursor:
            cursor.execute("""
                UPDATE assistants 
                SET name = %s, description = %s, initial_context = %s, temperature = %s, 
                    max_tokens = %s, document_collection = %s
                WHERE id = %s
                RETURNING id, name, description, initial_context, temperature, max_tokens, 
                         document_collection, is_active, created_at, updated_at
            """, (name, description, initial_context, temperature, max_tokens, document_collection, assistant_id))
            return dict(cursor.fetchone())
    
    @staticmethod
    def delete_assistant(assistant_id: str) -> bool:
        """Soft delete an assistant by setting is_active to false"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                UPDATE assistants 
                SET is_active = false
                WHERE id = %s
            """, (assistant_id,))
            return cursor.rowcount > 0

class UserQueryDB:
    """User query database operations"""
    
    @staticmethod
    def create_query(user_id: str, assistant_id: str, question: str, answer: str, sources: List[Dict] = None) -> Dict[str, Any]:
        """Create a new user query"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO user_queries (id, user_id, assistant_id, question, answer, sources)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, user_id, assistant_id, question, answer, sources, timestamp
            """, (str(uuid.uuid4()), user_id, assistant_id, question, answer, dict_to_json(sources)))
            result = dict(cursor.fetchone())
            result['sources'] = json_to_dict(result['sources'])
            return result
    
    @staticmethod
    def get_user_queries_for_assistant(user_id: str, assistant_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get user's query history for a specific assistant"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT uq.id, uq.user_id, uq.assistant_id, uq.question, uq.answer, uq.sources, uq.timestamp,
                       u.username
                FROM user_queries uq
                JOIN users u ON uq.user_id = u.id
                WHERE uq.user_id = %s AND uq.assistant_id = %s 
                ORDER BY uq.timestamp DESC
                LIMIT %s
            """, (user_id, assistant_id, limit))
            queries = []
            for row in cursor.fetchall():
                query = dict(row)
                query['sources'] = json_to_dict(query['sources'])
                queries.append(query)
            return queries
    
    @staticmethod
    def get_all_user_queries(user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all query history for a user across all assistants"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT uq.id, uq.user_id, uq.assistant_id, uq.question, uq.answer, uq.sources, uq.timestamp,
                       a.name as assistant_name, u.username
                FROM user_queries uq
                JOIN assistants a ON uq.assistant_id = a.id
                JOIN users u ON uq.user_id = u.id
                WHERE uq.user_id = %s 
                ORDER BY uq.timestamp DESC
                LIMIT %s
            """, (user_id, limit))
            queries = []
            for row in cursor.fetchall():
                query = dict(row)
                query['sources'] = json_to_dict(query['sources'])
                queries.append(query)
            return queries
    
    @staticmethod
    def get_all_queries_for_assistant_by_admin_code(admin_code_id: str, assistant_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all queries for a specific assistant from users under the same admin code"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT uq.id, uq.user_id, uq.assistant_id, uq.question, uq.answer, uq.sources, uq.timestamp,
                       u.username
                FROM user_queries uq
                JOIN users u ON uq.user_id = u.id
                WHERE u.admin_code_id = %s AND uq.assistant_id = %s 
                ORDER BY uq.timestamp DESC
                LIMIT %s
            """, (admin_code_id, assistant_id, limit))
            queries = []
            for row in cursor.fetchall():
                query = dict(row)
                query['sources'] = json_to_dict(query['sources'])
                queries.append(query)
            return queries
    
    @staticmethod
    def get_all_queries_by_admin_code(admin_code_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all queries from users under the same admin code"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT uq.id, uq.user_id, uq.assistant_id, uq.question, uq.answer, uq.sources, uq.timestamp,
                       a.name as assistant_name, u.username
                FROM user_queries uq
                JOIN assistants a ON uq.assistant_id = a.id
                JOIN users u ON uq.user_id = u.id
                WHERE u.admin_code_id = %s 
                ORDER BY uq.timestamp DESC
                LIMIT %s
            """, (admin_code_id, limit))
            queries = []
            for row in cursor.fetchall():
                query = dict(row)
                query['sources'] = json_to_dict(query['sources'])
                queries.append(query)
            return queries

class AdminCodeDB:
    @staticmethod
    def create_admin_code(code: str, description: str = None, max_users: int = None):
        """Create a new admin registration code with auto-generated user_code"""
        import secrets
        import string
        
        # Generate a unique user_code (8 characters, alphanumeric)
        user_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        
        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO admin_codes (id, code, user_code, description, max_users)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
            """, (str(uuid.uuid4()), code, user_code, description, max_users))
            
            result = cursor.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def get_admin_code_by_code(code: str):
        """Get admin code by code string"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT *
                FROM admin_codes
                WHERE code = %s AND is_active = true
            """, (code,))
            
            result = cursor.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def get_admin_code_by_user_code(user_code: str):
        """Get admin code by user_code string (for user registration)"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT *
                FROM admin_codes
                WHERE user_code = %s AND is_active = true
            """, (user_code,))
            
            result = cursor.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def get_admin_codes_by_admin(admin_user_id: str):
        """Get admin codes that the admin user is associated with"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT ac.*
                FROM admin_codes ac
                JOIN users u ON u.admin_code_id = ac.id
                WHERE u.id = %s AND u.role = 'admin'
                ORDER BY ac.created_at DESC
            """, (admin_user_id,))
            
            return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def increment_user_count(code: str):
        """Increment the current_users count for an admin code"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                UPDATE admin_codes 
                SET current_users = current_users + 1
                WHERE code = %s
            """, (code,))
            
            return cursor.rowcount > 0
    
    @staticmethod
    def can_register_user(code: str):
        """Check if a user can register with this admin code (legacy method)"""
        admin_code = AdminCodeDB.get_admin_code_by_code(code)
        if not admin_code or not admin_code['is_active']:
            return False
        
        # Check if max_users limit is reached
        if admin_code['max_users'] is not None:
            return admin_code['current_users'] < admin_code['max_users']
        
        return True
    
    @staticmethod
    def can_register_user_with_user_code(user_code: str):
        """Check if a user can register with this user_code"""
        admin_code = AdminCodeDB.get_admin_code_by_user_code(user_code)
        if not admin_code or not admin_code['is_active']:
            return False
        
        # Check if max_users limit is reached
        if admin_code['max_users'] is not None:
            return admin_code['current_users'] < admin_code['max_users']
        
        return True


class ConversationDB:
    @staticmethod
    def create_conversation(user_id: str, assistant_id: str, title: str = None):
        """Create a new conversation"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO conversations (id, user_id, assistant_id, title)
                VALUES (%s, %s, %s, %s)
                RETURNING *
            """, (str(uuid.uuid4()), user_id, assistant_id, title))
            
            result = cursor.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def add_message(conversation_id: str, user_id: str, assistant_id: str, role: str, content: str, metadata: dict = None):
        """Add a message to a conversation"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO conversation_messages (id, conversation_id, user_id, assistant_id, role, content, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (str(uuid.uuid4()), conversation_id, user_id, assistant_id, role, content, dict_to_json(metadata) if metadata else '{}'))
            
            message = cursor.fetchone()
            if message:
                message_dict = dict(message)
                message_dict['metadata'] = json_to_dict(message_dict['metadata'])
                return message_dict
            return None
    
    @staticmethod
    def get_conversations_by_admin(admin_user_id: str, limit: int = 100, user_id: str = None, assistant_id: str = None, username: str = None):
        """Get all conversations for users registered under the same admin code as the admin user with optional filters"""
        with get_db_cursor(commit=False) as cursor:
            # Build base query
            base_query = """
                SELECT c.*, u.username, a.name as assistant_name,
                       (SELECT COUNT(*) FROM conversation_messages cm WHERE cm.conversation_id = c.id) as message_count,
                       (SELECT MAX(created_at) FROM conversation_messages cm WHERE cm.conversation_id = c.id) as last_message_at
                FROM conversations c
                JOIN users u ON c.user_id = u.id
                JOIN assistants a ON c.assistant_id = a.id
                JOIN admin_codes ac ON u.admin_code_id = ac.id
                WHERE ac.id = (SELECT admin_code_id FROM users WHERE id = %s AND role = 'admin')
            """

            # Build params list
            params = [admin_user_id]

            # Add optional filters using parameterized queries only
            if user_id:
                base_query += " AND c.user_id = %s"
                params.append(user_id)

            if assistant_id:
                base_query += " AND c.assistant_id = %s"
                params.append(assistant_id)

            if username:
                base_query += " AND u.username ILIKE %s"
                params.append(f"%{username}%")

            # Add ordering and limit
            base_query += " ORDER BY c.updated_at DESC LIMIT %s"
            params.append(limit)

            # Execute with all parameters
            cursor.execute(base_query, tuple(params))

            return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def get_conversation_messages(conversation_id: str):
        """Get all messages in a conversation"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT cm.*, u.username, a.name as assistant_name
                FROM conversation_messages cm
                JOIN users u ON cm.user_id = u.id
                JOIN assistants a ON cm.assistant_id = a.id
                WHERE cm.conversation_id = %s
                ORDER BY cm.created_at ASC
            """, (conversation_id,))
            
            messages = []
            for row in cursor.fetchall():
                message = dict(row)
                message['metadata'] = json_to_dict(message['metadata'])
                
                # Set the sender name based on role
                if message['role'] == 'user':
                    message['sender_name'] = message['username']
                else:  # assistant
                    message['sender_name'] = message['assistant_name']
                
                messages.append(message)
            
            return messages
    
    @staticmethod
    def get_or_create_conversation(user_id: str, assistant_id: str):
        """Get existing conversation or create new one for user/assistant pair"""
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT *
                FROM conversations
                WHERE user_id = %s AND assistant_id = %s
                ORDER BY updated_at DESC
                LIMIT 1
            """, (user_id, assistant_id))
            
            conversation = cursor.fetchone()
            if conversation:
                return dict(conversation)
            
            # Create new conversation if none exists
            return ConversationDB.create_conversation(user_id, assistant_id)


class DocumentDB:
    @staticmethod
    def create_document(assistant_id: str, filename: str, file_size: int, chunk_count: int, document_id_prefix: str):
        """Create a new document record"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO documents (id, assistant_id, filename, file_size, chunk_count, document_id_prefix)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, assistant_id, filename, file_size, upload_date, chunk_count, document_id_prefix, created_at
            """, (str(uuid.uuid4()), assistant_id, filename, file_size, chunk_count, document_id_prefix))
            return dict(cursor.fetchone())
    
    @staticmethod
    def get_documents_by_assistant(assistant_id: str):
        """Get all documents for an assistant"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, assistant_id, filename, file_size, upload_date, chunk_count, document_id_prefix, created_at
                FROM documents 
                WHERE assistant_id = %s 
                ORDER BY upload_date DESC
            """, (assistant_id,))
            return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def get_document_by_id(document_id: str):
        """Get a document by ID"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, assistant_id, filename, file_size, upload_date, chunk_count, document_id_prefix, created_at
                FROM documents 
                WHERE id = %s
            """, (document_id,))
            result = cursor.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def get_document_by_prefix(document_id_prefix: str):
        """Get a document by its prefix"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, assistant_id, filename, file_size, upload_date, chunk_count, document_id_prefix, created_at
                FROM documents 
                WHERE document_id_prefix = %s
            """, (document_id_prefix,))
            result = cursor.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def delete_document(document_id: str):
        """Delete a document record"""
        with get_db_cursor() as cursor:
            cursor.execute("DELETE FROM documents WHERE id = %s RETURNING document_id_prefix", (document_id,))
            result = cursor.fetchone()
            return result['document_id_prefix'] if result else None
    
    @staticmethod
    def get_documents_stats_by_assistant(assistant_id: str):
        """Get document statistics for an assistant"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    COUNT(*) as file_count,
                    COALESCE(SUM(chunk_count), 0) as total_chunks,
                    COALESCE(SUM(file_size), 0) as total_size
                FROM documents 
                WHERE assistant_id = %s
            """, (assistant_id,))
            result = cursor.fetchone()
            return dict(result) if result else {"file_count": 0, "total_chunks": 0, "total_size": 0}

def test_connection():
    """Test database connection"""
    try:
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("SELECT 1")
            return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False