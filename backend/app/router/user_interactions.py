from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime
import json

from ..database.models import UserInteraction, User
from ..schemas.interactions import InteractionCreate, InteractionResponse
from ..jwt_utils import get_user_from_token

# Import async database dependency from explains.py
from .explain import get_async_db

router = APIRouter(
    tags=["interactions"]
)

@router.post("/api/track-interaction/", response_model=InteractionResponse)
async def track_interaction(
    interaction_data: InteractionCreate,
    db: AsyncSession = Depends(get_async_db),
    user_id: int = Header(...),  # FastAPI will convert user_id to user-id automatically
    authorization: Optional[str] = Header(None)
):
    """
    Track user interactions in the application
    """
    # Debug logging
    # print(f"Received interaction request - user_id header: {user_id}")
    # print(f"Interaction type: {interaction_data.interaction_type}")
    # print(f"Details: {interaction_data.details}")
    
    # Convert user_id to int if provided
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id header is required")
    
    try:
        user_id_int = int(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")
    
    # Authenticate user
    try:
        user_data = get_user_from_token(authorization)
        if user_data.get("id") != user_id_int:
            raise HTTPException(status_code=401, detail="Unauthorized: Token user doesn't match header user")
    except Exception as e:
        print(f"Auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing token")
    
    # Verify user exists using async query
    result = await db.execute(select(User).where(User.id == user_id_int))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail=f"User ID {user_id_int} not found")
    
    # Create interaction record
    interaction = UserInteraction(
        user_id=user_id_int,
        interaction_type=interaction_data.interaction_type,
        details=json.dumps(interaction_data.details, ensure_ascii=False) if interaction_data.details else None,
    )
    
    # Add and commit using async session
    db.add(interaction)
    await db.commit()
    await db.refresh(interaction)
    
    print(f"Successfully stored interaction with ID: {interaction.id}")
    
    return InteractionResponse(
        id=interaction.id,
        interaction_type=interaction.interaction_type,
        timestamp=interaction.created_at,
        status="success"
    )

@router.get("/api/user-interactions/{user_id}")
async def get_user_interactions(
    user_id: int,
    limit: int = 100,
    interaction_type: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db),
    authorization: Optional[str] = Header(None)
):
    """
    Get user interactions for analytics
    """
    # Authenticate user
    try:
        user_data = get_user_from_token(authorization)
        if user_data.get("id") != user_id:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid token")
    except:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing token")
    
    # Build async query
    query = select(UserInteraction).where(UserInteraction.user_id == user_id)
    
    if interaction_type:
        query = query.where(UserInteraction.interaction_type == interaction_type)
    
    # Order by most recent and limit
    query = query.order_by(UserInteraction.created_at.desc()).limit(limit)
    
    # Execute async query
    result = await db.execute(query)
    interactions = result.scalars().all()
    
    return interactions