import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine("postgresql+asyncpg://coursera_admin:coursera_password123@localhost:5432/coursera_lms")
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, title, subject, level FROM courses"))
        for row in res.fetchall():
            print(f"Course {row[0]}: subject={row[2]}, level={row[3]}, title={row[1]}")

asyncio.run(main())
