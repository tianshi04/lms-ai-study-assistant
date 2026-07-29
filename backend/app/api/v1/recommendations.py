from starlette.responses import JSONResponse
from starlette.requests import Request
from app.services.recommendation_service import recommendation_service


async def get_trending_courses(request: Request) -> JSONResponse:
    """
    Get the top trending courses over the last 7 days.
    """
    data = await recommendation_service.get_trending_courses()
    return JSONResponse(data)


async def get_continue_learning(request: Request) -> JSONResponse:
    """
    Get courses the user is currently learning.
    """
    # Mock user_id = 1
    data = await recommendation_service.get_continue_learning(user_id=1, db=None)
    return JSONResponse(data)


async def get_for_you_courses(request: Request) -> JSONResponse:
    """
    Get AI-personalized course recommendations based on user's learning history.
    """
    # Mock user_id = 1
    data = await recommendation_service.get_for_you_courses(user_id=1)
    return JSONResponse(data)
