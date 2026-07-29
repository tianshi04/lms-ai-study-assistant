import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://coursera_admin:coursera_password123@localhost:5433/coursera_lms"
engine = create_async_engine(DATABASE_URL)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def check():
    async with async_session() as db:
        res = await db.execute(text("SELECT count(*) FROM graded_quiz_submission"))
        count = res.scalar()
        print(f"Submissions count: {count}")


asyncio.run(check())
