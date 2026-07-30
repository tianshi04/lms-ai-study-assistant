import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from src.core.config import settings
from src.modules.catalog.infrastructure.models import CourseModel
from sqlalchemy import select, cast, String


async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        instructor_id = "user-instructor-002"
        stmt = select(CourseModel)
        instructor_cond = (CourseModel.owner_id == instructor_id) | (
            cast(CourseModel.co_instructor_ids, String).contains(instructor_id)
        )
        stmt = stmt.where(instructor_cond)
        print("Executing query...")
        try:
            res = await session.execute(stmt)
            courses = res.scalars().all()
            print(f"Found {len(courses)} courses")
        except Exception as e:
            print(f"Error executing query: {e}")


if __name__ == "__main__":
    asyncio.run(main())
