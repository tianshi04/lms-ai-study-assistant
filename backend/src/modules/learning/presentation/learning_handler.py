from connectrpc.request import RequestContext

from src.gen.learning.v1 import learning_pb as pb
from src.gen.learning.v1.learning_connect import LearningService
from src.modules.learning.application.learning_usecase import LearningUseCase
from src.modules.learning.domain.entities import (
    DeadlineStatus,
    LearningProgress,
    PersonalNote,
    WeeklyDeadline,
)


def _to_pb_deadline_status(status: DeadlineStatus) -> pb.DeadlineStatus:
    mapping = {
        DeadlineStatus.UNSPECIFIED: pb.DeadlineStatus.UNSPECIFIED,
        DeadlineStatus.ON_TRACK: pb.DeadlineStatus.ON_TRACK,
        DeadlineStatus.OVERDUE: pb.DeadlineStatus.OVERDUE,
        DeadlineStatus.COMPLETED: pb.DeadlineStatus.COMPLETED,
    }
    return mapping.get(status, pb.DeadlineStatus.UNSPECIFIED)


def _to_pb_weekly_deadline(d: WeeklyDeadline) -> pb.WeeklyDeadline:
    return pb.WeeklyDeadline(
        week_number=d.week_number,
        due_date=d.due_date,
        status=_to_pb_deadline_status(d.status),
    )


def _to_pb_progress(p: LearningProgress) -> pb.LearningProgress:
    return pb.LearningProgress(
        user_id=p.user_id,
        course_id=p.course_id,
        overall_progress_percent=p.overall_progress_percent,
        completed_item_ids=p.completed_item_ids,
        weekly_deadlines=[_to_pb_weekly_deadline(d) for d in p.weekly_deadlines],
    )


def _to_pb_note(note: PersonalNote) -> pb.PersonalNote:
    return pb.PersonalNote(
        id=note.id,
        user_id=note.user_id,
        course_id=note.course_id,
        item_id=note.item_id,
        highlighted_text=note.highlighted_text,
        note_comment=note.note_comment,
        created_at=note.created_at,
    )


class LearningHandler(LearningService):

    def __init__(self, use_case: LearningUseCase) -> None:
        self.use_case = use_case

    async def get_progress(
        self,
        request: pb.GetProgressRequest,
        ctx: RequestContext[pb.GetProgressRequest, pb.GetProgressResponse],
    ) -> pb.GetProgressResponse:
        progress = await self.use_case.get_progress(
            user_id=request.user_id, course_id=request.course_id
        )
        return pb.GetProgressResponse(progress=_to_pb_progress(progress))

    async def reset_deadlines(
        self,
        request: pb.ResetDeadlinesRequest,
        ctx: RequestContext[pb.ResetDeadlinesRequest, pb.ResetDeadlinesResponse],
    ) -> pb.ResetDeadlinesResponse:
        success, progress = await self.use_case.reset_deadlines(
            user_id=request.user_id, course_id=request.course_id
        )
        return pb.ResetDeadlinesResponse(
            success=success, updated_progress=_to_pb_progress(progress)
        )

    async def save_personal_note(
        self,
        request: pb.SavePersonalNoteRequest,
        ctx: RequestContext[pb.SavePersonalNoteRequest, pb.SavePersonalNoteResponse],
    ) -> pb.SavePersonalNoteResponse:
        note = await self.use_case.save_personal_note(
            user_id=request.user_id,
            course_id=request.course_id,
            item_id=request.item_id,
            highlighted_text=request.highlighted_text,
            note_comment=request.note_comment,
        )
        return pb.SavePersonalNoteResponse(note=_to_pb_note(note))

    async def list_personal_notes(
        self,
        request: pb.ListPersonalNotesRequest,
        ctx: RequestContext[pb.ListPersonalNotesRequest, pb.ListPersonalNotesResponse],
    ) -> pb.ListPersonalNotesResponse:
        notes = await self.use_case.list_personal_notes(
            user_id=request.user_id, course_id=request.course_id
        )
        return pb.ListPersonalNotesResponse(notes=[_to_pb_note(n) for n in notes])

    async def mark_item_complete(
        self,
        request: pb.MarkItemCompleteRequest,
        ctx: RequestContext[pb.MarkItemCompleteRequest, pb.MarkItemCompleteResponse],
    ) -> pb.MarkItemCompleteResponse:
        success, progress = await self.use_case.mark_item_complete(
            user_id=request.user_id,
            course_id=request.course_id,
            item_id=request.item_id,
            total_course_items=request.total_course_items,
        )
        return pb.MarkItemCompleteResponse(
            success=success, updated_progress=_to_pb_progress(progress)
        )
