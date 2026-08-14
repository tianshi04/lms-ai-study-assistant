import io
import json
import logging
import os
import uuid
import zipfile
from collections.abc import Callable
from typing import Any

from src.modules.catalog.domain.entities import (
    Course,
    CourseStatus,
    InteractiveTranscript,
    InVideoQuiz,
    ItemType,
    LearningItem,
    Lesson,
    WeekModule,
)
from src.modules.catalog.domain.repositories import ICatalogRepository
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope
from src.shared.infrastructure.s3_storage import get_s3_storage_service
from src.shared.permissions import (
    CoursePermission,
    enforce_course_ownership,
)

logger = logging.getLogger(__name__)


class ScormUseCase:
    """Application Use Case for SCORM course import/export and packaging."""

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
        allow_read_only_pending: bool = False,
        required_permission: CoursePermission | None = None,
        disallow_published_mutation: bool = False,
    ) -> None:
        if user and course_id:
            course = await repo.get_course_detail(course_id)
            if course:
                enforce_course_ownership(
                    course,
                    user,
                    required_permission=required_permission,
                    action_name=action_name,
                    allow_read_only_pending=allow_read_only_pending,
                )
                if (
                    disallow_published_mutation
                    and course.status == CourseStatus.PUBLISHED
                    and not getattr(user, "is_admin", False)
                ):
                    raise PermissionError(
                        f"Không thể {action_name} này vì khóa học đã được xuất bản (PUBLISHED)."
                    )

    async def export_course_to_scorm(
        self, course_id: str, current_user: CurrentUser | None = None
    ) -> tuple[str, str]:
        """Export a course Outline + Learning Items + Quizzes to a standard SCORM 1.2 ZIP package."""

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(repo, course_id, current_user, "xuất SCORM")
            course = await repo.get_course_detail(course_id)
            if not course:
                raise ValueError("Không tìm thấy khóa học để xuất SCORM.")

            # 1. Build course JSON representation
            course_dict = {
                "id": course.id,
                "title": course.title,
                "slug": course.slug,
                "description": course.description,
                "partnerName": course.partner_name,
                "partnerLogoUrl": course.partner_logo_url,
                "instructorNames": course.instructor_names,
                "ownerId": course.owner_id,
                "coInstructorIds": course.co_instructor_ids,
                "weekModules": [],
            }

            for wm in course.week_modules:
                wm_dict = {
                    "id": wm.id,
                    "weekNumber": wm.week_number,
                    "title": wm.title,
                    "summary": wm.summary,
                    "lessons": [],
                }
                for lesson in wm.lessons:
                    lesson_dict = {
                        "id": lesson.id,
                        "title": lesson.title,
                        "estimatedMinutes": lesson.estimated_minutes,
                        "items": [],
                    }
                    for item in lesson.items:
                        # Convert ItemType to integer
                        type_val = 0
                        if item.type == ItemType.VIDEO:
                            type_val = 1
                        elif item.type == ItemType.READING:
                            type_val = 2
                        elif item.type == ItemType.PRACTICE_QUIZ:
                            type_val = 3
                        elif item.type == ItemType.GRADED_QUIZ:
                            type_val = 4
                        elif item.type == ItemType.AUTO_GRADED_LAB:
                            type_val = 5
                        elif item.type == ItemType.PEER_REVIEW:
                            type_val = 6

                        item_dict = {
                            "id": item.id,
                            "title": item.title,
                            "type": type_val,
                            "estimatedMinutes": item.estimated_minutes,
                            "videoUrl": item.video_url,
                            "readingMarkdown": item.reading_markdown,
                            "vttSubtitleUrl": item.vtt_subtitle_url,
                            "autoTranscribe": item.auto_transcribe,
                            "starterCode": item.starter_code,
                            "testCasesJson": item.test_cases_json,
                            "language": item.language,
                            "rubricCriteriaJson": item.rubric_criteria_json,
                            "quizMatrixId": item.quiz_matrix_id,
                            "inVideoQuizzes": [
                                {
                                    "timestampSeconds": q.timestamp_seconds,
                                    "question": q.question,
                                    "options": q.options,
                                    "correctOptionIndex": q.correct_option_index,
                                    "explanation": q.explanation,
                                }
                                for q in item.in_video_quizzes
                            ],
                            "quizzes": [],
                        }

                        # Load Quiz questions if quiz_matrix_id exists
                        if item.quiz_matrix_id:
                            item_dict[
                                "quizzes"
                            ] = await repo.get_quiz_questions_for_export(
                                item.quiz_matrix_id
                            )

                        lesson_dict["items"].append(item_dict)
                    wm_dict["lessons"].append(lesson_dict)
                course_dict["weekModules"].append(wm_dict)

            # 2. Package everything in a ZIP file in memory
            zip_buffer = io.BytesIO()
            template_dir = os.path.join(
                os.path.dirname(__file__), "..", "infrastructure", "scorm_templates"
            )

            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as z:
                # Add all static files from SCORM templates
                if os.path.exists(template_dir):
                    for root, _, files in os.walk(template_dir):
                        for file in files:
                            full_path = os.path.join(root, file)
                            rel_path = os.path.relpath(full_path, template_dir)
                            z.write(full_path, rel_path)

                # Add course_data.json
                z.writestr(
                    "content/course_data.json",
                    json.dumps(course_dict, ensure_ascii=False, indent=2),
                )

                # Add Level 1 Native file: openlms-course.json
                openlms_metadata = {
                    "exporter": "OpenLMS",
                    "version": "1.0",
                    "course": course_dict,
                }
                z.writestr(
                    "openlms-course.json",
                    json.dumps(openlms_metadata, ensure_ascii=False, indent=2),
                )

            # 3. Upload ZIP file to storage
            zip_bytes = zip_buffer.getvalue()
            object_key = f"scorm/exports/{uuid.uuid4().hex[:16]}.zip"
            s3 = get_s3_storage_service()
            await s3.ensure_bucket_exists()
            await s3.upload_file(
                file_bytes=zip_bytes,
                object_key=object_key,
                content_type="application/zip",
            )
            download_url = await s3.generate_presigned_download_url(object_key)
            return download_url, object_key

    def _map_dict_to_course_entity(self, d: dict) -> Course:
        week_modules = []
        for wm in d.get("weekModules", []):
            lessons = []
            for lesson in wm.get("lessons", []):
                items = []
                for item in lesson.get("items", []):
                    transcripts = [
                        InteractiveTranscript(
                            timestamp_seconds=t.get("timestampSeconds", 0),
                            text=t.get("text", ""),
                        )
                        for t in item.get("interactiveTranscripts", [])
                    ]
                    quizzes = [
                        InVideoQuiz(
                            timestamp_seconds=q.get("timestampSeconds", 0),
                            question=q.get("question", ""),
                            options=list(q.get("options", [])),
                            correct_option_index=q.get("correctOptionIndex", 0),
                            explanation=q.get("explanation", ""),
                        )
                        for q in item.get("inVideoQuizzes", [])
                    ]
                    # Safe mapping of item types
                    raw_type = item.get("type", 0)
                    type_mapping = {
                        1: ItemType.VIDEO,
                        2: ItemType.READING,
                        3: ItemType.PRACTICE_QUIZ,
                        4: ItemType.GRADED_QUIZ,
                        5: ItemType.AUTO_GRADED_LAB,
                        6: ItemType.PEER_REVIEW,
                    }
                    itype = type_mapping.get(raw_type, ItemType.UNSPECIFIED)

                    items.append(
                        LearningItem(
                            id=item.get("id", ""),
                            title=item.get("title", ""),
                            type=itype,
                            estimated_minutes=item.get("estimatedMinutes", 10),
                            video_url=item.get("videoUrl", ""),
                            vtt_subtitle_url=item.get("vttSubtitleUrl", ""),
                            interactive_transcripts=transcripts,
                            in_video_quizzes=quizzes,
                            reading_markdown=item.get("readingMarkdown", ""),
                            order_index=item.get("orderIndex", 0),
                            starter_code=item.get("starterCode", ""),
                            test_cases_json=item.get("testCasesJson", ""),
                            language=item.get("language", ""),
                            rubric_criteria_json=item.get("rubricCriteriaJson", ""),
                            quiz_matrix_id=item.get("quizMatrixId", ""),
                        )
                    )
                lessons.append(
                    Lesson(
                        id=lesson.get("id", ""),
                        title=lesson.get("title", ""),
                        estimated_minutes=lesson.get("estimatedMinutes", 30),
                        items=items,
                        order_index=lesson.get("orderIndex", 0),
                    )
                )
            week_modules.append(
                WeekModule(
                    id=wm.get("id", ""),
                    week_number=wm.get("weekNumber", 1),
                    title=wm.get("title", ""),
                    summary=wm.get("summary", ""),
                    lessons=lessons,
                )
            )

        return Course(
            id=d.get("id", ""),
            title=d.get("title", ""),
            slug=d.get("slug", ""),
            description=d.get("description", ""),
            partner_name=d.get("partnerName", ""),
            partner_logo_url=d.get("partnerLogoUrl", ""),
            instructor_names=list(d.get("instructorNames", [])),
            week_modules=week_modules,
            owner_id=d.get("ownerId", ""),
            co_instructor_ids=list(d.get("coInstructorIds", [])),
        )

    async def parse_scorm_package(
        self, scorm_object_key: str, target_course_id: str
    ) -> tuple[Course | None, bool, LearningItem | None]:
        """Parse uploaded SCORM ZIP to determine capability levels (Level 1: Native Course, Level 2: SCORM Item)."""

        s3 = get_s3_storage_service()
        try:
            file_bytes = await s3.download_file(scorm_object_key)
        except Exception as e:  # noqa: BLE001
            raise ValueError(f"Không thể tải tệp tin SCORM từ storage: {e!s}")

        zip_buffer = io.BytesIO(file_bytes)
        try:
            with zipfile.ZipFile(zip_buffer) as z:
                namelist = z.namelist()

                # Level 1 check: openlms-course.json
                metadata_file = next(
                    (f for f in namelist if f.endswith("openlms-course.json")), None
                )
                if metadata_file:
                    try:
                        metadata_content = z.read(metadata_file).decode("utf-8")
                        metadata = json.loads(metadata_content)
                        if "exporter" not in metadata or "course" not in metadata:
                            raise ValueError(
                                "Thiếu trường thông tin exporter hoặc course trong metadata."
                            )

                        course_dict = metadata["course"]
                        if "weekModules" not in course_dict or not isinstance(
                            course_dict["weekModules"], list
                        ):
                            raise ValueError(
                                "Khóa học thiếu danh sách collection 'weekModules'."
                            )

                        preview_course = self._map_dict_to_course_entity(course_dict)
                        return preview_course, False, None
                    except Exception as err:  # noqa: BLE001
                        raise ValueError(
                            f"Không thể phục hồi cấu trúc khóa học Native: {err!s}"
                        )

                # Level 2 check (standard SCORM): reject it
                manifest_file = next(
                    (f for f in namelist if f.endswith("imsmanifest.xml")), None
                )
                if manifest_file:
                    raise ValueError(
                        "Hệ thống chỉ hỗ trợ import gói SCORM Native định dạng khóa học (Level 1). Gói SCORM tương tác (Level 2) bị từ chối."
                    )

                # Invalid package
                raise ValueError(
                    "Không tìm thấy tệp openlms-course.json hợp lệ trong gói SCORM."
                )
        except zipfile.BadZipFile:
            raise ValueError("Định dạng tệp ZIP không hợp lệ.")

    async def import_course_from_scorm(
        self,
        scorm_object_key: str,
        course_id: str,
        current_user: CurrentUser | None = None,
    ) -> tuple[Course | None, LearningItem | None]:
        """Import course structure (Level 1) or static SCORM package item (Level 2)."""

        s3 = get_s3_storage_service()
        try:
            file_bytes = await s3.download_file(scorm_object_key)
        except Exception as e:  # noqa: BLE001
            raise ValueError(f"Không thể tải tệp tin SCORM từ storage: {e!s}")

        zip_buffer = io.BytesIO(file_bytes)

        with zipfile.ZipFile(zip_buffer) as z:
            namelist = z.namelist()
            metadata_file = next(
                (f for f in namelist if f.endswith("openlms-course.json")), None
            )

            # ----------------------------------------------------
            # Level 1: Full Native Course Restore
            # ----------------------------------------------------
            if metadata_file:
                metadata_content = z.read(metadata_file).decode("utf-8")
                metadata = json.loads(metadata_content)
                course_dict = metadata["course"]

                async with async_session_scope() as session:
                    repo = self.repo_factory(session)
                    await self._verify_ownership(
                        repo, course_id, current_user, "import SCORM"
                    )

                    existing = await repo.get_course_detail(course_id)
                    if not existing:
                        raise ValueError("Không tìm thấy khóa học đích để ghi đè.")

                    # 1. Truncate existing outline completely
                    await repo.clear_course_outline(course_id)

                    # 2. Iterate and restore week modules, lessons, and items
                    for wm_dict in course_dict.get("weekModules", []):
                        wm = await repo.create_week_module(
                            course_id=course_id,
                            title=wm_dict.get("title", ""),
                            summary=wm_dict.get("summary", ""),
                        )
                        for lesson_dict in wm_dict.get("lessons", []):
                            lesson = await repo.create_lesson(
                                course_id=course_id,
                                week_module_id=wm.id,
                                title=lesson_dict.get("title", ""),
                                estimated_minutes=lesson_dict.get(
                                    "estimatedMinutes", 15
                                ),
                            )
                            for item_dict in lesson_dict.get("items", []):
                                await repo.create_learning_item(
                                    course_id=course_id,
                                    lesson_id=lesson.id,
                                    title=item_dict.get("title", ""),
                                    item_type=item_dict.get("type", 1),
                                    estimated_minutes=item_dict.get(
                                        "estimatedMinutes", 10
                                    ),
                                    video_url=item_dict.get("videoUrl", ""),
                                    reading_markdown=item_dict.get(
                                        "readingMarkdown", ""
                                    ),
                                    vtt_subtitle_url=item_dict.get(
                                        "vttSubtitleUrl", ""
                                    ),
                                    auto_transcribe=item_dict.get(
                                        "autoTranscribe", False
                                    ),
                                    in_video_quizzes=item_dict.get(
                                        "inVideoQuizzes", []
                                    ),
                                    starter_code=item_dict.get("starterCode", ""),
                                    test_cases_json=item_dict.get("testCasesJson", ""),
                                    language=item_dict.get("language", ""),
                                    rubric_criteria_json=item_dict.get(
                                        "rubricCriteriaJson", ""
                                    ),
                                    quiz_matrix_id=item_dict.get("quizMatrixId", ""),
                                )

                    refreshed = await repo.get_course_detail(course_id)
                    return refreshed, None

            # ----------------------------------------------------
            # Level 2: Standard SCORM Package (Single Learning Item) - REJECTED
            # ----------------------------------------------------
            manifest_file = next(
                (f for f in namelist if f.endswith("imsmanifest.xml")), None
            )
            if manifest_file:
                raise ValueError(
                    "Hệ thống chỉ hỗ trợ import gói SCORM Native định dạng khóa học (Level 1). Gói SCORM tương tác (Level 2) bị từ chối."
                )

            raise ValueError("Không tìm thấy tệp openlms-course.json hợp lệ trong ZIP.")
