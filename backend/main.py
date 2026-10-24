import uvicorn

from src.main import app  # noqa: F401
from src.shared.config import settings

if __name__ == "__main__":
    # Start the server when running python main.py directly
    uvicorn.run(
        "src.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=settings.ENV.lower() in ("development", "dev"),
        reload_dirs=["src"],
    )
