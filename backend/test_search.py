import asyncio
from src.modules.catalog.application.catalog_usecase import CatalogUseCase
from src.modules.catalog.infrastructure.repository import CatalogRepository
from src.shared.infrastructure.database import async_session_scope

async def test_search():
    use_case = CatalogUseCase(lambda session: CatalogRepository(session))
    
    print("ALL COURSES:")
    courses, _ = await use_case.list_courses()
    for c in courses:
        print(f"- {c.title} (Subj: {c.subject}, Lvl: {c.level})")
        
    print("\nFILTER 'python':")
    courses, _ = await use_case.list_courses(search_query="python")
    for c in courses:
        print(f"- {c.title}")
        
    print("\nFILTER by subject 'cat-subj-ds':")
    courses, _ = await use_case.list_courses(subject="cat-subj-ds")
    for c in courses:
        print(f"- {c.title}")

if __name__ == "__main__":
    asyncio.run(test_search())
