from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import Optional, List
import json
from app.auth import get_current_admin_user, get_current_user
from app.models.cms import CMSArticleDB, CMSAnalyticsDB
from app.schemas import (
    CMSArticleCreate, CMSArticleUpdate, CMSArticleResponse, 
    CMSArticlesListResponse, CMSContentGenerateRequest, 
    CMSContentGenerateResponse, CMSStatsResponse, CMSAnalyticsResponse
)
from app.database import AssistantDB, AdminCodeDB
from app.rag_service import RAGService

router = APIRouter(prefix="/cms", tags=["cms"])

def get_admin_code_id_from_header(request: Request) -> str:
    """Extract admin_code_id from X-Admin-Code header"""
    admin_code = request.headers.get('X-Admin-Code')
    if not admin_code:
        raise HTTPException(
            status_code=400, 
            detail="X-Admin-Code header is required for public API access"
        )
    
    # Validate the admin code exists
    admin_code_data = AdminCodeDB.get_admin_code_by_code(admin_code)
    if not admin_code_data:
        raise HTTPException(status_code=404, detail="Invalid admin code")
    
    return admin_code_data['id']

@router.get("/articles", response_model=CMSArticlesListResponse)
async def get_articles(
    current_user: dict = Depends(get_current_admin_user),
    status: Optional[str] = Query(None, description="Filter by status: draft, published, archived"),
    limit: int = Query(50, ge=1, le=100, description="Number of articles to return"),
    offset: int = Query(0, ge=0, description="Number of articles to skip")
):
    """Get articles for the current admin"""
    try:
        admin_code_id = current_user.get('admin_code_id')
        if not admin_code_id:
            raise HTTPException(status_code=400, detail="Admin must have an admin code")
        
        articles = CMSArticleDB.get_articles_by_admin_code(
            admin_code_id=admin_code_id,
            status=status,
            limit=limit,
            offset=offset
        )
        
        return {"articles": articles, "limit": limit, "offset": offset}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting articles: {str(e)}")

@router.get("/articles/{article_id}", response_model=CMSArticleResponse)
async def get_article(
    article_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Get a specific article by ID"""
    try:
        article = CMSArticleDB.get_article_by_id(article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Verify the article belongs to the current admin
        if article['admin_code_id'] != current_user.get('admin_code_id'):
            raise HTTPException(status_code=403, detail="Access denied to this article")
        
        return article
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting article: {str(e)}")

@router.post("/articles", response_model=CMSArticleResponse)
async def create_article(
    article_data: CMSArticleCreate,
    current_user: dict = Depends(get_current_admin_user)
):
    """Create a new article"""
    try:
        admin_code_id = current_user.get('admin_code_id')
        if not admin_code_id:
            raise HTTPException(status_code=400, detail="Admin must have an admin code")
        
        article = CMSArticleDB.create_article(
            admin_code_id=admin_code_id,
            title=article_data.title,
            content=article_data.content,
            excerpt=article_data.excerpt,
            seo_title=article_data.seo_title,
            meta_description=article_data.meta_description,
            tags=article_data.tags,
            slug=article_data.slug,
            status=article_data.status
        )
        
        return article
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating article: {str(e)}")

@router.put("/articles/{article_id}", response_model=CMSArticleResponse)
async def update_article(
    article_id: str,
    article_data: CMSArticleUpdate,
    current_user: dict = Depends(get_current_admin_user)
):
    """Update an existing article"""
    try:
        # Verify article exists and belongs to current admin
        existing_article = CMSArticleDB.get_article_by_id(article_id)
        if not existing_article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        if existing_article['admin_code_id'] != current_user.get('admin_code_id'):
            raise HTTPException(status_code=403, detail="Access denied to this article")
        
        # Update only provided fields
        update_data = {k: v for k, v in article_data.dict().items() if v is not None}
        
        article = CMSArticleDB.update_article(article_id, **update_data)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        return article
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating article: {str(e)}")

@router.delete("/articles/{article_id}")
async def delete_article(
    article_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Delete an article"""
    try:
        # Verify article exists and belongs to current admin
        existing_article = CMSArticleDB.get_article_by_id(article_id)
        if not existing_article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        if existing_article['admin_code_id'] != current_user.get('admin_code_id'):
            raise HTTPException(status_code=403, detail="Access denied to this article")
        
        success = CMSArticleDB.delete_article(article_id)
        if not success:
            raise HTTPException(status_code=404, detail="Article not found")
        
        return {"message": "Article deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting article: {str(e)}")

@router.post("/articles/{article_id}/publish")
async def publish_article(
    article_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Publish an article"""
    try:
        # Verify article exists and belongs to current admin
        existing_article = CMSArticleDB.get_article_by_id(article_id)
        if not existing_article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        if existing_article['admin_code_id'] != current_user.get('admin_code_id'):
            raise HTTPException(status_code=403, detail="Access denied to this article")
        
        article = CMSArticleDB.update_article(article_id, status='published')
        return article
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error publishing article: {str(e)}")

@router.post("/articles/{article_id}/unpublish")
async def unpublish_article(
    article_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Unpublish an article"""
    try:
        # Verify article exists and belongs to current admin
        existing_article = CMSArticleDB.get_article_by_id(article_id)
        if not existing_article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        if existing_article['admin_code_id'] != current_user.get('admin_code_id'):
            raise HTTPException(status_code=403, detail="Access denied to this article")
        
        article = CMSArticleDB.update_article(article_id, status='draft')
        return article
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error unpublishing article: {str(e)}")

@router.post("/generate", response_model=CMSContentGenerateResponse)
async def generate_content(
    request: CMSContentGenerateRequest,
    current_user: dict = Depends(get_current_admin_user)
):
    """Generate article content using AI"""
    try:
        admin_code_id = current_user.get('admin_code_id')
        if not admin_code_id:
            raise HTTPException(status_code=400, detail="Admin must have an admin code")
        
        # Get assistant for knowledge base if specified
        assistant = None
        if request.assistant_id:
            assistant = AssistantDB.get_assistant_by_id(request.assistant_id)
            if not assistant:
                raise HTTPException(status_code=404, detail="Assistant not found")
        
        # Create enhanced prompt for content generation
        enhanced_prompt = f"""Generate a {request.style} article for a {request.target_audience} audience based on this prompt: "{request.prompt}".

        Respond with a JSON object in this exact format:
        {{
            "title": "Article title here",
            "excerpt": "Brief 2-3 sentence summary",
            "content": "Full article content in markdown format",
            "tags": ["tag1", "tag2", "tag3"],
            "seo_title": "SEO optimized title",
            "meta_description": "SEO meta description under 160 characters"
        }}

        Guidelines:
        - Make the content engaging, informative, and well-structured
        - Use markdown formatting for headings, lists, and emphasis
        - Include relevant keywords for SEO
        - Target audience: {request.target_audience}
        - Content style: {request.style}
        
        DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON."""
        
        # Use RAG service with assistant's knowledge if available
        if assistant:
            try:
                rag_service = RAGService.create_for_assistant(
                    request.assistant_id, 
                    project_id=assistant.get('project_id'),
                    assistant_config=assistant
                )
                
                # Query relevant documents first
                relevant_docs = rag_service.vector_store.search(request.prompt, k=3)
                
                if relevant_docs:
                    context = "\n\n".join([doc["content"] for doc in relevant_docs])
                    enhanced_prompt = f"""Using the following knowledge base context, {enhanced_prompt}

                    Context from knowledge base:
                    {context}
                    
                    Use this context to create more accurate and informed content."""
                
                result = rag_service.generate_response(enhanced_prompt, relevant_docs, assistant.get('initial_context'))
            except Exception as e:
                print(f"Error using RAG service: {e}")
                # Fallback to basic generation without knowledge base
                from app.llm_config import LLMConfig
                from langchain_openai import ChatOpenAI
                from app.config import settings
                
                config = LLMConfig.get_default_config()
                llm = ChatOpenAI(
                    model=config["model"],
                    api_key=settings.openai_api_key,
                    max_tokens=1500,
                    temperature=0.7
                )
                response = llm.invoke(enhanced_prompt)
                result = response.content
        else:
            # Use basic LLM without knowledge base
            from app.llm_config import LLMConfig
            from langchain_openai import ChatOpenAI
            from app.config import settings
            
            config = LLMConfig.get_default_config()
            llm = ChatOpenAI(
                model=config["model"],
                api_key=settings.openai_api_key,
                max_tokens=1500,
                temperature=0.7
            )
            response = llm.invoke(enhanced_prompt)
            result = response.content
        
        # Clean up the response and parse JSON
        try:
            # Remove any markdown formatting around JSON
            result = result.replace('```json\n', '').replace('```\n', '').replace('```', '').strip()
            content_data = json.loads(result)
            
            return CMSContentGenerateResponse(**content_data)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse generated content: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating content: {str(e)}")

@router.get("/stats", response_model=CMSStatsResponse)
async def get_cms_stats(current_user: dict = Depends(get_current_admin_user)):
    """Get CMS statistics for the current admin"""
    try:
        admin_code_id = current_user.get('admin_code_id')
        if not admin_code_id:
            raise HTTPException(status_code=400, detail="Admin must have an admin code")
        
        stats = CMSArticleDB.get_article_stats(admin_code_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting CMS stats: {str(e)}")

@router.get("/articles/{article_id}/analytics")
async def get_article_analytics(
    article_id: str,
    current_user: dict = Depends(get_current_admin_user),
    days: int = Query(30, ge=1, le=365, description="Number of days to include")
):
    """Get analytics for a specific article"""
    try:
        # Verify article exists and belongs to current admin
        existing_article = CMSArticleDB.get_article_by_id(article_id)
        if not existing_article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        if existing_article['admin_code_id'] != current_user.get('admin_code_id'):
            raise HTTPException(status_code=403, detail="Access denied to this article")
        
        analytics = CMSAnalyticsDB.get_article_analytics(article_id, days)
        return {"analytics": analytics}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting analytics: {str(e)}")

# Public endpoints for published articles (using X-Admin-Code header)
@router.get("/public/articles", response_model=CMSArticlesListResponse)
async def get_public_articles(
    request: Request,
    limit: int = Query(10, ge=1, le=50, description="Number of articles to return"),
    offset: int = Query(0, ge=0, description="Number of articles to skip"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)")
):
    """Get published articles for public consumption using X-Admin-Code header"""
    try:
        admin_code_id = get_admin_code_id_from_header(request)
        
        articles = CMSArticleDB.get_articles_by_admin_code(
            admin_code_id=admin_code_id,
            status='published',
            limit=limit,
            offset=offset
        )
        
        # Filter by tags if provided
        if tags:
            tag_list = [tag.strip() for tag in tags.split(',')]
            articles = [
                article for article in articles
                if any(tag in article.get('tags', []) for tag in tag_list)
            ]
        
        return {"articles": articles, "limit": limit, "offset": offset}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting public articles: {str(e)}")

@router.get("/public/articles/{slug}", response_model=CMSArticleResponse)
async def get_public_article(request: Request, slug: str):
    """Get a published article by slug using X-Admin-Code header"""
    try:
        admin_code_id = get_admin_code_id_from_header(request)
        
        # Get article by slug and verify it belongs to the admin
        article = CMSArticleDB.get_article_by_slug(slug)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Verify the article belongs to the admin specified in header
        if article['admin_code_id'] != admin_code_id:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Record the view
        try:
            CMSAnalyticsDB.record_article_view(article['id'])
        except Exception as e:
            # Don't fail the request if analytics recording fails
            print(f"Failed to record article view: {e}")
        
        return article
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting public article: {str(e)}")

@router.get("/public/stats")
async def get_public_stats(request: Request):
    """Get basic public stats for the admin specified in X-Admin-Code header"""
    try:
        admin_code_id = get_admin_code_id_from_header(request)
        
        stats = CMSArticleDB.get_article_stats(admin_code_id)
        
        # Return only published article count for public consumption
        return {
            "published_articles": stats['published_count'],
            "total_published": stats['published_count']
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting public stats: {str(e)}")