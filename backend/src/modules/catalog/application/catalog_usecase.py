import html
import uuid
from typing import Any, Callable

from src.modules.catalog.domain.entities import (
    Course,
    ItemType,
    LearningItem,
    Lesson,
    Specialization,
    WeekModule,
)
from src.modules.catalog.domain.repository import ICatalogRepository
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.learning.infrastructure.repository import SQLAlchemyLearningRepository
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope
from src.shared.infrastructure.s3_storage import get_s3_storage_service
from src.shared.permissions import enforce_course_ownership


class CatalogUseCase:
    """Application Use Case coordinator for Catalog domain using Dependency Inversion (ICatalogRepository interface)."""

    def __init__(
        self,
        repo_factory: Callable[[Any], ICatalogRepository] | None = None,
    ) -> None:
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyCatalogRepository(session)
        )

    async def _verify_ownership(
        self,
        repo: ICatalogRepository,
        course_id: str,
        user: CurrentUser | None,
        action_name: str = "quản lý khóa học",
    ) -> None:
        if user and course_id:
            course = await repo.get_course_detail(course_id)
            if course:
                enforce_course_ownership(
                    course.owner_id, course.co_instructor_ids, user, action_name
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
        owner_id: str = "",
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
                owner_id=owner_id,
            )

    async def update_course(
        self,
        course_id: str,
        title: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        instructor_names: list[str],
        current_user: CurrentUser | None = None,
    ) -> Course | None:
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            await self._verify_ownership(
                repo, course_id, current_user, "chỉnh sửa khóa học"
            )
            return await repo.update_course(
                course_id=course_id,
                title=title,
                description=description,
                partner_name=partner_name,
                partner_logo_url=partner_logo_url,
                instructor_names=instructor_names,
            )

    async def create_week_module(
        self,
        course_id: str,
        week_number: int,
        title: str,
        summary: str,
        current_user: CurrentUser | None = None,
    ):
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            await self._verify_ownership(repo, course_id, current_user, "tạo tuần học")
            return await repo.create_week_module(
                course_id=course_id,
                week_number=week_number,
                title=title,
                summary=summary,
            )

    async def create_lesson(
        self,
        course_id: str,
        week_module_id: str,
        title: str,
        estimated_minutes: int,
        current_user: CurrentUser | None = None,
    ):
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            await self._verify_ownership(repo, course_id, current_user, "tạo bài học")
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
        item_type: int | ItemType | str,
        estimated_minutes: int,
        video_url: str,
        reading_markdown: str,
        vtt_subtitle_url: str = "",
        in_video_quizzes: list | None = None,
        starter_code: str = "",
        test_cases_json: str = "",
        language: str = "",
        rubric_criteria_json: str = "",
        quiz_matrix_id: str = "",
        scorm_package_path: str = "",
        scorm_entry_html: str = "",
        current_user: CurrentUser | None = None,
    ):
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            await self._verify_ownership(repo, course_id, current_user, "tạo học liệu")
            return await repo.create_learning_item(
                course_id=course_id,
                lesson_id=lesson_id,
                title=title,
                item_type=item_type,
                estimated_minutes=estimated_minutes,
                video_url=video_url,
                reading_markdown=reading_markdown,
                vtt_subtitle_url=vtt_subtitle_url,
                in_video_quizzes=in_video_quizzes,
                starter_code=starter_code,
                test_cases_json=test_cases_json,
                language=language,
                rubric_criteria_json=rubric_criteria_json,
                quiz_matrix_id=quiz_matrix_id,
                scorm_package_path=scorm_package_path,
                scorm_entry_html=scorm_entry_html,
            )

    async def submit_course_review(
        self,
        user_id: str,
        user_name: str,
        course_id: str,
        rating_stars: int,
        comment_text: str,
        user_role: str = "",
    ):
        if rating_stars < 1 or rating_stars > 5:
            raise ValueError("Rating stars must be between 1 and 5.")

        # BR_REVIEW_003: Fail-fast 2000 char validation and safe Stored XSS sanitization
        trimmed_comment = comment_text.strip()
        if len(trimmed_comment) > 2000:
            raise ValueError(
                "Văn bản nhận xét không được vượt quá 2000 ký tự (BR_REVIEW_003)."
            )
        clean_comment = html.escape(trimmed_comment)

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            real_course_id, instructor_names = await repo.get_course_id_by_slug_or_id(
                course_id
            )

            # BR_REVIEW_004: Check if user is instructor or TA of the course
            is_instructor_role = any(
                r in user_role.lower() for r in ["instructor", "ta"]
            )
            is_instructor_id_or_name = user_id.startswith("inst_") or (
                instructor_names and user_name in instructor_names
            )
            if is_instructor_role or is_instructor_id_or_name:
                raise ValueError(
                    "Giảng viên không được phép tự gửi đánh giá cho khóa học của mình (BR_REVIEW_004)."
                )

            # BR_REVIEW_001: Check if user completed at least 50% of the course via Learning domain
            learning_repo = SQLAlchemyLearningRepository(session)
            progress = await learning_repo.get_progress(user_id, real_course_id)

            if not progress or progress.overall_progress_percent < 50.0:
                raise ValueError(
                    "Chỉ học viên hoàn thành tối thiểu 50% tiến độ khóa học mới có quyền gửi đánh giá (BR_REVIEW_001)."
                )

            is_verified_completer = progress.overall_progress_percent >= 100.0

            return await repo.submit_course_review(
                user_id=user_id,
                user_name=user_name,
                course_id=real_course_id,
                rating_stars=rating_stars,
                comment_text=clean_comment,
                is_verified_completer=is_verified_completer,
            )

    async def list_course_reviews(
        self, course_id: str, page_size: int = 10, page_token: str = ""
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            real_course_id, _ = await repo.get_course_id_by_slug_or_id(course_id)

            return await repo.list_course_reviews(
                course_id=real_course_id, page_size=page_size, page_token=page_token
            )

    async def delete_course(
        self, course_id: str, current_user: CurrentUser | None = None
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(repo, course_id, current_user, "xóa khóa học")
            return await repo.delete_course(course_id)

    async def update_week_module(
        self,
        id: str,
        course_id: str,
        week_number: int,
        title: str,
        summary: str,
        current_user: CurrentUser | None = None,
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "chỉnh sửa tuần học"
            )
            return await repo.update_week_module(
                id=id,
                course_id=course_id,
                week_number=week_number,
                title=title,
                summary=summary,
            )

    async def delete_week_module(
        self, id: str, course_id: str, current_user: CurrentUser | None = None
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(repo, course_id, current_user, "xóa tuần học")
            return await repo.delete_week_module(id=id, course_id=course_id)

    async def update_lesson(
        self,
        id: str,
        course_id: str,
        week_module_id: str,
        title: str,
        estimated_minutes: int,
        current_user: CurrentUser | None = None,
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "chỉnh sửa bài học"
            )
            return await repo.update_lesson(
                id=id,
                course_id=course_id,
                week_module_id=week_module_id,
                title=title,
                estimated_minutes=estimated_minutes,
            )

    async def delete_lesson(
        self, id: str, course_id: str, current_user: CurrentUser | None = None
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(repo, course_id, current_user, "xóa bài học")
            return await repo.delete_lesson(id=id, course_id=course_id)

    async def update_learning_item(
        self,
        id: str,
        course_id: str,
        lesson_id: str,
        title: str,
        item_type: int,
        estimated_minutes: int,
        video_url: str,
        reading_markdown: str,
        in_video_quizzes: list | None = None,
        starter_code: str = "",
        test_cases_json: str = "",
        language: str = "",
        rubric_criteria_json: str = "",
        quiz_matrix_id: str = "",
        scorm_package_path: str = "",
        scorm_entry_html: str = "",
        current_user: CurrentUser | None = None,
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "chỉnh sửa học liệu"
            )
            return await repo.update_learning_item(
                id=id,
                course_id=course_id,
                lesson_id=lesson_id,
                title=title,
                item_type=item_type,
                estimated_minutes=estimated_minutes,
                video_url=video_url,
                reading_markdown=reading_markdown,
                in_video_quizzes=in_video_quizzes,
                starter_code=starter_code,
                test_cases_json=test_cases_json,
                language=language,
                rubric_criteria_json=rubric_criteria_json,
                quiz_matrix_id=quiz_matrix_id,
                scorm_package_path=scorm_package_path,
                scorm_entry_html=scorm_entry_html,
            )

    async def delete_learning_item(
        self, id: str, course_id: str, current_user: CurrentUser | None = None
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(repo, course_id, current_user, "xóa học liệu")
            return await repo.delete_learning_item(id=id, course_id=course_id)

    async def create_course_announcement(
        self,
        course_id: str,
        author_id: str,
        author_name: str,
        title: str,
        content: str,
        current_user: CurrentUser | None = None,
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "đăng thông báo khóa học"
            )
            return await repo.create_course_announcement(
                course_id=course_id,
                author_id=author_id,
                author_name=author_name,
                title=title,
                content=content,
            )

    async def list_course_announcements(self, course_id: str):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_course_announcements(course_id=course_id)

    async def get_instructor_analytics(
        self, course_id: str, current_user: CurrentUser | None = None
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "xem báo cáo lớp học"
            )
            return await repo.get_instructor_analytics(course_id=course_id)

    async def reorder_week_modules(
        self,
        course_id: str,
        ordered_week_module_ids: list[str],
        current_user: CurrentUser | None = None,
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "sắp xếp tuần học"
            )
            return await repo.reorder_week_modules(
                course_id=course_id, ordered_week_module_ids=ordered_week_module_ids
            )

    async def reorder_lessons(
        self,
        course_id: str,
        week_module_id: str,
        ordered_lesson_ids: list[str],
        current_user: CurrentUser | None = None,
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "sắp xếp bài học"
            )
            return await repo.reorder_lessons(
                course_id=course_id,
                week_module_id=week_module_id,
                ordered_lesson_ids=ordered_lesson_ids,
            )

    async def reorder_learning_items(
        self,
        course_id: str,
        lesson_id: str,
        ordered_item_ids: list[str],
        current_user: CurrentUser | None = None,
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "sắp xếp học liệu"
            )
            return await repo.reorder_learning_items(
                course_id=course_id,
                lesson_id=lesson_id,
                ordered_item_ids=ordered_item_ids,
            )

    async def parse_scorm_package(
        self, scorm_object_key: str, target_course_id: str = ""
    ) -> tuple[Course | None, bool, LearningItem | None]:
        import io
        import zipfile
        import xml.etree.ElementTree as ET

        s3 = get_s3_storage_service()
        zip_bytes = await s3.download_file(scorm_object_key)

        course_title = "Imported SCORM Course"
        lessons_extracted = []

        try:
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
                if "imsmanifest.xml" in zf.namelist():
                    xml_content = zf.read("imsmanifest.xml").decode(
                        "utf-8", errors="ignore"
                    )
                    root = ET.fromstring(xml_content)
                    title_node = root.find(".//{*}title")
                    if title_node is not None and title_node.text:
                        course_title = title_node.text.strip()

                    items_nodes = root.findall(".//{*}item")
                    items_list = []
                    for idx, node in enumerate(items_nodes, start=1):
                        item_title_node = node.find("{*}title")
                        item_title = (
                            item_title_node.text.strip()
                            if item_title_node is not None and item_title_node.text
                            else f"Lesson Item {idx}"
                        )
                        items_list.append(
                            LearningItem(
                                id=f"scorm_preview_item_{idx}",
                                title=item_title,
                                type=ItemType.READING,
                                estimated_minutes=10,
                                reading_markdown=f"# {item_title}\n\nSCORM Content imported from package.",
                                order_index=idx,
                            )
                        )
                    if items_list:
                        lessons_extracted.append(
                            Lesson(
                                id="scorm_preview_lesson_1",
                                title="Module 1: SCORM Content",
                                estimated_minutes=15 * len(items_list),
                                items=items_list,
                                order_index=1,
                            )
                        )
        except Exception:
            pass

        if not lessons_extracted:
            lessons_extracted = [
                Lesson(
                    id="scorm_preview_lesson_1",
                    title="Lesson 1: SCORM Module",
                    estimated_minutes=15,
                    items=[
                        LearningItem(
                            id="scorm_preview_item_1",
                            title="SCORM Package Content",
                            type=ItemType.READING,
                            estimated_minutes=10,
                            reading_markdown="# Imported SCORM Content",
                            order_index=1,
                        )
                    ],
                    order_index=1,
                )
            ]

        preview_course = Course(
            id=f"preview_{uuid.uuid4().hex[:6]}",
            title=course_title,
            slug=f"preview-{uuid.uuid4().hex[:6]}",
            description="Preview course from imported SCORM package",
            partner_name="SCORM Import Engine",
            partner_logo_url="",
            instructor_names=["SCORM Engine"],
            week_modules=[
                WeekModule(
                    id="scorm_preview_week_1",
                    week_number=1,
                    title="Week 1",
                    summary="Imported SCORM Module",
                    lessons=lessons_extracted,
                )
            ],
        )
        return preview_course, False, None

    async def import_course_from_scorm(
        self,
        scorm_object_key: str,
        course_id: str = "",
        target_lesson_id: str = "",
        current_user: CurrentUser | None = None,
    ) -> tuple[Course, LearningItem | None]:
        preview_course, _, _ = await self.parse_scorm_package(
            scorm_object_key, course_id
        )

        rand_suffix = uuid.uuid4().hex[:6]
        if not course_id:
            course = await self.create_course(
                title=preview_course.title
                if preview_course
                else "Imported SCORM Course",
                slug=f"scorm-course-{rand_suffix}",
                description="Course imported from SCORM package",
                partner_name="SCORM Import",
                partner_logo_url="",
                instructor_names=["Instructor"],
                owner_id=current_user.id if current_user else "",
            )
            course_id = course.id

        module = await self.create_week_module(
            course_id=course_id,
            week_number=1,
            title="Week 1: Imported SCORM Content",
            summary="Automatically imported SCORM package content",
            current_user=current_user,
        )

        lesson = await self.create_lesson(
            course_id=course_id,
            week_module_id=module.id,
            title="Lesson 1: SCORM Items",
            estimated_minutes=15,
            current_user=current_user,
        )

        imported_item = None
        if preview_course and preview_course.week_modules:
            for wm in preview_course.week_modules:
                for l_item in wm.lessons:
                    for i in l_item.items:
                        imported_item = await self.create_learning_item(
                            course_id=course_id,
                            lesson_id=lesson.id,
                            title=i.title,
                            item_type=i.type,
                            estimated_minutes=i.estimated_minutes,
                            video_url=i.video_url,
                            reading_markdown=i.reading_markdown,
                            starter_code=i.starter_code,
                            test_cases_json=i.test_cases_json,
                            language=i.language,
                            rubric_criteria_json=i.rubric_criteria_json,
                            quiz_matrix_id=i.quiz_matrix_id,
                            scorm_package_path=i.scorm_package_path,
                            scorm_entry_html=i.scorm_entry_html,
                            current_user=current_user,
                        )

        final_course = await self.get_course_detail(course_id)
        res_course = final_course or preview_course
        assert res_course is not None
        return res_course, imported_item

    async def export_course_to_scorm(
        self, course_id: str, current_user: CurrentUser | None = None
    ) -> tuple[str, str]:
        import io
        import zipfile

        course = await self.get_course_detail(course_id)
        if not course:
            raise ValueError(f"Course with ID '{course_id}' not found")

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            items_xml = []
            resources_xml = []

            item_count = 0
            for wm in course.week_modules or []:
                for lesson in wm.lessons or []:
                    for item in lesson.items or []:
                        item_count += 1
                        file_name = f"item_{item.id}.html"
                        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{item.title}</title>
    <script>
        var api = window.parent.API || window.opener.API;
        if (api && typeof api.LMSInitialize === "function") {{
            api.LMSInitialize("");
            api.LMSSetValue("cmi.core.lesson_status", "completed");
            api.LMSCommit("");
        }}
    </script>
</head>
<body>
    <h1>{item.title}</h1>
    <div>{item.reading_markdown or item.video_url}</div>
</body>
</html>"""
                        zf.writestr(file_name, html_content)
                        items_xml.append(
                            f'<item identifier="item_{item.id}" identifierref="res_{item.id}"><title>{item.title}</title></item>'
                        )
                        resources_xml.append(
                            f'<resource identifier="res_{item.id}" type="webcontent" adlcp:scormtype="sco" href="{file_name}"><file href="{file_name}"/></resource>'
                        )

            manifest_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="COURSE_{course.id}" version="1.2"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="org_1">
    <organization identifier="org_1">
      <title>{course.title}</title>
      {"".join(items_xml)}
    </organization>
  </organizations>
  <resources>
    {"".join(resources_xml)}
  </resources>
</manifest>"""
            zf.writestr("imsmanifest.xml", manifest_content)

        zip_bytes = zip_buffer.getvalue()
        object_key = f"scorm/exports/{course.id}_scorm12.zip"
        s3 = get_s3_storage_service()
        await s3.upload_file(zip_bytes, object_key, content_type="application/zip")
        download_url = await s3.generate_presigned_download_url(object_key)
        return download_url, object_key

    async def process_scorm_package(
        self,
        course_id: str,
        lesson_id: str,
        title: str,
        estimated_minutes: int,
        object_key: str,
        current_user: CurrentUser | None = None,
    ) -> LearningItem:
        import io
        import zipfile
        import uuid

        s3 = get_s3_storage_service()
        zip_bytes = await s3.download_file(object_key)

        pkg_id = f"scorm_{uuid.uuid4().hex[:8]}"
        base_pkg_path = f"scorm/packages/{pkg_id}"
        entry_html = "index.html"

        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            for fname in zf.namelist():
                if fname.endswith("/") or fname.startswith("__MACOSX"):
                    continue
                file_content = zf.read(fname)
                s3_key = f"{base_pkg_path}/{fname}"
                c_type = (
                    "text/html"
                    if fname.endswith(".html")
                    else "application/octet-stream"
                )
                await s3.upload_file(file_content, s3_key, content_type=c_type)
                if fname.lower().endswith("index.html"):
                    entry_html = fname

        return await self.create_learning_item(
            course_id=course_id,
            lesson_id=lesson_id,
            title=title,
            item_type=2,
            estimated_minutes=estimated_minutes,
            video_url="",
            reading_markdown="",
            scorm_package_path=base_pkg_path,
            scorm_entry_html=entry_html,
            current_user=current_user,
        )

    async def generate_upload_url(
        self, filename: str, content_type: str, folder: str = "videos"
    ) -> tuple[str, str, str]:
        """Generate presigned upload URL and public file access URL for MinIO/S3."""
        import uuid

        s3 = get_s3_storage_service()
        await s3.ensure_bucket_exists()
        ext = filename.split(".")[-1] if "." in filename else "bin"
        safe_folder = folder.strip("/") if folder else "videos"
        object_key = f"{safe_folder}/{uuid.uuid4().hex[:12]}.{ext}"

        upload_url = await s3.generate_presigned_upload_url(
            object_key, content_type=content_type or "application/octet-stream"
        )
        file_url = f"{s3.endpoint_url}/{s3.bucket_name}/{object_key}"
        return upload_url, file_url, object_key

    async def upload_media_file(
        self,
        filename: str,
        content_type: str,
        file_bytes: bytes,
        folder: str = "videos",
    ) -> tuple[str, str]:
        """Upload raw file bytes directly to MinIO/S3 storage."""
        import uuid

        s3 = get_s3_storage_service()
        await s3.ensure_bucket_exists()
        ext = filename.split(".")[-1] if "." in filename else "bin"
        safe_folder = folder.strip("/") if folder else "videos"
        object_key = f"{safe_folder}/{uuid.uuid4().hex[:12]}.{ext}"

        await s3.upload_file(
            file_bytes=file_bytes,
            object_key=object_key,
            content_type=content_type or "application/octet-stream",
        )
        file_url = f"{s3.endpoint_url}/{s3.bucket_name}/{object_key}"
        return file_url, object_key
