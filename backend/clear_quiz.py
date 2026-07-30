import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://coursera_admin:coursera_password123@localhost:5433/coursera_lms"
engine = create_async_engine(DATABASE_URL)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def clear():
    async with async_session() as db:
        await db.execute(text("DELETE FROM graded_quiz_submissions"))
        await db.commit()
    print("Cleared GradedQuizSubmissions!")


asyncio.run(clear())
