"""
LLM Configuration Management
Centralized configuration for LLM parameters like temperature, max_tokens, etc.
"""
from typing import Dict, Any
from app.config import settings

class LLMConfig:
    """Centralized LLM configuration management"""
    
    # Default LLM parameters
    DEFAULT_TEMPERATURE = 0.7
    DEFAULT_MAX_TOKENS = 1000
    DEFAULT_MODEL = "gpt-3.5-turbo"
    
    # Parameter ranges for validation
    TEMPERATURE_RANGE = (0.0, 2.0)
    MAX_TOKENS_RANGE = (100, 4000)
    
    # Predefined configurations for different use cases
    CONFIGURATIONS = {
        "balanced": {
            "temperature": 0.7,
            "max_tokens": 1000,
            "description": "Balanced creativity and focus for general use"
        },
        "creative": {
            "temperature": 1.2,
            "max_tokens": 1500,
            "description": "Higher creativity for brainstorming and creative tasks"
        },
        "focused": {
            "temperature": 0.3,
            "max_tokens": 800,
            "description": "Lower temperature for factual, precise responses"
        },
        "detailed": {
            "temperature": 0.5,
            "max_tokens": 2000,
            "description": "Moderate creativity with longer responses"
        },
        "concise": {
            "temperature": 0.4,
            "max_tokens": 500,
            "description": "Brief, focused responses"
        }
    }
    
    @classmethod
    def get_default_config(cls) -> Dict[str, Any]:
        """Get default LLM configuration"""
        return {
            "temperature": getattr(settings, 'temperature', cls.DEFAULT_TEMPERATURE),
            "max_tokens": getattr(settings, 'max_tokens', cls.DEFAULT_MAX_TOKENS),
            "model": getattr(settings, 'llm_model', cls.DEFAULT_MODEL)
        }
    
    @classmethod
    def get_configuration(cls, config_name: str) -> Dict[str, Any]:
        """Get a predefined configuration by name"""
        if config_name not in cls.CONFIGURATIONS:
            raise ValueError(f"Configuration '{config_name}' not found. Available: {list(cls.CONFIGURATIONS.keys())}")
        
        config = cls.CONFIGURATIONS[config_name].copy()
        config["model"] = getattr(settings, 'llm_model', cls.DEFAULT_MODEL)
        return config
    
    @classmethod
    def validate_temperature(cls, temperature: float) -> bool:
        """Validate temperature value"""
        min_temp, max_temp = cls.TEMPERATURE_RANGE
        return min_temp <= temperature <= max_temp
    
    @classmethod
    def validate_max_tokens(cls, max_tokens: int) -> bool:
        """Validate max_tokens value"""
        min_tokens, max_tokens_limit = cls.MAX_TOKENS_RANGE
        return min_tokens <= max_tokens <= max_tokens_limit
    
    @classmethod
    def validate_config(cls, config: Dict[str, Any]) -> Dict[str, str]:
        """Validate LLM configuration and return any errors"""
        errors = {}
        
        if "temperature" in config:
            if not cls.validate_temperature(config["temperature"]):
                min_temp, max_temp = cls.TEMPERATURE_RANGE
                errors["temperature"] = f"Temperature must be between {min_temp} and {max_temp}"
        
        if "max_tokens" in config:
            if not cls.validate_max_tokens(config["max_tokens"]):
                min_tokens, max_tokens_limit = cls.MAX_TOKENS_RANGE
                errors["max_tokens"] = f"Max tokens must be between {min_tokens} and {max_tokens_limit}"
        
        return errors
    
    @classmethod
    def normalize_config(cls, config: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize and fill missing values in config"""
        default_config = cls.get_default_config()
        
        normalized = {
            "temperature": config.get("temperature", default_config["temperature"]),
            "max_tokens": config.get("max_tokens", default_config["max_tokens"]),
            "model": config.get("model", default_config["model"])
        }
        
        return normalized
    
    @classmethod
    def get_available_configurations(cls) -> Dict[str, Dict[str, Any]]:
        """Get all available predefined configurations"""
        return cls.CONFIGURATIONS