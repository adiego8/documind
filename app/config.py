import os
import json
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables from specified path or default
env_file_path = os.getenv("ENV_FILE_PATH", ".env")
load_dotenv(dotenv_path=env_file_path)

# Debug: Print which env file was loaded (only in debug mode)
if os.getenv("DEBUG", "false").lower() == "true":
    print(f"🔧 Loaded environment from: {env_file_path}")
    print(f"🔧 OPENAI_API_KEY present: {'yes' if os.getenv('OPENAI_API_KEY') else 'no'}")
    print(f"🔧 DATABASE_URL present: {'yes' if os.getenv('DATABASE_URL') else 'no'}")
    print(f"🔧 ALLOWED_ORIGINS: {os.getenv('ALLOWED_ORIGINS', 'not set')}")

class Settings:
    def __init__(self):
        # Application
        self.app_name = os.getenv("APP_NAME", "Persona")
        self.app_description = os.getenv("APP_DESCRIPTION", "Persona - AI-powered document assistant platform")
        self.app_version = os.getenv("APP_VERSION", "1.0.0")
        
        # Server Configuration
        self.host = os.getenv("HOST", "0.0.0.0")
        self.port = int(os.getenv("PORT", "8082"))
        self.debug = os.getenv("DEBUG", "false").lower() == "true"  # Secure default: disabled
        self.reload = os.getenv("RELOAD", "false").lower() == "true"  # Secure default: disabled
        
        # CORS Configuration
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        self.allowed_origins = json.loads(os.getenv("ALLOWED_ORIGINS", '["http://localhost:3000"]'))
        
        # Database Configuration
        # Parse DATABASE_URL if provided (Railway), otherwise use individual variables
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            # Parse Railway's DATABASE_URL
            parsed = urlparse(database_url)
            self.db_host = parsed.hostname or "localhost"
            self.db_port = str(parsed.port or 5432)
            self.db_name = parsed.path[1:] if parsed.path else "ragdb"  # Remove leading '/'
            self.db_user = parsed.username or "postgres"
            self.db_password = parsed.password or "password"
            self.db_requires_ssl = "sslmode=require" in database_url or "channel_binding=require" in database_url
            
            # Debug logging for production
            if os.getenv("DEBUG", "false").lower() != "true":
                print(f"📊 Database: {self.db_name} on {self.db_host}:{self.db_port}")
        else:
            # Use individual environment variables (local development)
            self.db_host = os.getenv("DB_HOST", "localhost")
            self.db_port = os.getenv("DB_PORT", "5432")
            self.db_name = os.getenv("DB_NAME", "ragdb")
            self.db_user = os.getenv("DB_USER", "postgres")
            self.db_password = self._get_required_secret("DB_PASSWORD")
            self.db_requires_ssl = os.getenv("DB_REQUIRES_SSL", "false").lower() == "true"
        
        # OpenAI Configuration
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.llm_model = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
        self.embedding_model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
        self.max_tokens = int(os.getenv("MAX_TOKENS", "1000"))
        self.temperature = float(os.getenv("TEMPERATURE", "0.7"))
        
        # Vector Store Configuration
        # Using PostgreSQL with pgvector - no separate configuration needed
        
        # Document Processing
        self.chunk_size = int(os.getenv("CHUNK_SIZE", "1000"))
        self.chunk_overlap = int(os.getenv("CHUNK_OVERLAP", "200"))
        self.supported_file_types = os.getenv("SUPPORTED_FILE_TYPES", ".pdf,.docx,.txt")
        self.max_file_size_mb = int(os.getenv("MAX_FILE_SIZE_MB", "10"))  # 10MB default
        self.max_file_size_bytes = self.max_file_size_mb * 1024 * 1024
        
        # Authentication
        self.secret_key = self._get_required_secret("SECRET_KEY")
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        self.algorithm = os.getenv("ALGORITHM", "HS256")

    def _get_required_secret(self, env_var_name: str) -> str:
        """Get required secret from environment or fail"""
        value = os.getenv(env_var_name)

        if not value:
            raise ValueError(
                f"\n❌ CRITICAL: {env_var_name} environment variable is required!\n\n"
                f"Generate a secure secret:\n"
                f"  python -c \"import secrets; print(secrets.token_urlsafe(32))\"\n\n"
                f"Then set it:\n"
                f"  export {env_var_name}=<generated-secret>\n"
            )

        # Warn if secret looks weak
        if len(value) < 32 or value in ["your-secret-key-here", "secret", "password", "changeme"]:
            print(f"\n⚠️  WARNING: {env_var_name} appears weak (length: {len(value)}). Use 32+ random characters.\n")

        return value

settings = Settings()
