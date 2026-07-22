from connectrpc.request import RequestContext

from src.gen.assessment.v1 import assessment_pb as pb
from src.gen.assessment.v1.assessment_connect import AssessmentService
from src.modules.assessment.application.assessment_usecase import AssessmentUseCase
from src.modules.assessment.domain.entities import RubricCriteria


class AssessmentHandler(AssessmentService):

    def __init__(self, use_case: AssessmentUseCase) -> None:
        self.use_case = use_case

    async def submit_honor_code(
        self,
        request: pb.SubmitHonorCodeRequest,
        ctx: RequestContext[pb.SubmitHonorCodeRequest, pb.SubmitHonorCodeResponse],
    ) -> pb.SubmitHonorCodeResponse:
        success, msg = await self.use_case.submit_honor_code(
            user_id=request.user_id,
            item_id=request.item_id,
            is_agreed=request.is_agreed,
        )
        return pb.SubmitHonorCodeResponse(success=success, message=msg)

    async def submit_graded_quiz(
        self,
        request: pb.SubmitGradedQuizRequest,
        ctx: RequestContext[pb.SubmitGradedQuizRequest, pb.SubmitGradedQuizResponse],
    ) -> pb.SubmitGradedQuizResponse:
        res = await self.use_case.submit_graded_quiz(
            user_id=request.user_id,
            item_id=request.item_id,
            selected_option_indexes=list(request.selected_option_indexes),
        )
        quiz_result = pb.QuizResult(
            score_percent=res["score_percent"],
            passed=res["passed"],
            attempts_left=res["attempts_left"],
            cooldown_seconds_left=res["cooldown_seconds_left"],
            answer_explanations=res["answer_explanations"],
        )
        return pb.SubmitGradedQuizResponse(result=quiz_result)

    async def submit_auto_graded_lab(
        self,
        request: pb.SubmitAutoGradedLabRequest,
        ctx: RequestContext[pb.SubmitAutoGradedLabRequest, pb.SubmitAutoGradedLabResponse],
    ) -> pb.SubmitAutoGradedLabResponse:
        res = await self.use_case.submit_auto_graded_lab(
            user_id=request.user_id,
            item_id=request.item_id,
            source_code=request.source_code,
            language=request.language or "python",
        )
        lab_result = pb.AutoGradedLabResult(
            score_percent=res["score_percent"],
            passed=res["passed"],
            total_test_cases=res["total_test_cases"],
            passed_test_cases=res["passed_test_cases"],
            test_logs=res["test_logs"],
        )
        return pb.SubmitAutoGradedLabResponse(result=lab_result)

    async def submit_peer_assignment(
        self,
        request: pb.SubmitPeerAssignmentRequest,
        ctx: RequestContext[pb.SubmitPeerAssignmentRequest, pb.SubmitPeerAssignmentResponse],
    ) -> pb.SubmitPeerAssignmentResponse:
        sub_id, msg = await self.use_case.submit_peer_assignment(
            user_id=request.user_id,
            item_id=request.item_id,
            submission_url=request.submission_url,
            text_content=request.text_content,
        )
        return pb.SubmitPeerAssignmentResponse(submission_id=sub_id, status_message=msg)

    async def get_peer_reviews_to_grade(
        self,
        request: pb.GetPeerReviewsToGradeRequest,
        ctx: RequestContext[pb.GetPeerReviewsToGradeRequest, pb.GetPeerReviewsToGradeResponse],
    ) -> pb.GetPeerReviewsToGradeResponse:
        items = await self.use_case.get_peer_reviews_to_grade(
            user_id=request.user_id, item_id=request.item_id
        )
        pb_items: list[pb.PeerReviewItemToGrade] = []
        for item in items:
            rubrics = [
                pb.RubricCriteria(
                    criteria_id=c.criteria_id,
                    title=c.title,
                    max_score=c.max_score,
                    score_given=c.score_given,
                    feedback=c.feedback,
                )
                for c in item["rubric_criteria"]
            ]
            pb_items.append(
                pb.PeerReviewItemToGrade(
                    review_id=item["review_id"],
                    submission_url=item["submission_url"],
                    text_content=item["text_content"],
                    rubric_criteria=rubrics,
                )
            )
        return pb.GetPeerReviewsToGradeResponse(items_to_grade=pb_items)

    async def submit_peer_review_grade(
        self,
        request: pb.SubmitPeerReviewGradeRequest,
        ctx: RequestContext[pb.SubmitPeerReviewGradeRequest, pb.SubmitPeerReviewGradeResponse],
    ) -> pb.SubmitPeerReviewGradeResponse:
        domain_rubrics = [
            RubricCriteria(
                criteria_id=c.criteria_id,
                title=c.title,
                max_score=c.max_score,
                score_given=c.score_given,
                feedback=c.feedback,
            )
            for c in request.graded_criteria
        ]
        success, msg = await self.use_case.submit_peer_review_grade(
            review_id=request.review_id,
            reviewer_user_id=request.reviewer_user_id,
            graded_criteria=domain_rubrics,
        )
        return pb.SubmitPeerReviewGradeResponse(success=success, message=msg)

    async def submit_grade_appeal(
        self,
        request: pb.SubmitGradeAppealRequest,
        ctx: RequestContext[pb.SubmitGradeAppealRequest, pb.SubmitGradeAppealResponse],
    ) -> pb.SubmitGradeAppealResponse:
        success, status = await self.use_case.submit_grade_appeal(
            user_id=request.user_id,
            submission_id=request.submission_id,
            appeal_reason=request.appeal_reason,
        )
        return pb.SubmitGradeAppealResponse(success=success, appeal_status=status)
