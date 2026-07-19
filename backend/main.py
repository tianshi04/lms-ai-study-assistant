import uvicorn
from src.main import app  # noqa: F401

if __name__ == "__main__":
    # Start the server when running python main.py directly
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
