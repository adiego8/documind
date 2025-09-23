import os
import json
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

class Settings:
    def __init__(self):
        # Application
        self.app_name = os.getenv("APP_NAME", "DOCUMIND")
        self.app_description = os.getenv("APP_DESCRIPTION", "DOCUMIND - AI-powered document assistant platform")
        self.app_version = os.getenv("APP_VERSION", "1.0.0")
        
        # Server Configuration
        self.host = os.getenv("HOST", "0.0.0.0")
        self.port = int(os.getenv("PORT", "8000"))
        self.debug = os.getenv("DEBUG", "true").lower() == "true"
        self.reload = os.getenv("RELOAD", "true").lower() == "true"
        
        # CORS Configuration
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        self.allowed_origins = json.loads(os.getenv("ALLOWED_ORIGINS", '["http://localhost:3000"]'))
        
        # Database Configuration
        # Parse DATABASE_URL if provided (Railway), otherwise use individual variables
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            # Parse Railway's DATABASE_URL
            parsed = urlparse(database_url)
            self.db_host = parsed.hostname
            self.db_port = str(parsed.port or 5432)
            self.db_name = parsed.path[1:]  # Remove leading '/'
            self.db_user = parsed.username
            self.db_password = parsed.password
        else:
            # Use individual environment variables (local development)
            self.db_host = os.getenv("DB_HOST", "localhost")
            self.db_port = os.getenv("DB_PORT", "5432")
            self.db_name = os.getenv("DB_NAME", "ragdb")
            self.db_user = os.getenv("DB_USER", "postgres")
            self.db_password = os.getenv("DB_PASSWORD", "postgres")
        
        # OpenAI Configuration
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.llm_model = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
        self.embedding_model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
        self.max_tokens = int(os.getenv("MAX_TOKENS", "1000"))
        self.temperature = float(os.getenv("TEMPERATURE", "0.7"))
        
        # Vector Store Configuration
        self.chroma_persist_directory = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")
        self.chroma_host = os.getenv("CHROMA_HOST", None)  # For Docker setup
        self.chroma_port = int(os.getenv("CHROMA_PORT", "8000"))
        
        # Document Processing
        self.chunk_size = int(os.getenv("CHUNK_SIZE", "1000"))
        self.chunk_overlap = int(os.getenv("CHUNK_OVERLAP", "200"))
        self.supported_file_types = os.getenv("SUPPORTED_FILE_TYPES", ".pdf,.docx,.txt")
        
        # Authentication
        self.secret_key = os.getenv("SECRET_KEY", "your-secret-key-here")
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        self.algorithm = os.getenv("ALGORITHM", "HS256")

settings = Settings()