from fastapi import APIRouter, HTTPException, Depends
from datetime import timedelta
from app.database import UserDB, AdminCodeDB
from app.auth import authenticate_user, create_access_token, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from app.schemas import UserCreate, UserLogin, Token
from typing import Optional

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=dict)
async def register(
    user_data: UserCreate, 
    user_code: Optional[str] = None, 
    admin_code: Optional[str] = None
):
    # Check if user already exists
    if UserDB.user_exists(user_data.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Determine registration flow based on role and provided codes
    if user_data.role == 'admin':
        # Admin registration requires admin_code
        if not admin_code:
            raise HTTPException(status_code=400, detail="Admin code is required for admin registration")
        
        if not AdminCodeDB.can_register_user(admin_code):
            raise HTTPException(status_code=400, detail="Invalid or expired admin code")
        
        admin_code_data = AdminCodeDB.get_admin_code_by_code(admin_code)
        admin_code_id = admin_code_data['id']
    else:
        # User registration requires user_code
        if not user_code:
            raise HTTPException(status_code=400, detail="User code is required for user registration")
        
        if not AdminCodeDB.can_register_user_with_user_code(user_code):
            raise HTTPException(status_code=400, detail="Invalid or expired user code")
        
        admin_code_data = AdminCodeDB.get_admin_code_by_user_code(user_code)
        admin_code_id = admin_code_data['id']
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    try:
        user = UserDB.create_user(user_data.username, hashed_password, user_data.role, admin_code_id)
        
        # Increment user count for the admin code
        AdminCodeDB.increment_user_count(admin_code or user_code)
        
        return {"message": "User created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user = authenticate_user(user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['username']}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "role": user['role']
    }