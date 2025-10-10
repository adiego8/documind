from pydantic import BaseModel, validator
from typing import List, Optional, Any
from datetime import datetime

# User schemas
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: str
    username: str
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User
    role: str

# Assistant schemas
class AssistantCreate(BaseModel):
    name: str
    description: Optional[str] = None
    initial_context: str
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
    document_collection: Optional[str] = "default"
    llm_preset: Optional[str] = None  # Use predefined configuration
    
    @validator('temperature')
    def validate_temperature(cls, v):
        if v is not None and not (0.0 <= v <= 2.0):
            raise ValueError('Temperature must be between 0.0 and 2.0')
        return v
    
    @validator('max_tokens')
    def validate_max_tokens(cls, v):
        if v is not None and not (100 <= v <= 4000):
            raise ValueError('Max tokens must be between 100 and 4000')
        return v

class AssistantUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    initial_context: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    document_collection: Optional[str] = None
    llm_preset: Optional[str] = None  # Use predefined configuration
    
    @validator('temperature')
    def validate_temperature(cls, v):
        if v is not None and not (0.0 <= v <= 2.0):
            raise ValueError('Temperature must be between 0.0 and 2.0')
        return v
    
    @validator('max_tokens')
    def validate_max_tokens(cls, v):
        if v is not None and not (100 <= v <= 4000):
            raise ValueError('Max tokens must be between 100 and 4000')
        return v

class AssistantResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    initial_context: str
    temperature: float
    max_tokens: int
    document_collection: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AssistantsListResponse(BaseModel):
    assistants: List[AssistantResponse]

# Query schemas
class QueryCreate(BaseModel):
    question: str
    assistant_id: str

class QueryResponse(BaseModel):
    id: str
    question: str
    answer: str
    sources: Optional[List[dict]] = None
    timestamp: datetime
    assistant_name: Optional[str] = None
    username: Optional[str] = None
    
    class Config:
        from_attributes = True

class QueryHistoryResponse(BaseModel):
    queries: List[QueryResponse]

# Legacy query schemas for backward compatibility
class QueryRequest(BaseModel):
    question: str
    n_results: Optional[int] = 5

class LegacyQueryResponse(BaseModel):
    answer: str
    sources: List[dict]

# CMS schemas
class CMSArticleCreate(BaseModel):
    title: str
    content: str
    excerpt: Optional[str] = None
    seo_title: Optional[str] = None
    meta_description: Optional[str] = None
    tags: Optional[List[str]] = None
    slug: Optional[str] = None
    status: str = 'draft'
    
    @validator('status')
    def validate_status(cls, v):
        if v not in ['draft', 'published', 'archived']:
            raise ValueError('Status must be draft, published, or archived')
        return v

class CMSArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    seo_title: Optional[str] = None
    meta_description: Optional[str] = None
    tags: Optional[List[str]] = None
    slug: Optional[str] = None
    status: Optional[str] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None and v not in ['draft', 'published', 'archived']:
            raise ValueError('Status must be draft, published, or archived')
        return v

class CMSArticleResponse(BaseModel):
    id: str
    title: str
    slug: str
    excerpt: Optional[str]
    content: str
    seo_title: Optional[str]
    meta_description: Optional[str]
    tags: List[str]
    status: str
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class CMSArticlesListResponse(BaseModel):
    articles: List[CMSArticleResponse]
    total: Optional[int] = None
    page: Optional[int] = None
    limit: Optional[int] = None

class CMSContentGenerateRequest(BaseModel):
    prompt: str
    assistant_id: Optional[str] = None
    style: str = 'blog'
    target_audience: str = 'general'
    
    @validator('style')
    def validate_style(cls, v):
        if v not in ['blog', 'article', 'guide', 'tutorial', 'faq']:
            raise ValueError('Style must be blog, article, guide, tutorial, or faq')
        return v

class CMSContentGenerateResponse(BaseModel):
    title: str
    excerpt: str
    content: str
    tags: List[str]
    seo_title: str
    meta_description: str

class CMSStatsResponse(BaseModel):
    total_articles: int
    published_count: int
    draft_count: int
    recent_count: int

class CMSAnalyticsResponse(BaseModel):
    date: str
    views: int
    unique_visitors: int
    avg_time_on_page: Optional[str] = None
    bounce_rate: Optional[float] = None

# API Keys Schemas
class APIKeyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: Optional[dict] = None
    rate_limit_per_minute: Optional[int] = 60
    rate_limit_per_day: Optional[int] = 1000
    expires_in_days: Optional[int] = None
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Name is required')
        if len(v) > 100:
            raise ValueError('Name must be 100 characters or less')
        return v.strip()
    
    @validator('rate_limit_per_minute')
    def validate_rate_limit_per_minute(cls, v):
        if v is not None and not (1 <= v <= 1000):
            raise ValueError('Rate limit per minute must be between 1 and 1000')
        return v
    
    @validator('rate_limit_per_day')
    def validate_rate_limit_per_day(cls, v):
        if v is not None and not (1 <= v <= 100000):
            raise ValueError('Rate limit per day must be between 1 and 100000')
        return v
    
    @validator('expires_in_days')
    def validate_expires_in_days(cls, v):
        if v is not None and not (1 <= v <= 365):
            raise ValueError('Expiration must be between 1 and 365 days')
        return v

class APIKeyResponse(BaseModel):
    id: str
    key_prefix: str
    name: str
    description: Optional[str]
    permissions: dict
    rate_limit_per_minute: int
    rate_limit_per_day: int
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class APIKeyCreatedResponse(APIKeyResponse):
    key: str

class APIKeyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[dict] = None
    rate_limit_per_minute: Optional[int] = None
    rate_limit_per_day: Optional[int] = None
    is_active: Optional[bool] = None
    
    @validator('name')
    def validate_name(cls, v):
        if v is not None:
            if not v or len(v.strip()) == 0:
                raise ValueError('Name cannot be empty')
            if len(v) > 100:
                raise ValueError('Name must be 100 characters or less')
            return v.strip()
        return v
    
    @validator('rate_limit_per_minute')
    def validate_rate_limit_per_minute(cls, v):
        if v is not None and not (1 <= v <= 1000):
            raise ValueError('Rate limit per minute must be between 1 and 1000')
        return v
    
    @validator('rate_limit_per_day')
    def validate_rate_limit_per_day(cls, v):
        if v is not None and not (1 <= v <= 100000):
            raise ValueError('Rate limit per day must be between 1 and 100000')
        return v

class APIKeyUsageStats(BaseModel):
    total_requests: int
    active_days: int
    avg_requests_last_7_days: float
    last_request: Optional[datetime]
    error_requests: int
    success_rate: float
    
    class Config:
        from_attributes = True

class RateLimitStatus(BaseModel):
    current_minute_requests: int
    current_day_requests: int
    minute_limit: int
    day_limit: int
    is_rate_limited: bool
    
    class Config:
        from_attributes = True