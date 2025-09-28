from fastapi import APIRouter, Depends
from app.auth import get_current_admin_user
from app.llm_config import LLMConfig

router = APIRouter(prefix="/llm", tags=["llm-config"])

@router.get("/configurations")
async def get_llm_configurations(current_user: dict = Depends(get_current_admin_user)):
    """Get available LLM configurations for admins"""
    return {
        "default": LLMConfig.get_default_config(),
        "predefined": LLMConfig.get_available_configurations(),
        "validation": {
            "temperature_range": LLMConfig.TEMPERATURE_RANGE,
            "max_tokens_range": LLMConfig.MAX_TOKENS_RANGE
        }
    }

@router.post("/validate")
async def validate_llm_config(
    config: dict,
    current_user: dict = Depends(get_current_admin_user)
):
    """Validate LLM configuration parameters"""
    errors = LLMConfig.validate_config(config)
    if errors:
        return {"valid": False, "errors": errors}
    else:
        normalized = LLMConfig.normalize_config(config)
        return {"valid": True, "normalized_config": normalized}