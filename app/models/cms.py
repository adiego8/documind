"""
CMS Database Models
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import uuid
from app.database import get_db_connection

class CMSArticleDB:
    """Database operations for CMS articles"""
    
    @staticmethod
    def create_article(
        admin_code_id: str,
        title: str,
        content: str,
        excerpt: Optional[str] = None,
        seo_title: Optional[str] = None,
        meta_description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        slug: Optional[str] = None,
        status: str = 'draft'
    ) -> Dict[str, Any]:
        """Create a new article"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            article_id = str(uuid.uuid4())
            tags_json = json.dumps(tags or [])
            
            cursor.execute("""
                INSERT INTO cms_articles (
                    id, admin_code_id, title, content, excerpt, 
                    seo_title, meta_description, tags, slug, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, title, slug, excerpt, content, seo_title, 
                         meta_description, tags, status, created_at, updated_at, published_at
            """, (
                article_id, admin_code_id, title, content, excerpt,
                seo_title, meta_description, tags_json, slug, status
            ))
            
            result = cursor.fetchone()
            conn.commit()
            
            if result:
                return {
                    'id': result[0],
                    'title': result[1], 
                    'slug': result[2],
                    'excerpt': result[3],
                    'content': result[4],
                    'seo_title': result[5],
                    'meta_description': result[6],
                    'tags': result[7] if isinstance(result[7], list) else (json.loads(result[7]) if result[7] else []),
                    'status': result[8],
                    'created_at': result[9],
                    'updated_at': result[10],
                    'published_at': result[11]
                }
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_articles_by_admin_code(
        admin_code_id: str,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get articles for a specific admin code"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            query = """
                SELECT id, title, slug, excerpt, content, seo_title, 
                       meta_description, tags, status, created_at, updated_at, published_at
                FROM cms_articles 
                WHERE admin_code_id = %s
            """
            params = [admin_code_id]
            
            if status:
                query += " AND status = %s"
                params.append(status)
            
            query += " ORDER BY updated_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            articles = []
            for result in results:
                articles.append({
                    'id': result[0],
                    'title': result[1],
                    'slug': result[2], 
                    'excerpt': result[3],
                    'content': result[4],
                    'seo_title': result[5],
                    'meta_description': result[6],
                    'tags': result[7] if isinstance(result[7], list) else (json.loads(result[7]) if result[7] else []),
                    'status': result[8],
                    'created_at': result[9],
                    'updated_at': result[10],
                    'published_at': result[11]
                })
            
            return articles
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_article_by_id(article_id: str) -> Optional[Dict[str, Any]]:
        """Get a single article by ID"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT id, admin_code_id, title, slug, excerpt, content, seo_title,
                       meta_description, tags, status, created_at, updated_at, published_at
                FROM cms_articles 
                WHERE id = %s
            """, (article_id,))
            
            result = cursor.fetchone()
            if result:
                return {
                    'id': result[0],
                    'admin_code_id': result[1],
                    'title': result[2],
                    'slug': result[3],
                    'excerpt': result[4],
                    'content': result[5],
                    'seo_title': result[6],
                    'meta_description': result[7],
                    'tags': result[8] if isinstance(result[8], list) else (json.loads(result[8]) if result[8] else []),
                    'status': result[9],
                    'created_at': result[10],
                    'updated_at': result[11],
                    'published_at': result[12]
                }
            return None
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_article_by_slug(slug: str) -> Optional[Dict[str, Any]]:
        """Get a single article by slug"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT id, admin_code_id, title, slug, excerpt, content, seo_title,
                       meta_description, tags, status, created_at, updated_at, published_at
                FROM cms_articles 
                WHERE slug = %s AND status = 'published'
            """, (slug,))
            
            result = cursor.fetchone()
            if result:
                return {
                    'id': result[0],
                    'admin_code_id': result[1],
                    'title': result[2],
                    'slug': result[3],
                    'excerpt': result[4],
                    'content': result[5],
                    'seo_title': result[6],
                    'meta_description': result[7],
                    'tags': result[8] if isinstance(result[8], list) else (json.loads(result[8]) if result[8] else []),
                    'status': result[9],
                    'created_at': result[10],
                    'updated_at': result[11],
                    'published_at': result[12]
                }
            return None
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def update_article(
        article_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        excerpt: Optional[str] = None,
        seo_title: Optional[str] = None,
        meta_description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        slug: Optional[str] = None,
        status: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Update an existing article"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Build dynamic update query
            updates = []
            params = []
            
            if title is not None:
                updates.append("title = %s")
                params.append(title)
            if content is not None:
                updates.append("content = %s")
                params.append(content)
            if excerpt is not None:
                updates.append("excerpt = %s")
                params.append(excerpt)
            if seo_title is not None:
                updates.append("seo_title = %s")
                params.append(seo_title)
            if meta_description is not None:
                updates.append("meta_description = %s")
                params.append(meta_description)
            if tags is not None:
                updates.append("tags = %s")
                params.append(json.dumps(tags))
            if slug is not None:
                updates.append("slug = %s")
                params.append(slug)
            if status is not None:
                updates.append("status = %s")
                params.append(status)
            
            if not updates:
                return CMSArticleDB.get_article_by_id(article_id)
            
            params.append(article_id)
            
            cursor.execute(f"""
                UPDATE cms_articles 
                SET {', '.join(updates)}
                WHERE id = %s
                RETURNING id, title, slug, excerpt, content, seo_title,
                         meta_description, tags, status, created_at, updated_at, published_at
            """, params)
            
            result = cursor.fetchone()
            conn.commit()
            
            if result:
                return {
                    'id': result[0],
                    'title': result[1],
                    'slug': result[2],
                    'excerpt': result[3],
                    'content': result[4],
                    'seo_title': result[5],
                    'meta_description': result[6],
                    'tags': result[7] if isinstance(result[7], list) else (json.loads(result[7]) if result[7] else []),
                    'status': result[8],
                    'created_at': result[9],
                    'updated_at': result[10],
                    'published_at': result[11]
                }
            return None
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def delete_article(article_id: str) -> bool:
        """Delete an article"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("DELETE FROM cms_articles WHERE id = %s", (article_id,))
            conn.commit()
            return cursor.rowcount > 0
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_article_stats(admin_code_id: str) -> Dict[str, Any]:
        """Get article statistics for an admin"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_articles,
                    COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
                    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_count
                FROM cms_articles 
                WHERE admin_code_id = %s
            """, (admin_code_id,))
            
            result = cursor.fetchone()
            if result:
                return {
                    'total_articles': result[0],
                    'published_count': result[1],
                    'draft_count': result[2],
                    'recent_count': result[3]
                }
            return {
                'total_articles': 0,
                'published_count': 0,
                'draft_count': 0,
                'recent_count': 0
            }
            
        finally:
            cursor.close()
            conn.close()

class CMSAnalyticsDB:
    """Database operations for CMS analytics"""
    
    @staticmethod
    def record_article_view(article_id: str, is_unique_visitor: bool = True):
        """Record an article view"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "SELECT update_article_analytics(%s, %s)",
                (article_id, is_unique_visitor)
            )
            conn.commit()
            
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_article_analytics(article_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get analytics for a specific article"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT date, views, unique_visitors, avg_time_on_page, bounce_rate
                FROM cms_analytics 
                WHERE article_id = %s AND date >= CURRENT_DATE - INTERVAL '%s days'
                ORDER BY date DESC
            """, (article_id, days))
            
            results = cursor.fetchall()
            analytics = []
            
            for result in results:
                analytics.append({
                    'date': result[0],
                    'views': result[1],
                    'unique_visitors': result[2],
                    'avg_time_on_page': result[3],
                    'bounce_rate': result[4]
                })
            
            return analytics
            
        finally:
            cursor.close()
            conn.close()