import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from src.shared.config import settings

async def run():
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        from sqlalchemy import text
        res = await conn.execute(text("SELECT id, subject, level FROM courses LIMIT 5;"))
        for row in res:
            print(row)

asyncio.run(run())
