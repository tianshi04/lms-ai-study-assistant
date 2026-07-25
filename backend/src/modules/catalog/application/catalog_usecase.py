from typing import Any, Callable

from src.modules.catalog.domain.entities import (
    Course,
    LearningItem,
    Lesson,
    Specialization,
)
from src.modules.catalog.domain.repository import ICatalogRepository
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.shared.infrastructure.database import async_session_scope
from src.shared.infrastructure.s3_storage import get_s3_storage_service


class CatalogUseCase:
    """Application Use Case coordinator for Catalog domain using Dependency Inversion (ICatalogRepository interface)."""

    def __init__(
        self,
        repo_factory: Callable[[Any], ICatalogRepository] | None = None,
    ) -> None:
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyCatalogRepository(session)
        )

    async def list_courses(
        self, page_size: int = 10, page_token: str = ""
    ) -> tuple[list[Course], str]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            seed_fn = getattr(repo, "seed_if_empty", None)
            if callable(seed_fn):
                await seed_fn()
            return await repo.list_courses(page_size, page_token)

    async def get_course_detail(self, course_id: str) -> Course | None:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            seed_fn = getattr(repo, "seed_if_empty", None)
            if callable(seed_fn):
                await seed_fn()
            return await repo.get_course_detail(course_id)

    async def get_lesson_detail(self, course_id: str, lesson_id: str) -> Lesson | None:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            seed_fn = getattr(repo, "seed_if_empty", None)
            if callable(seed_fn):
                await seed_fn()
            return await repo.get_lesson_detail(course_id, lesson_id)

    async def get_specialization(
        self, specialization_id: str
    ) -> tuple[Specialization | None, list[Course]]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            seed_fn = getattr(repo, "seed_if_empty", None)
            if callable(seed_fn):
                await seed_fn()
            return await repo.get_specialization(specialization_id)

    async def create_course(
        self,
        title: str,
        slug: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        instructor_names: list[str],
    ) -> Course:
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            return await repo.create_course(
                title=title,
                slug=slug,
                description=description,
                partner_name=partner_name,
                partner_logo_url=partner_logo_url,
                instructor_names=instructor_names,
            )

    async def update_course(
        self,
        course_id: str,
        title: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        instructor_names: list[str],
    ) -> Course | None:
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            return await repo.update_course(
                course_id=course_id,
                title=title,
                description=description,
                partner_name=partner_name,
                partner_logo_url=partner_logo_url,
                instructor_names=instructor_names,
            )

    async def create_week_module(
        self, course_id: str, week_number: int, title: str, summary: str
    ):
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            return await repo.create_week_module(
                course_id=course_id,
                week_number=week_number,
                title=title,
                summary=summary,
            )

    async def create_lesson(
        self, course_id: str, week_module_id: str, title: str, estimated_minutes: int
    ):
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            return await repo.create_lesson(
                course_id=course_id,
                week_module_id=week_module_id,
                title=title,
                estimated_minutes=estimated_minutes,
            )

    async def create_learning_item(
        self,
        course_id: str,
        lesson_id: str,
        title: str,
        item_type: int,
        estimated_minutes: int,
        video_url: str,
        reading_markdown: str,
    ):
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            return await repo.create_learning_item(
                course_id=course_id,
                lesson_id=lesson_id,
                title=title,
                item_type=item_type,
                estimated_minutes=estimated_minutes,
                video_url=video_url,
                reading_markdown=reading_markdown,
            )

    async def submit_course_review(
        self,
        user_id: str,
        user_name: str,
        course_id: str,
        rating_stars: int,
        comment_text: str,
    ):
        if rating_stars < 1 or rating_stars > 5:
            raise ValueError("Rating stars must be between 1 and 5.")

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.submit_course_review(
                user_id=user_id,
                user_name=user_name,
                course_id=course_id,
                rating_stars=rating_stars,
                comment_text=comment_text,
            )

    async def list_course_reviews(
        self, course_id: str, page_size: int = 10, page_token: str = ""
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_course_reviews(
                course_id=course_id, page_size=page_size, page_token=page_token
            )

    async def get_scorm_upload_url(
        self, item_id: str, filename: str
    ) -> tuple[str, str]:
        object_key = f"scorm/tmp/{item_id}_{filename}"
        s3 = get_s3_storage_service()
        await s3.ensure_bucket_exists()
        upload_url = await s3.generate_presigned_upload_url(
            object_key=object_key, content_type="application/zip", expiration=3600
        )
        return upload_url, object_key

    async def process_scorm_package(
        self,
        course_id: str,
        lesson_id: str,
        title: str,
        estimated_minutes: int,
        object_key: str,
    ) -> LearningItem:
        import io
        import zipfile
        import mimetypes
        import xml.etree.ElementTree as ET
        import uuid

        s3 = get_s3_storage_service()
        try:
            zip_bytes = await s3.download_file(object_key)
        except Exception as e:
            raise ValueError(f"Failed to download SCORM package from storage: {e}")

        try:
            zip_file = zipfile.ZipFile(io.BytesIO(zip_bytes))
        except Exception as e:
            raise ValueError(f"Invalid ZIP file: {e}")

        manifest_path = None
        for name in zip_file.namelist():
            if name.endswith("imsmanifest.xml"):
                manifest_path = name
                break

        if not manifest_path:
            raise ValueError("imsmanifest.xml not found in SCORM package.")

        prefix = manifest_path.replace("imsmanifest.xml", "")

        try:
            manifest_bytes = zip_file.read(manifest_path)
            root = ET.fromstring(manifest_bytes)
        except Exception as e:
            raise ValueError(f"Failed to parse imsmanifest.xml: {e}")

        items = []
        resources = {}
        for elem in root.iter():
            tag_local = elem.tag.split("}")[-1]
            if tag_local == "item":
                items.append(elem)
            elif tag_local == "resource":
                res_id = elem.get("identifier")
                if res_id:
                    resources[res_id] = elem

        entry_file = ""
        for item in items:
            ref = item.get("identifierref")
            if ref and ref in resources:
                entry_file = resources[ref].get("href", "")
                if entry_file:
                    break

        if not entry_file and resources:
            for res_id, res in resources.items():
                entry_file = res.get("href", "")
                if entry_file:
                    break

        if not entry_file:
            raise ValueError("No entry HTML launch file found in SCORM manifest.")

        scorm_entry_html = prefix + entry_file
        item_id = f"item-{uuid.uuid4().hex[:8]}"
        scorm_package_path = f"scorm/packages/{item_id}"

        for zipinfo in zip_file.infolist():
            if zipinfo.is_dir():
                continue
            file_bytes = zip_file.read(zipinfo.filename)
            dest_key = f"{scorm_package_path}/{zipinfo.filename}"
            content_type, _ = mimetypes.guess_type(zipinfo.filename)
            if not content_type:
                content_type = "application/octet-stream"
            await s3.upload_file(
                file_bytes=file_bytes, object_key=dest_key, content_type=content_type
            )

        try:
            await s3.delete_file(object_key)
        except Exception:
            pass

        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            item = await repo.create_scorm_learning_item(
                item_id=item_id,
                course_id=course_id,
                lesson_id=lesson_id,
                title=title,
                estimated_minutes=estimated_minutes,
                scorm_package_path=scorm_package_path,
                scorm_entry_html=scorm_entry_html,
            )
            return item
