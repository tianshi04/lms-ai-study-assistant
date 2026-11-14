from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.request import RequestContext

from src.gen.assessment.v1 import assessment_pb as pb
from src.gen.assessment.v1.assessment_connect import AssessmentService
from src.modules.assessment.application import AssessmentUseCase
from src.modules.assessment.domain import (
    DEFAULT_PASSING_THRESHOLD_PERCENT,
    MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN,
    AdminAssessmentAlertKind,
    RubricCriteria,
)
from src.shared.auth import CurrentUser, CurrentUserContext, require_current_user
from src.shared.permissions import CoursePermission, enforce_course_ownership


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
        qa_list = [list(qa.selected_option_indexes) for qa in request.question_answers]

        try:
            res = await self.use_case.submit_graded_quiz(
                user_id=current_user.id,
                item_id=request.item_id,
                question_answers=qa_list,
                session_seed=request.session_seed or None,
                start_time_iso=request.start_time_iso or None,
                preview=request.preview,
            )
        except ValueError as e:
            raise ConnectError(Code.FAILED_PRECONDITION, str(e))
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))

        quiz_result = pb.QuizResult(
            score_percent=res["score_percent"],
            passed=res["passed"],
            attempts_left=res["attempts_left"],
            cooldown_seconds_left=res["cooldown_seconds_left"],
            answer_explanations=res["answer_explanations"],
            max_attempts=res.get("max_attempts", MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN),
            cooldown_hours=res.get("cooldown_hours", 8),
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
        if not request.language:
            raise ConnectError(
                Code.INVALID_ARGUMENT, "Vui lòng chỉ định ngôn ngữ lập trình"
            )
        try:
            res = await self.use_case.submit_auto_graded_lab(
                user_id=current_user.id,
                item_id=request.item_id,
                source_code=request.source_code,
                language=request.language,
            )
        except ValueError as e:
            raise ConnectError(Code.FAILED_PRECONDITION, str(e))
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))
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
        try:
            sub_id, msg = await self.use_case.submit_peer_assignment(
                user_id=current_user.id,
                item_id=request.item_id,
                submission_url=request.submission_url,
                text_content=request.text_content,
            )
        except ValueError as e:
            raise ConnectError(Code.FAILED_PRECONDITION, str(e))
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))
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
        try:
            success, msg = await self.use_case.submit_peer_review_grade(
                review_id=request.review_id,
                reviewer_user_id=current_user.id,
                graded_criteria=domain_rubrics,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e
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
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e
        return pb.SubmitGradeAppealResponse(success=success, appeal_status=status)

    async def report_peer_review(
        self,
        request: pb.ReportPeerReviewRequest,
        ctx: RequestContext[pb.ReportPeerReviewRequest, pb.ReportPeerReviewResponse],
    ) -> pb.ReportPeerReviewResponse:
        current_user = require_current_user()
        try:
            success, msg = await self.use_case.report_peer_review(
                user_id=current_user.id,
                review_id=request.review_id,
                report_reason=request.report_reason,
            )
            return pb.ReportPeerReviewResponse(success=success, message=msg)
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

    async def regrade_peer_submission_by_staff(
        self,
        request: pb.RegradePeerSubmissionByStaffRequest,
        ctx: RequestContext[
            pb.RegradePeerSubmissionByStaffRequest,
            pb.RegradePeerSubmissionByStaffResponse,
        ],
    ) -> pb.RegradePeerSubmissionByStaffResponse:
        current_user = require_current_user()
        try:
            course = await self.use_case.get_course_for_item_or_submission(
                submission_id=request.submission_id
            )
            user_ctx = CurrentUserContext(
                id=current_user.id, role=current_user.role, email=current_user.email
            )
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.GRADE_ASSESSMENTS,
                action_name="chấm đè điểm bài nộp",
            )
            success, msg = await self.use_case.regrade_peer_submission_by_staff(
                submission_id=request.submission_id,
                staff_user_id=current_user.id,
                ta_score=request.ta_score,
                current_user=current_user,
            )
            return pb.RegradePeerSubmissionByStaffResponse(success=success, message=msg)
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

    def _verify_instructor_permission(self) -> CurrentUser:
        user = require_current_user()
        if not user.is_staff:
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
        user = self._verify_instructor_permission()
        if not request.course_id or not request.course_id.strip():
            raise ConnectError(
                Code.INVALID_ARGUMENT,
                "Mã khóa học không được để trống (course_id là bắt buộc).",
            )
        course_id = request.course_id.strip()
        title = request.title.strip() if request.title else ""
        if not title:
            raise ConnectError(
                Code.INVALID_ARGUMENT, "Tiêu đề ngân hàng câu hỏi không được để trống"
            )

        try:
            course = await self.use_case.get_course_for_item_or_submission(
                course_id=course_id
            )
            user_ctx = CurrentUserContext(id=user.id, role=user.role, email=user.email)
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.MANAGE_CURRICULUM,
                action_name="tạo ngân hàng câu hỏi",
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

        bank = await self.use_case.create_question_bank(
            course_id=course.id,
            title=title,
            category=request.category,
            description=request.description,
            current_user=user,
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
        user = self._verify_instructor_permission()
        if not request.course_id or not request.course_id.strip():
            raise ConnectError(
                Code.INVALID_ARGUMENT,
                "Mã khóa học không được để trống (course_id là bắt buộc).",
            )
        course_id = request.course_id.strip()

        try:
            course = await self.use_case.get_course_for_item_or_submission(
                course_id=course_id
            )
            user_ctx = CurrentUserContext(id=user.id, role=user.role, email=user.email)
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.MANAGE_CURRICULUM,
                action_name="xem ngân hàng câu hỏi",
                allow_read_only_pending=True,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

        banks = await self.use_case.list_question_banks(course_id=course.id)
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
        user = self._verify_instructor_permission()
        bank_id = request.bank_id.strip() if request.bank_id else ""
        if not bank_id:
            raise ConnectError(
                Code.INVALID_ARGUMENT, "Mã ngân hàng câu hỏi không được để trống"
            )

        try:
            course = await self.use_case.get_course_for_item_or_submission(
                bank_id=bank_id
            )
            user_ctx = CurrentUserContext(id=user.id, role=user.role, email=user.email)
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.MANAGE_CURRICULUM,
                action_name="thêm câu hỏi vào ngân hàng",
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

        options_data = [
            {"option_text": opt.option_text, "is_correct": opt.is_correct}
            for opt in request.options
        ]
        q = await self.use_case.add_question_to_bank(
            bank_id=bank_id,
            text=request.text,
            question_type=request.question_type,
            difficulty=request.difficulty,
            explanation=request.explanation,
            options_data=options_data,
            current_user=user,
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
        user = self._verify_instructor_permission()
        item_id = request.item_id.strip() if request.item_id else ""
        if not item_id:
            raise ConnectError(
                Code.INVALID_ARGUMENT, "Mã mục học tập không được để trống"
            )
        bank_id = request.bank_id.strip() if request.bank_id else ""
        if not bank_id:
            raise ConnectError(
                Code.INVALID_ARGUMENT, "Mã ngân hàng câu hỏi không được để trống"
            )

        try:
            course = await self.use_case.get_course_for_item_or_submission(
                item_id=item_id
            )
            user_ctx = CurrentUserContext(id=user.id, role=user.role, email=user.email)
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.MANAGE_CURRICULUM,
                action_name="cấu hình ma trận đề thi",
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

        matrix = await self.use_case.configure_quiz_matrix(
            item_id=item_id,
            bank_id=bank_id,
            time_limit_minutes=request.time_limit_minutes,
            passing_threshold_percent=request.passing_threshold_percent,
            easy_count=request.easy_count,
            medium_count=request.medium_count,
            hard_count=request.hard_count,
            shuffle_options=request.shuffle_options,
            max_attempts=request.max_attempts,
            cooldown_hours=request.cooldown_hours,
            current_user=user,
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
                max_attempts=matrix.max_attempts,
                cooldown_hours=matrix.cooldown_hours,
            )
        )

    async def get_quiz_matrix(
        self,
        request: pb.GetQuizMatrixRequest,
        ctx: RequestContext[pb.GetQuizMatrixRequest, pb.GetQuizMatrixResponse],
    ) -> pb.GetQuizMatrixResponse:
        user = self._verify_instructor_permission()
        item_id = request.item_id.strip() if request.item_id else ""
        if not item_id:
            raise ConnectError(
                Code.INVALID_ARGUMENT, "Mã mục học tập không được để trống"
            )

        try:
            course = await self.use_case.get_course_for_item_or_submission(
                item_id=item_id
            )
            user_ctx = CurrentUserContext(id=user.id, role=user.role, email=user.email)
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.MANAGE_CURRICULUM,
                action_name="xem ma trận đề thi",
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

        matrix = await self.use_case.get_quiz_matrix(item_id=item_id)
        if not matrix:
            raise ConnectError(
                Code.NOT_FOUND, f"Quiz Matrix for item {item_id} not found"
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
                max_attempts=matrix.max_attempts,
                cooldown_hours=matrix.cooldown_hours,
            )
        )

    async def update_question(
        self,
        request: pb.UpdateQuestionRequest,
        ctx: RequestContext[pb.UpdateQuestionRequest, pb.UpdateQuestionResponse],
    ) -> pb.UpdateQuestionResponse:
        user = self._verify_instructor_permission()
        question_id = request.question_id.strip() if request.question_id else ""
        if not question_id:
            raise ConnectError(Code.INVALID_ARGUMENT, "Mã câu hỏi không được để trống")

        try:
            course = await self.use_case.get_course_for_item_or_submission(
                question_id=question_id
            )
            user_ctx = CurrentUserContext(id=user.id, role=user.role, email=user.email)
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.MANAGE_CURRICULUM,
                action_name="cập nhật câu hỏi",
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

        options_data = [
            {"option_text": opt.option_text, "is_correct": opt.is_correct}
            for opt in request.options
        ]
        q = await self.use_case.update_question(
            question_id=question_id,
            text=request.text,
            question_type=request.question_type,
            difficulty=request.difficulty,
            explanation=request.explanation,
            options_data=options_data,
            current_user=user,
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
        user = self._verify_instructor_permission()
        question_id = request.question_id.strip() if request.question_id else ""
        if not question_id:
            raise ConnectError(Code.INVALID_ARGUMENT, "Mã câu hỏi không được để trống")

        try:
            course = await self.use_case.get_course_for_item_or_submission(
                question_id=question_id
            )
            user_ctx = CurrentUserContext(id=user.id, role=user.role, email=user.email)
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.MANAGE_CURRICULUM,
                action_name="xóa câu hỏi",
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

        success = await self.use_case.delete_question(
            question_id=question_id, current_user=user
        )
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
        try:
            res = await self.use_case.start_graded_quiz_session(
                user_id=current_user.id,
                item_id=request.item_id,
                preview=request.preview,
                force_new=request.force_new,
            )
        except ValueError as e:
            raise ConnectError(Code.FAILED_PRECONDITION, str(e))
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))

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
                    topic=q.get("topic", "Tổng quan"),
                )
            )

        pb_prev_result = None
        if res.get("has_previous_result") and res.get("previous_result"):
            pr = res["previous_result"]
            pb_prev_result = pb.QuizResult(
                score_percent=pr["score_percent"],
                passed=pr["passed"],
                attempts_left=pr["attempts_left"],
                cooldown_seconds_left=pr["cooldown_seconds_left"],
                answer_explanations=pr["answer_explanations"],
                max_attempts=pr.get("max_attempts", MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN),
                cooldown_hours=pr.get("cooldown_hours", 8),
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
            max_attempts=res.get("max_attempts", MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN),
            cooldown_hours=res.get("cooldown_hours", 8),
            has_previous_result=res.get("has_previous_result", False),
            previous_result=pb_prev_result,
        )

    async def get_quiz_attempt_history(
        self,
        request: pb.GetQuizAttemptHistoryRequest,
        ctx: RequestContext[
            pb.GetQuizAttemptHistoryRequest, pb.GetQuizAttemptHistoryResponse
        ],
    ) -> pb.GetQuizAttemptHistoryResponse:
        current_user = require_current_user()
        res = await self.use_case.get_quiz_attempt_history(
            user_id=current_user.id,
            item_id=request.item_id,
        )

        pb_attempts = [
            pb.QuizAttemptSummary(
                submission_id=att["submission_id"],
                attempt_number=att["attempt_number"],
                score_percent=att["score_percent"],
                passed=att["passed"],
                total_questions=att["total_questions"],
                correct_count=att["correct_count"],
                submitted_at=att["submitted_at"],
            )
            for att in res["attempts"]
        ]

        pb_mastery = [
            pb.TopicMastery(
                topic=tm["topic"],
                total_questions=tm["total_questions"],
                correct_questions=tm["correct_questions"],
                mastery_percent=tm["mastery_percent"],
                mastery_level=tm["mastery_level"],
                recommendation=tm["recommendation"],
            )
            for tm in res["aggregate_topic_mastery"]
        ]

        return pb.GetQuizAttemptHistoryResponse(
            attempts=pb_attempts,
            aggregate_topic_mastery=pb_mastery,
            highest_score_percent=res["highest_score_percent"],
            has_passed=res["has_passed"],
            attempts_left=res["attempts_left"],
            max_attempts=res["max_attempts"],
            cooldown_seconds_left=res["cooldown_seconds_left"],
            passing_threshold_percent=res["passing_threshold_percent"],
            time_limit_minutes=res["time_limit_minutes"],
        )

    async def get_quiz_attempt_detail(
        self,
        request: pb.GetQuizAttemptDetailRequest,
        ctx: RequestContext[
            pb.GetQuizAttemptDetailRequest, pb.GetQuizAttemptDetailResponse
        ],
    ) -> pb.GetQuizAttemptDetailResponse:
        current_user = require_current_user()
        user_role = str(getattr(current_user, "role", "")).upper()
        is_staff = user_role in ("ADMIN", "STAFF", "INSTRUCTOR")
        try:
            res = await self.use_case.get_quiz_attempt_detail(
                user_id=current_user.id,
                submission_id=request.submission_id,
                is_staff=is_staff,
            )
        except ValueError as e:
            raise ConnectError(Code.NOT_FOUND, str(e))
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))

        pb_answers = [
            pb.QuizAttemptAnswerDetail(
                question_id=ans["question_id"],
                question_text=ans["question_text"],
                question_type=ans["question_type"],
                topic=ans["topic"],
                options=ans["options"],
                selected_option_indices=ans["selected_option_indices"],
                correct_option_indices=ans["correct_option_indices"],
                is_correct=ans["is_correct"],
                explanation=ans["explanation"],
                order_index=ans["order_index"],
                is_answer_masked=ans["is_answer_masked"],
            )
            for ans in res["answers"]
        ]

        pb_mastery = [
            pb.TopicMastery(
                topic=tm["topic"],
                total_questions=tm["total_questions"],
                correct_questions=tm["correct_questions"],
                mastery_percent=tm["mastery_percent"],
                mastery_level=tm["mastery_level"],
                recommendation=tm["recommendation"],
            )
            for tm in res["topic_mastery"]
        ]

        return pb.GetQuizAttemptDetailResponse(
            submission_id=res["submission_id"],
            item_id=res["item_id"],
            attempt_number=res["attempt_number"],
            score_percent=res["score_percent"],
            passed=res["passed"],
            submitted_at=res["submitted_at"],
            answers=pb_answers,
            topic_mastery=pb_mastery,
            is_answer_masked=res["is_answer_masked"],
        )

    def _to_pb_queue_status(self, status_str: str) -> pb.GradingQueueStatus:
        mapping = {
            "ALL": pb.GradingQueueStatus.ALL,
            "PENDING": pb.GradingQueueStatus.PENDING,
            "CLAIMED": pb.GradingQueueStatus.CLAIMED,
            "APPEALED": pb.GradingQueueStatus.APPEALED,
            "GRADED": pb.GradingQueueStatus.GRADED,
        }
        return mapping.get(status_str.upper(), pb.GradingQueueStatus.UNSPECIFIED)

    def _to_pb_provenance(self, prov_str: str | None) -> pb.GradingProvenance:
        if not prov_str:
            return pb.GradingProvenance.UNSPECIFIED
        mapping = {
            "AUTO": pb.GradingProvenance.AUTO,
            "PEER": pb.GradingProvenance.PEER,
            "PEER_REVIEW": pb.GradingProvenance.PEER,
            "TA": pb.GradingProvenance.TA,
            "TA_OVERRIDE": pb.GradingProvenance.TA,
            "INSTRUCTOR": pb.GradingProvenance.INSTRUCTOR,
        }
        return mapping.get(prov_str.upper(), pb.GradingProvenance.UNSPECIFIED)

    async def list_grading_queue(
        self,
        request: pb.ListGradingQueueRequest,
        ctx: RequestContext[pb.ListGradingQueueRequest, pb.ListGradingQueueResponse],
    ) -> pb.ListGradingQueueResponse:
        current_user = require_current_user()
        if not request.course_id or not request.course_id.strip():
            raise ConnectError(
                Code.INVALID_ARGUMENT,
                "course_id là bắt buộc để giới hạn phạm vi chấm bài theo đúng khóa học.",
            )
        try:
            course = await self.use_case.get_course_for_item_or_submission(
                course_id=request.course_id.strip(), item_id=request.item_id
            )
            user_ctx = CurrentUserContext(
                id=current_user.id, role=current_user.role, email=current_user.email
            )
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.GRADE_ASSESSMENTS,
                action_name="xem danh sách bài chấm",
            )

            res = await self.use_case.list_grading_queue(
                course_id=course.id,
                item_id=request.item_id,
                status_filter=str(request.status),
                search_query=request.search_query,
                page_size=request.page_size or 50,
                page_token=request.page_token,
                current_user=current_user,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

        items = [
            pb.GradingQueueItem(
                submission_id=i["submission_id"],
                item_id=i["item_id"],
                item_title=i["item_title"],
                course_id=i["course_id"],
                course_title=i["course_title"],
                student_id=i["student_id"],
                student_name=i["student_name"],
                student_avatar_url=i["student_avatar_url"],
                submitted_at=i["submitted_at"],
                is_outlier=i["is_outlier"],
                is_appeal=i["is_appeal"],
                appeal_reason=i["appeal_reason"],
                locked_by_user_id=i["locked_by_user_id"],
                locked_by_name=i["locked_by_name"],
                lock_expires_at=i["lock_expires_at"],
                grade_source=self._to_pb_provenance(i.get("grade_source")),
                staff_score=float(i["staff_score"]),
                status=self._to_pb_queue_status(i["status"]),
                peer_score=float(i["peer_score"]),
                peer_reviews_count=i["peer_reviews_count"],
            )
            for i in res["items"]
        ]

        return pb.ListGradingQueueResponse(
            items=items,
            next_page_token=res["next_page_token"],
            total_count=res["total_count"],
            pending_count=res["pending_count"],
            claimed_count=res["claimed_count"],
            appealed_count=res["appealed_count"],
            graded_count=res["graded_count"],
        )

    async def claim_grading_task(
        self,
        request: pb.ClaimGradingTaskRequest,
        ctx: RequestContext[pb.ClaimGradingTaskRequest, pb.ClaimGradingTaskResponse],
    ) -> pb.ClaimGradingTaskResponse:
        current_user = require_current_user()
        try:
            course = await self.use_case.get_course_for_item_or_submission(
                submission_id=request.submission_id
            )
            user_ctx = CurrentUserContext(
                id=current_user.id, role=current_user.role, email=current_user.email
            )
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.GRADE_ASSESSMENTS,
                action_name="nhận bài chấm",
            )
            success, msg, info = await self.use_case.claim_grading_task(
                submission_id=request.submission_id,
                staff_user_id=current_user.id,
                current_user=current_user,
            )
            if not success:
                raise ConnectError(Code.FAILED_PRECONDITION, msg)
            return pb.ClaimGradingTaskResponse(
                success=True,
                message=msg,
                locked_by_user_id=info.get("locked_by_user_id", current_user.id),
                locked_by_name=current_user.full_name or current_user.id,
                lock_expires_at=info.get("lock_expires_at", ""),
                lease_duration_seconds=info.get("lease_duration_seconds", 1800),
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.NOT_FOUND, str(e)) from e

    async def renew_grading_task_lock(
        self,
        request: pb.RenewGradingTaskLockRequest,
        ctx: RequestContext[
            pb.RenewGradingTaskLockRequest, pb.RenewGradingTaskLockResponse
        ],
    ) -> pb.RenewGradingTaskLockResponse:
        current_user = require_current_user()
        try:
            course = await self.use_case.get_course_for_item_or_submission(
                submission_id=request.submission_id
            )
            user_ctx = CurrentUserContext(
                id=current_user.id, role=current_user.role, email=current_user.email
            )
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.GRADE_ASSESSMENTS,
                action_name="gia hạn khóa bài chấm",
            )
            success, msg, info = await self.use_case.renew_grading_task_lock(
                submission_id=request.submission_id,
                staff_user_id=current_user.id,
                extend_minutes=request.extend_minutes or 30,
                current_user=current_user,
            )
            if not success:
                raise ConnectError(Code.FAILED_PRECONDITION, msg)
            return pb.RenewGradingTaskLockResponse(
                success=True,
                message=msg,
                lock_expires_at=info.get("lock_expires_at", ""),
                remaining_seconds=info.get("remaining_seconds", 1800),
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.NOT_FOUND, str(e)) from e

    async def release_grading_task(
        self,
        request: pb.ReleaseGradingTaskRequest,
        ctx: RequestContext[
            pb.ReleaseGradingTaskRequest, pb.ReleaseGradingTaskResponse
        ],
    ) -> pb.ReleaseGradingTaskResponse:
        current_user = require_current_user()
        try:
            course = await self.use_case.get_course_for_item_or_submission(
                submission_id=request.submission_id
            )
            user_ctx = CurrentUserContext(
                id=current_user.id, role=current_user.role, email=current_user.email
            )
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.GRADE_ASSESSMENTS,
                action_name="giải phóng khóa bài chấm",
            )
            success, msg = await self.use_case.release_grading_task(
                submission_id=request.submission_id,
                staff_user_id=current_user.id,
                current_user=current_user,
            )
            if not success:
                raise ConnectError(Code.FAILED_PRECONDITION, msg)
            return pb.ReleaseGradingTaskResponse(success=True, message=msg)
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.NOT_FOUND, str(e)) from e

    async def get_grading_submission_detail(
        self,
        request: pb.GetGradingSubmissionDetailRequest,
        ctx: RequestContext[
            pb.GetGradingSubmissionDetailRequest,
            pb.GetGradingSubmissionDetailResponse,
        ],
    ) -> pb.GetGradingSubmissionDetailResponse:
        current_user = require_current_user()
        try:
            course = await self.use_case.get_course_for_item_or_submission(
                submission_id=request.submission_id
            )
            user_ctx = CurrentUserContext(
                id=current_user.id, role=current_user.role, email=current_user.email
            )
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.GRADE_ASSESSMENTS,
                action_name="xem chi tiết bài chấm",
            )
            res = await self.use_case.get_grading_submission_detail(
                submission_id=request.submission_id,
                current_user=current_user,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.NOT_FOUND, str(e)) from e

        sub_dict = res["submission"]
        sub_pb = pb.GradingQueueItem(
            submission_id=sub_dict["submission_id"],
            item_id=sub_dict["item_id"],
            item_title=sub_dict["item_title"],
            course_id=sub_dict["course_id"],
            course_title=sub_dict["course_title"],
            student_id=sub_dict["student_id"],
            student_name=sub_dict["student_name"],
            student_avatar_url=sub_dict["student_avatar_url"],
            submitted_at=sub_dict["submitted_at"],
            is_outlier=sub_dict["is_outlier"],
            is_appeal=sub_dict["is_appeal"],
            appeal_reason=sub_dict["appeal_reason"],
            locked_by_user_id=sub_dict["locked_by_user_id"],
            locked_by_name=sub_dict["locked_by_name"],
            lock_expires_at=sub_dict["lock_expires_at"],
            grade_source=self._to_pb_provenance(sub_dict.get("grade_source")),
            staff_score=float(sub_dict["staff_score"]),
            status=self._to_pb_queue_status(sub_dict["status"]),
            peer_score=float(sub_dict["peer_score"]),
            peer_reviews_count=sub_dict["peer_reviews_count"],
        )

        rubric_pbs = [
            pb.RubricCriteria(
                criteria_id=c.criteria_id,
                title=c.title,
                max_score=c.max_score,
                score_given=c.score_given,
            )
            for c in res["rubric_criteria"]
        ]

        peer_review_pbs = [
            pb.PeerReviewHistoryItem(
                review_id=r["review_id"],
                reviewer_id=r["reviewer_id"],
                reviewer_name=r["reviewer_name"],
                reviewer_avatar_url=r.get("reviewer_avatar_url", ""),
                total_score=float(r["total_score"]),
                graded_criteria=[
                    pb.RubricCriteria(
                        criteria_id=c.criteria_id,
                        title=c.title,
                        max_score=c.max_score,
                        score_given=c.score_given,
                    )
                    for c in r.get("graded_criteria", [])
                ],
                feedback=r["feedback"],
                reviewed_at=r["reviewed_at"],
            )
            for r in res["peer_reviews"]
        ]

        staff_grading_pbs = [
            pb.StaffGradingDetail(
                staff_id=sg["staff_id"],
                staff_name=sg["staff_name"],
                staff_avatar_url=sg.get("staff_avatar_url", ""),
                score=float(sg["score"]),
                graded_criteria=[
                    pb.RubricCriteria(
                        criteria_id=c.criteria_id,
                        title=c.title,
                        max_score=c.max_score,
                        score_given=c.score_given,
                    )
                    for c in sg.get("graded_criteria", [])
                ],
                feedback=sg["feedback"],
                graded_at=sg["graded_at"],
                provenance=self._to_pb_provenance(sg.get("provenance")),
                appeal_resolution_notes=sg.get("appeal_resolution_notes", ""),
            )
            for sg in res.get("staff_gradings", [])
        ]

        staff_grading_pb = None
        if res.get("current_staff_grading"):
            sg = res["current_staff_grading"]
            staff_grading_pb = pb.StaffGradingDetail(
                staff_id=sg["staff_id"],
                staff_name=sg["staff_name"],
                staff_avatar_url=sg.get("staff_avatar_url", ""),
                score=float(sg["score"]),
                graded_criteria=[
                    pb.RubricCriteria(
                        criteria_id=c.criteria_id,
                        title=c.title,
                        max_score=c.max_score,
                        score_given=c.score_given,
                    )
                    for c in sg.get("graded_criteria", [])
                ],
                feedback=sg["feedback"],
                graded_at=sg["graded_at"],
                provenance=self._to_pb_provenance(sg.get("provenance")),
                appeal_resolution_notes=sg.get("appeal_resolution_notes", ""),
            )
        elif staff_grading_pbs:
            staff_grading_pb = staff_grading_pbs[-1]

        return pb.GetGradingSubmissionDetailResponse(
            submission=sub_pb,
            submission_url=res["submission_url"],
            text_content=res["text_content"],
            attempt_number=res["attempt_number"],
            rubric_criteria=rubric_pbs,
            peer_reviews=peer_review_pbs,
            current_staff_grading=staff_grading_pb,
            staff_gradings=staff_grading_pbs,
            assignment_prompt=res.get("assignment_prompt", ""),
        )

    async def submit_staff_grading(
        self,
        request: pb.SubmitStaffGradingRequest,
        ctx: RequestContext[
            pb.SubmitStaffGradingRequest, pb.SubmitStaffGradingResponse
        ],
    ) -> pb.SubmitStaffGradingResponse:
        current_user = require_current_user()
        try:
            course = await self.use_case.get_course_for_item_or_submission(
                submission_id=request.submission_id
            )
            user_ctx = CurrentUserContext(
                id=current_user.id, role=current_user.role, email=current_user.email
            )
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.GRADE_ASSESSMENTS,
                action_name="chấm điểm bài tập",
            )

            criteria_list = [
                RubricCriteria(
                    criteria_id=c.criteria_id,
                    title=c.title,
                    max_score=c.max_score,
                    score_given=c.score_given,
                    description=getattr(c, "description", ""),
                )
                for c in request.graded_criteria
            ]
            owner_id = getattr(course, "owner_id", "")
            co_instructors = getattr(course, "co_instructor_ids", []) or []
            ta_ids = getattr(course, "ta_ids", []) or []

            is_owner = current_user.id == owner_id
            is_co_instructor = current_user.id in co_instructors
            is_ta = current_user.id in ta_ids

            if is_owner or is_co_instructor:
                provenance_str = "INSTRUCTOR"
            elif is_ta:
                provenance_str = "TA"
            elif current_user.is_instructor or current_user.is_admin:
                provenance_str = "INSTRUCTOR"
            else:
                provenance_str = "TA"

            if criteria_list:
                max_possible = sum(c.max_score for c in criteria_list)
                total_given = sum(c.score_given for c in criteria_list)
                expected_score = (
                    round((total_given / max_possible) * 100.0, 2)
                    if max_possible > 0
                    else 0.0
                )
                if request.total_score > 0:
                    is_raw_sum = abs(request.total_score - total_given) <= 0.05
                    is_normalized = abs(request.total_score - expected_score) <= 0.05
                    if not (is_raw_sum or is_normalized):
                        raise ConnectError(
                            Code.INVALID_ARGUMENT,
                            f"Tổng điểm ({request.total_score}) không nhất quán với tổng điểm các tiêu chí ({expected_score}%).",
                        )
                total_score = expected_score
            else:
                total_score = request.total_score
            (
                success,
                msg,
                final_score,
                graded_at,
            ) = await self.use_case.submit_staff_grading(
                submission_id=request.submission_id,
                staff_user_id=current_user.id,
                graded_criteria=criteria_list,
                total_score=float(total_score),
                feedback=request.feedback,
                resolve_appeal=request.resolve_appeal,
                appeal_resolution_notes=request.appeal_resolution_notes,
                provenance=provenance_str,
                current_user=current_user,
            )
            return pb.SubmitStaffGradingResponse(
                success=success,
                message=msg,
                final_score=float(final_score),
                graded_at=graded_at,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

    async def list_admin_assessment_alerts(
        self,
        request: pb.ListAdminAssessmentAlertsRequest,
        ctx: RequestContext[
            pb.ListAdminAssessmentAlertsRequest,
            pb.ListAdminAssessmentAlertsResponse,
        ],
    ) -> pb.ListAdminAssessmentAlertsResponse:
        current_user = require_current_user()
        try:
            page = await self.use_case.list_admin_assessment_alerts(current_user)
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e

        kind_map = {
            AdminAssessmentAlertKind.GRADE_APPEAL: pb.AdminAssessmentAlertKind.GRADE_APPEAL,
            AdminAssessmentAlertKind.REPORTED_PEER_REVIEW: pb.AdminAssessmentAlertKind.REPORTED_PEER_REVIEW,
            AdminAssessmentAlertKind.OUTLIER_PEER_REVIEW: pb.AdminAssessmentAlertKind.OUTLIER_PEER_REVIEW,
        }
        return pb.ListAdminAssessmentAlertsResponse(
            alerts=[
                pb.AdminAssessmentAlert(
                    alert_id=a.alert_id,
                    kind=kind_map.get(a.kind, pb.AdminAssessmentAlertKind.UNSPECIFIED),
                    submission_id=a.submission_id,
                    user_id=a.user_id,
                    user_name=a.user_name,
                    reason=a.reason,
                    total_score=a.total_score,
                    created_at=a.created_at,
                )
                for a in page.alerts
            ],
            total_count=page.total_count,
        )
