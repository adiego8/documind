from pydantic import BaseModel, validator
from typing import List, Optional
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
    context_used: bool
    total_documents_found: Optional[int] = None