from fastapi import APIRouter, Depends
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
# from app.core.database import get_db # Assuming this dependency exists
from app.services.recommendation_service import recommendation_service

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

async def get_db_mock():
    # Mock dependency until database session management is fully implemented
    yield None

@router.get("/trending", response_model=List[Dict])
async def get_trending_courses():
    """
    Get the top trending courses over the last 7 days.
    """
    return await recommendation_service.get_trending_courses()

@router.get("/continue-learning", response_model=List[Dict])
async def get_continue_learning(
    user_id: int = 1, # Mock user_id, in reality this comes from auth token
    db: AsyncSession = Depends(get_db_mock)
):
    """
    Get courses the user is currently learning.
    """
    return await recommendation_service.get_continue_learning(user_id=user_id, db=db)

@router.get("/for-you", response_model=List[Dict])
async def get_for_you_courses(user_id: int = 1): # Mock user_id
    """
    Get AI-personalized course recommendations based on user's learning history.
    """
    return await recommendation_service.get_for_you_courses(user_id=user_id)
