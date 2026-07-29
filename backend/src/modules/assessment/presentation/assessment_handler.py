from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.request import RequestContext

from src.gen.assessment.v1 import assessment_pb as pb
from src.gen.assessment.v1.assessment_connect import AssessmentService
from src.modules.assessment.application.assessment_usecase import AssessmentUseCase
from src.modules.assessment.domain.constants import (
    DEFAULT_PASSING_THRESHOLD_PERCENT,
    MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN,
)
from src.modules.assessment.domain.entities import RubricCriteria
from src.shared.auth import CurrentUser, require_current_user


class AssessmentHandler(AssessmentService):
    def __init__(self, use_case: AssessmentUseCase) -> None:
        self.use_case = use_case

    async def submit_honor_code(
        self,
        request: pb.SubmitHonorCodeRequest,
        ctx: RequestContext[pb.SubmitHonorCodeRequest, pb.SubmitHonorCodeResponse],
    ) -> pb.SubmitHonorCodeResponse:
        current_user = require_current_user()
        success, msg = await self.use_case.submit_honor_code(
            user_id=current_user.id,
            item_id=request.item_id,
            is_agreed=request.is_agreed,
        )
        return pb.SubmitHonorCodeResponse(success=success, message=msg)

    async def submit_graded_quiz(
        self,
        request: pb.SubmitGradedQuizRequest,
        ctx: RequestContext[pb.SubmitGradedQuizRequest, pb.SubmitGradedQuizResponse],
    ) -> pb.SubmitGradedQuizResponse:
        current_user = require_current_user()
        res = await self.use_case.submit_graded_quiz(
            user_id=current_user.id,
            item_id=request.item_id,
            selected_option_indexes=list(request.selected_option_indexes),
            session_token=request.session_token or None,
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
        ctx: RequestContext[
            pb.SubmitAutoGradedLabRequest, pb.SubmitAutoGradedLabResponse
        ],
    ) -> pb.SubmitAutoGradedLabResponse:
        current_user = require_current_user()
        res = await self.use_case.submit_auto_graded_lab(
            user_id=current_user.id,
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
        ctx: RequestContext[
            pb.SubmitPeerAssignmentRequest, pb.SubmitPeerAssignmentResponse
        ],
    ) -> pb.SubmitPeerAssignmentResponse:
        current_user = require_current_user()
        sub_id, msg = await self.use_case.submit_peer_assignment(
            user_id=current_user.id,
            item_id=request.item_id,
            submission_url=request.submission_url,
            text_content=request.text_content,
        )
        return pb.SubmitPeerAssignmentResponse(submission_id=sub_id, status_message=msg)

    async def get_peer_reviews_to_grade(
        self,
        request: pb.GetPeerReviewsToGradeRequest,
        ctx: RequestContext[
            pb.GetPeerReviewsToGradeRequest, pb.GetPeerReviewsToGradeResponse
        ],
    ) -> pb.GetPeerReviewsToGradeResponse:
        current_user = require_current_user()
        items = await self.use_case.get_peer_reviews_to_grade(
            user_id=current_user.id, item_id=request.item_id
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
        ctx: RequestContext[
            pb.SubmitPeerReviewGradeRequest, pb.SubmitPeerReviewGradeResponse
        ],
    ) -> pb.SubmitPeerReviewGradeResponse:
        current_user = require_current_user()
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
            reviewer_user_id=current_user.id,
            graded_criteria=domain_rubrics,
        )
        return pb.SubmitPeerReviewGradeResponse(success=success, message=msg)

    async def submit_grade_appeal(
        self,
        request: pb.SubmitGradeAppealRequest,
        ctx: RequestContext[pb.SubmitGradeAppealRequest, pb.SubmitGradeAppealResponse],
    ) -> pb.SubmitGradeAppealResponse:

        current_user = require_current_user()
        try:
            success, status = await self.use_case.submit_grade_appeal(
                user_id=current_user.id,
                submission_id=request.submission_id,
                appeal_reason=request.appeal_reason,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))
        return pb.SubmitGradeAppealResponse(success=success, appeal_status=status)

    async def report_peer_review(
        self,
        request: pb.ReportPeerReviewRequest,
        ctx: RequestContext[pb.ReportPeerReviewRequest, pb.ReportPeerReviewResponse],
    ) -> pb.ReportPeerReviewResponse:
        current_user = require_current_user()
        success, msg = await self.use_case.report_peer_review(
            user_id=current_user.id,
            review_id=request.review_id,
            report_reason=request.report_reason,
        )
        return pb.ReportPeerReviewResponse(success=success, message=msg)

    async def regrade_peer_submission_by_staff(
        self,
        request: pb.RegradePeerSubmissionByStaffRequest,
        ctx: RequestContext[
            pb.RegradePeerSubmissionByStaffRequest,
            pb.RegradePeerSubmissionByStaffResponse,
        ],
    ) -> pb.RegradePeerSubmissionByStaffResponse:
        current_user = require_current_user()
        role = (current_user.role or "").lower()
        is_staff = any(
            r in role
            for r in ("ta", "teaching assistant", "instructor", "staff", "admin")
        ) or current_user.role in (
            "USER_ROLE_INSTRUCTOR",
            "USER_ROLE_TA",
            "USER_ROLE_SUPER_ADMIN",
            "USER_ROLE_PARTNER_ADMIN",
        )
        if not is_staff:
            raise ConnectError(
                Code.PERMISSION_DENIED,
                "Chỉ Trợ giảng (TA) hoặc Giảng viên mới có quyền chấm điểm trực tiếp bài nộp của học viên.",
            )

        success, msg = await self.use_case.regrade_peer_submission_by_staff(
            submission_id=request.submission_id,
            staff_user_id=current_user.id,
            ta_score=request.ta_score,
        )
        return pb.RegradePeerSubmissionByStaffResponse(success=success, message=msg)

    def _verify_instructor_permission(self) -> CurrentUser:
        user = require_current_user()
        if not user.is_staff():
            raise ConnectError(
                Code.PERMISSION_DENIED,
                "Chỉ tài khoản Giảng viên (Instructor) hoặc Quản trị viên mới có quyền quản lý Ngân hàng câu hỏi và Ma trận đề thi.",
            )
        return user

    async def create_question_bank(
        self,
        request: pb.CreateQuestionBankRequest,
        ctx: RequestContext[
            pb.CreateQuestionBankRequest, pb.CreateQuestionBankResponse
        ],
    ) -> pb.CreateQuestionBankResponse:
        self._verify_instructor_permission()
        bank = await self.use_case.create_question_bank(
            course_id=request.course_id,
            title=request.title,
            category=request.category,
            description=request.description,
        )
        return pb.CreateQuestionBankResponse(
            bank=pb.QuestionBank(
                id=bank.id,
                course_id=bank.course_id,
                title=bank.title,
                category=bank.category,
                description=bank.description,
                created_at=bank.created_at or "",
            )
        )

    async def list_question_banks(
        self,
        request: pb.ListQuestionBanksRequest,
        ctx: RequestContext[pb.ListQuestionBanksRequest, pb.ListQuestionBanksResponse],
    ) -> pb.ListQuestionBanksResponse:
        require_current_user()
        banks = await self.use_case.list_question_banks(course_id=request.course_id)
        pb_banks = []
        for b in banks:
            pb_questions = []
            for q in b.questions:
                pb_options = [
                    pb.QuestionOption(
                        id=opt.id,
                        question_id=opt.question_id,
                        option_text=opt.option_text,
                        is_correct=opt.is_correct,
                        order_index=opt.order_index,
                    )
                    for opt in q.options
                ]
                pb_questions.append(
                    pb.Question(
                        id=q.id,
                        bank_id=q.bank_id,
                        text=q.text,
                        question_type=q.question_type,
                        difficulty=q.difficulty,
                        explanation=q.explanation,
                        options=pb_options,
                        created_at=q.created_at or "",
                    )
                )
            pb_banks.append(
                pb.QuestionBank(
                    id=b.id,
                    course_id=b.course_id,
                    title=b.title,
                    category=b.category,
                    description=b.description,
                    questions=pb_questions,
                    created_at=b.created_at or "",
                )
            )
        return pb.ListQuestionBanksResponse(banks=pb_banks)

    async def add_question_to_bank(
        self,
        request: pb.AddQuestionToBankRequest,
        ctx: RequestContext[pb.AddQuestionToBankRequest, pb.AddQuestionToBankResponse],
    ) -> pb.AddQuestionToBankResponse:
        self._verify_instructor_permission()
        options_data = [
            {"option_text": opt.option_text, "is_correct": opt.is_correct}
            for opt in request.options
        ]
        q = await self.use_case.add_question_to_bank(
            bank_id=request.bank_id,
            text=request.text,
            question_type=request.question_type,
            difficulty=request.difficulty,
            explanation=request.explanation,
            options_data=options_data,
        )
        pb_options = [
            pb.QuestionOption(
                id=opt.id,
                question_id=opt.question_id,
                option_text=opt.option_text,
                is_correct=opt.is_correct,
                order_index=opt.order_index,
            )
            for opt in q.options
        ]
        return pb.AddQuestionToBankResponse(
            question=pb.Question(
                id=q.id,
                bank_id=q.bank_id,
                text=q.text,
                question_type=q.question_type,
                difficulty=q.difficulty,
                explanation=q.explanation,
                options=pb_options,
                created_at=q.created_at or "",
            )
        )

    async def configure_quiz_matrix(
        self,
        request: pb.ConfigureQuizMatrixRequest,
        ctx: RequestContext[
            pb.ConfigureQuizMatrixRequest, pb.ConfigureQuizMatrixResponse
        ],
    ) -> pb.ConfigureQuizMatrixResponse:
        self._verify_instructor_permission()
        matrix = await self.use_case.configure_quiz_matrix(
            item_id=request.item_id,
            bank_id=request.bank_id,
            time_limit_minutes=request.time_limit_minutes,
            passing_threshold_percent=request.passing_threshold_percent,
            easy_count=request.easy_count,
            medium_count=request.medium_count,
            hard_count=request.hard_count,
            shuffle_options=request.shuffle_options,
        )
        return pb.ConfigureQuizMatrixResponse(
            matrix=pb.QuizMatrix(
                item_id=matrix.item_id,
                bank_id=matrix.bank_id,
                time_limit_minutes=matrix.time_limit_minutes,
                passing_threshold_percent=matrix.passing_threshold_percent,
                easy_count=matrix.easy_count,
                medium_count=matrix.medium_count,
                hard_count=matrix.hard_count,
                shuffle_options=matrix.shuffle_options,
            )
        )

    async def get_quiz_matrix(
        self,
        request: pb.GetQuizMatrixRequest,
        ctx: RequestContext[pb.GetQuizMatrixRequest, pb.GetQuizMatrixResponse],
    ) -> pb.GetQuizMatrixResponse:
        require_current_user()
        matrix = await self.use_case.get_quiz_matrix(item_id=request.item_id)
        if not matrix:
            raise ConnectError(
                Code.NOT_FOUND, f"Quiz Matrix for item {request.item_id} not found"
            )
        return pb.GetQuizMatrixResponse(
            matrix=pb.QuizMatrix(
                item_id=matrix.item_id,
                bank_id=matrix.bank_id,
                time_limit_minutes=matrix.time_limit_minutes,
                passing_threshold_percent=matrix.passing_threshold_percent,
                easy_count=matrix.easy_count,
                medium_count=matrix.medium_count,
                hard_count=matrix.hard_count,
                shuffle_options=matrix.shuffle_options,
            )
        )

    async def update_question(
        self,
        request: pb.UpdateQuestionRequest,
        ctx: RequestContext[pb.UpdateQuestionRequest, pb.UpdateQuestionResponse],
    ) -> pb.UpdateQuestionResponse:
        self._verify_instructor_permission()
        options_data = [
            {"option_text": opt.option_text, "is_correct": opt.is_correct}
            for opt in request.options
        ]
        q = await self.use_case.update_question(
            question_id=request.question_id,
            text=request.text,
            question_type=request.question_type,
            difficulty=request.difficulty,
            explanation=request.explanation,
            options_data=options_data,
        )
        pb_options = [
            pb.QuestionOption(
                id=opt.id,
                question_id=opt.question_id,
                option_text=opt.option_text,
                is_correct=opt.is_correct,
                order_index=opt.order_index,
            )
            for opt in q.options
        ]
        return pb.UpdateQuestionResponse(
            question=pb.Question(
                id=q.id,
                bank_id=q.bank_id,
                text=q.text,
                question_type=q.question_type,
                difficulty=q.difficulty,
                explanation=q.explanation,
                options=pb_options,
                created_at=q.created_at or "",
            )
        )

    async def delete_question(
        self,
        request: pb.DeleteQuestionRequest,
        ctx: RequestContext[pb.DeleteQuestionRequest, pb.DeleteQuestionResponse],
    ) -> pb.DeleteQuestionResponse:
        self._verify_instructor_permission()
        success = await self.use_case.delete_question(question_id=request.question_id)
        msg = (
            "Deleted successfully"
            if success
            else "Failed to delete question or not found"
        )
        return pb.DeleteQuestionResponse(success=success, message=msg)

    async def start_graded_quiz_session(
        self,
        request: pb.StartGradedQuizSessionRequest,
        ctx: RequestContext[
            pb.StartGradedQuizSessionRequest, pb.StartGradedQuizSessionResponse
        ],
    ) -> pb.StartGradedQuizSessionResponse:
        current_user = require_current_user()
        res = await self.use_case.start_graded_quiz_session(
            user_id=current_user.id,
            item_id=request.item_id,
        )

        pb_questions = []
        for q in res["questions"]:
            pb_options = [
                pb.QuizSessionQuestionOption(
                    option_index=idx,
                    option_text=opt_text,
                )
                for idx, opt_text in enumerate(q["options"])
            ]
            pb_questions.append(
                pb.QuizSessionQuestion(
                    question_id=q["question_id"],
                    text=q["text"],
                    options=pb_options,
                    question_type=q.get("question_type", "SINGLE_CHOICE"),
                )
            )

        return pb.StartGradedQuizSessionResponse(
            session_id=res["session_id"],
            time_limit_minutes=res["duration_minutes"],
            passing_threshold_percent=res.get(
                "passing_threshold_percent", DEFAULT_PASSING_THRESHOLD_PERCENT
            ),
            questions=pb_questions,
            start_time_iso=res["start_time_iso"],
            session_seed=res["session_seed"],
            cooldown_seconds_left=res.get("cooldown_seconds_left", 0),
            attempts_left=res.get("attempts_left", MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN),
            session_token=res.get("session_token", ""),
        )
