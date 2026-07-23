import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from src.main import app
from src.seed import seed_database

@pytest_asyncio.fixture()
async def client():
    """
    Tạo test client cho FastAPI app với ASGI transport.
    """
    await seed_database(reset=True)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
