import os
import json
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Application
    app_name: str = os.getenv("APP_NAME", "DOCUMIND")
    app_description: str = os.getenv("APP_DESCRIPTION", "DOCUMIND - AI-powered document assistant platform")
    app_version: str = os.getenv("APP_VERSION", "1.0.0")
    
    # Server Configuration
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    debug: bool = os.getenv("DEBUG", "true").lower() == "true"
    reload: bool = os.getenv("RELOAD", "true").lower() == "true"
    
    # CORS Configuration
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    allowed_origins: list = json.loads(os.getenv("ALLOWED_ORIGINS", '["http://localhost:3000"]'))
    
    # Database Configuration
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: str = os.getenv("DB_PORT", "5432")
    db_name: str = os.getenv("DB_NAME", "ragdb")
    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = os.getenv("DB_PASSWORD", "postgres")
    
    # OpenAI Configuration
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    llm_model: str = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    max_tokens: int = int(os.getenv("MAX_TOKENS", "1000"))
    temperature: float = float(os.getenv("TEMPERATURE", "0.7"))
    
    # Vector Store Configuration
    chroma_persist_directory: str = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")
    chroma_host: str = os.getenv("CHROMA_HOST", None)  # For Docker setup
    chroma_port: int = int(os.getenv("CHROMA_PORT", "8000"))
    
    # Document Processing
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "1000"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "200"))
    supported_file_types: str = os.getenv("SUPPORTED_FILE_TYPES", ".pdf,.docx,.txt")
    
    # Authentication
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    algorithm: str = os.getenv("ALGORITHM", "HS256")

settings = Settings()