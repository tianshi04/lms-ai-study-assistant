"""Seed data for Learning Progress, Deadlines, Notes, and Assessments (Quizzes, Question Banks, Labs, Peer Reviews)."""

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.assessment.infrastructure.models import (
    GradeAppealModel,
    HonorCodeModel,
    LabSubmissionModel,
    PeerAssignmentSubmissionModel,
    PeerReviewModel,
    QuestionBankModel,
    QuestionModel,
    QuestionOptionModel,
    QuizMatrixModel,
    QuizSubmissionModel,
)
from src.modules.learning.domain import DeadlineStatus
from src.modules.learning.infrastructure.models import (
    LearningProgressModel,
    PersonalNoteModel,
    WeeklyDeadlineModel,
)


async def _seed_question_with_options(
    session: AsyncSession,
    question: QuestionModel,
    options: list[tuple[str, str, bool]],
) -> None:
    """Helper to upsert a QuestionModel and its ordered QuestionOptionModels."""
    await session.merge(question)
    for idx, (opt_id, opt_text, is_correct) in enumerate(options):
        await session.merge(
            QuestionOptionModel(
                id=opt_id,
                question_id=question.id,
                option_text=opt_text,
                is_correct=is_correct,
                order_index=idx,
            )
        )


async def seed_learning_and_assessments(session: AsyncSession) -> None:
    """Seed learning progress, deadlines, personal notes, submissions, question banks, and quiz matrices."""
    progresses = [
        LearningProgressModel(
            id="user_learner_demo:course-python-ai",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            overall_progress_percent=71.4,
            completed_item_ids=[
                "item-ml-intro-video",
                "item-ml-reading-1",
                "item-ml-quiz-1",
                "item-ml-lab-1",
                "item-ml-peer-1",
            ],
        ),
        LearningProgressModel(
            id="user_learner_demo:course-web-dev",
            user_id="user_learner_demo",
            course_id="course-web-dev",
            overall_progress_percent=50.0,
            completed_item_ids=["item-web-video-1", "item-web-reading-1"],
        ),
        LearningProgressModel(
            id="user_learner_demo:course-deep-learning",
            user_id="user_learner_demo",
            course_id="course-deep-learning",
            overall_progress_percent=33.3,
            completed_item_ids=["item-dl-video-1"],
        ),
    ]
    for prog in progresses:
        await session.merge(prog)

    deadlines = [
        WeeklyDeadlineModel(
            id=1,
            progress_id="user_learner_demo:course-python-ai",
            week_number=1,
            due_date="2026-07-20T23:59:59Z",
            status=DeadlineStatus.COMPLETED,
        ),
        WeeklyDeadlineModel(
            id=2,
            progress_id="user_learner_demo:course-python-ai",
            week_number=2,
            due_date="2026-07-27T23:59:59Z",
            status=DeadlineStatus.ON_TRACK,
        ),
    ]
    for dl in deadlines:
        await session.merge(dl)

    notes = [
        PersonalNoteModel(
            id="note-demo-01",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            item_id="item-ml-intro-video",
            highlighted_text="Mean Squared Error (MSE)",
            note_comment="Formula: J(w,b) = (1/2m) * sum((h(x) - y)^2). Standard loss function for regression.",
            created_at="2026-07-22T09:15:00Z",
        ),
        PersonalNoteModel(
            id="note-demo-02",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            item_id="item-ml-reading-1",
            highlighted_text="Learning Rate (alpha)",
            note_comment="If alpha is too large, gradient descent may fail to converge or even diverge.",
            created_at="2026-07-22T09:40:00Z",
        ),
    ]
    for note in notes:
        await session.merge(note)

    # Assessment Submissions & Appeals
    await session.merge(
        HonorCodeModel(
            id="user_learner_demo:item-ml-quiz-1",
            user_id="user_learner_demo",
            item_id="item-ml-quiz-1",
            is_agreed=True,
            agreed_at="2026-07-22T09:00:00Z",
        )
    )
    await session.merge(
        QuizSubmissionModel(
            id="quiz_sub_demo_01",
            user_id="user_learner_demo",
            item_id="item-ml-quiz-1",
            selected_option_indexes=[1, 0, 2],
            score_percent=100.0,
            passed=True,
            attempt_number=1,
            created_at="2026-07-22T09:30:00Z",
        )
    )
    await session.merge(
        LabSubmissionModel(
            id="lab_sub_demo_01",
            user_id="user_learner_demo",
            item_id="item-ml-lab-1",
            source_code="def array_sum(arr):\n    return sum(arr)",
            language="python",
            score_percent=100.0,
            passed=True,
            total_test_cases=3,
            passed_test_cases=3,
            test_logs="[PASS] Test 1: Array sum positive integers\n[PASS] Test 2: Empty array\n[PASS] Test 3: Array sum with negative values",
            created_at="2026-07-22T10:00:00Z",
        )
    )
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_demo_01",
            user_id="user_learner_demo",
            item_id="item-ml-peer-1",
            submission_url="https://github.com/learner-demo/housing-price-regression",
            text_content="Supervised ML model architecture design for housing price prediction.",
            created_at="2026-07-22T10:30:00Z",
        )
    )

    peer_reviews = [
        PeerReviewModel(
            id="peer_rev_01",
            submission_id="peer_sub_demo_01",
            reviewer_user_id="user_learner_02",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "problem_formulation": 5,
                "feature_selection": 5,
                "model_evaluation": 4,
            },
            total_score=93.3,
            is_outlier=False,
            created_at="2026-07-22T11:00:00Z",
        ),
        PeerReviewModel(
            id="peer_rev_02",
            submission_id="peer_sub_demo_01",
            reviewer_user_id="user_ta_01",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "problem_formulation": 5,
                "feature_selection": 5,
                "model_evaluation": 5,
            },
            total_score=100.0,
            is_outlier=False,
            created_at="2026-07-22T11:20:00Z",
        ),
    ]
    for rev in peer_reviews:
        await session.merge(rev)

    await session.merge(
        GradeAppealModel(
            id="appeal_demo_01",
            user_id="user_learner_03",
            submission_id="peer_sub_demo_01",
            appeal_reason="The reviewer marked point deduction for missing documentation, but inline comments were included in code blocks.",
            status="PENDING",
            created_at="2026-07-22T14:00:00Z",
        )
    )

    # 1. Question Bank & Quiz Matrices for Course 1 (ML)
    await session.merge(
        QuestionBankModel(
            id="qb-ml-01",
            course_id="course-python-ai",
            title="Ngân hàng câu hỏi Máy học cơ bản (ML Fundamentals)",
            category="PRACTICE",
            description="Tập hợp câu hỏi trắc nghiệm lý thuyết và bài tập Máy học cơ bản.",
            created_at="2026-07-25T12:00:00Z",
        )
    )

    ml_questions = [
        (
            QuestionModel(
                id="q-ml-01",
                bank_id="qb-ml-01",
                question_type="SINGLE_CHOICE",
                difficulty="EASY",
                text="Thuật toán nào dưới đây thuộc nhóm Học có giám sát (Supervised Learning)?",
                explanation="Hồi quy tuyến tính (Linear Regression) yêu cầu nhãn dữ liệu đầu ra (Target label) để huấn luyện.",
                created_at="2026-07-25T12:05:00Z",
            ),
            [
                ("opt-q1-1", "Hồi quy tuyến tính (Linear Regression)", True),
                ("opt-q1-2", "Phân cụm K-Means", False),
                ("opt-q1-3", "Phân tích thành phần chính (PCA)", False),
                ("opt-q1-4", "Thuật toán DBSCAN", False),
            ],
        ),
        (
            QuestionModel(
                id="q-ml-02",
                bank_id="qb-ml-01",
                question_type="SINGLE_CHOICE",
                difficulty="EASY",
                text="Hàm mất mát phổ biến nhất được dùng cho bài toán Hồi quy tuyến tính là gì?",
                explanation="Mean Squared Error (MSE - Sai số bình phương trung bình) đo lường khoảng cách giữa dự đoán và thực tế.",
                created_at="2026-07-25T12:10:00Z",
            ),
            [
                ("opt-q2-1", "Mean Squared Error (MSE)", True),
                ("opt-q2-2", "Cross-Entropy Loss", False),
                ("opt-q2-3", "Hinge Loss", False),
                ("opt-q2-4", "Binary Cross-Entropy", False),
            ],
        ),
        (
            QuestionModel(
                id="q-ml-03",
                bank_id="qb-ml-01",
                question_type="SINGLE_CHOICE",
                difficulty="MEDIUM",
                text="Phương pháp nào được dùng để tránh hiện tượng Overfitting trong mô hình Deep Learning?",
                explanation="Dropout và L2 Regularization giúp giảm bớt sự phụ thuộc quá mức vào các trọng số cụ thể.",
                created_at="2026-07-25T12:15:00Z",
            ),
            [
                ("opt-q3-1", "Kỹ thuật Dropout & L2 Regularization", True),
                ("opt-q3-2", "Tăng tốc độ học (Learning Rate) quá lớn", False),
                ("opt-q3-3", "Xóa tập dữ liệu Validation", False),
                ("opt-q3-4", "Bỏ qua hàm kích hoạt (Activation Function)", False),
            ],
        ),
        (
            QuestionModel(
                id="q-ml-04",
                bank_id="qb-ml-01",
                question_type="SINGLE_CHOICE",
                difficulty="MEDIUM",
                text="Mạng Nơ-ron Nhân tạo (ANN) sử dụng thuật toán nào để cập nhật trọng số theo độ dốc đạo hàm?",
                explanation="Backpropagation (Lan truyền ngược) tính toán gradient của hàm mất mát theo từng trọng số trong mạng.",
                created_at="2026-07-25T12:20:00Z",
            ),
            [
                ("opt-q4-1", "Backpropagation (Lan truyền ngược)", True),
                ("opt-q4-2", "Forward Propagation", False),
                ("opt-q4-3", "K-Fold Cross Validation", False),
                ("opt-q4-4", "Principal Component Analysis", False),
            ],
        ),
        (
            QuestionModel(
                id="q-ml-05",
                bank_id="qb-ml-01",
                question_type="SINGLE_CHOICE",
                difficulty="HARD",
                text="Đánh giá hiệu năng mô hình Phân loại (Classification) với dữ liệu mất cân bằng (Imbalanced Data) nên ưu tiên chỉ số nào?",
                explanation="F1-Score (dung hòa Precision & Recall) và AUC-ROC đánh giá chính xác hơn chỉ số Accuracy khi dữ liệu lệch nặng.",
                created_at="2026-07-25T12:25:00Z",
            ),
            [
                ("opt-q5-1", "F1-Score & AUC-ROC", True),
                ("opt-q5-2", "Accuracy (Tỷ lệ chính xác tổng thể)", False),
                ("opt-q5-3", "Hệ số R-Squared", False),
                ("opt-q5-4", "Mean Absolute Error (MAE)", False),
            ],
        ),
    ]
    for q, opts in ml_questions:
        await _seed_question_with_options(session, q, opts)

    for qm in (
        QuizMatrixModel(
            item_id="item-ml-quiz-1",
            bank_id="qb-ml-01",
            time_limit_minutes=30,
            passing_threshold_percent=80.0,
            easy_count=2,
            medium_count=2,
            hard_count=1,
            shuffle_options=True,
        ),
        QuizMatrixModel(
            item_id="item-ml-practice-1",
            bank_id="qb-ml-01",
            time_limit_minutes=15,
            passing_threshold_percent=60.0,
            easy_count=2,
            medium_count=1,
            hard_count=0,
            shuffle_options=True,
        ),
        QuizMatrixModel(
            item_id="item-ml-quiz-2",
            bank_id="qb-ml-01",
            time_limit_minutes=45,
            passing_threshold_percent=80.0,
            easy_count=2,
            medium_count=2,
            hard_count=1,
            shuffle_options=True,
        ),
    ):
        await session.merge(qm)

    # 2. Question Bank & Quiz Matrix for Course 2 (Web Dev)
    await session.merge(
        QuestionBankModel(
            id="qb-web-01",
            course_id="course-web-dev",
            title="Ngân hàng câu hỏi Lập trình Web Fullstack Next.js & ConnectRPC",
            category="GRADED",
            description="Tập hợp câu hỏi trắc nghiệm kiến trúc Next.js App Router, RSC, Tailwind v4 và ConnectRPC.",
            created_at="2026-07-25T13:00:00Z",
        )
    )

    web_questions = [
        (
            QuestionModel(
                id="q-web-01",
                bank_id="qb-web-01",
                question_type="SINGLE_CHOICE",
                difficulty="EASY",
                text="Ưu điểm vượt trội nhất của React Server Components (RSC) trong Next.js là gì?",
                explanation="RSC render trực tiếp trên máy chủ và không gửi mã JavaScript bundle thừa về trình duyệt của người dùng.",
                created_at="2026-07-25T13:05:00Z",
            ),
            [
                (
                    "opt-qw1-1",
                    "Giảm kích thước JavaScript bundle gửi xuống client về 0",
                    True,
                ),
                ("opt-qw1-2", "Bắt buộc mọi component phải dùng useState", False),
                ("opt-qw1-3", "Chỉ chạy được trên trình duyệt Chrome", False),
                ("opt-qw1-4", "Thay thế hoàn toàn cơ sở dữ liệu SQL", False),
            ],
        ),
        (
            QuestionModel(
                id="q-web-02",
                bank_id="qb-web-01",
                question_type="SINGLE_CHOICE",
                difficulty="EASY",
                text="Giao thức ConnectRPC sử dụng định dạng schema nào để đảm bảo type-safety hai đầu Frontend - Backend?",
                explanation="ConnectRPC dùng Protocol Buffers (.proto) để tự động sinh ra client stubs type-safe cho TypeScript và Python.",
                created_at="2026-07-25T13:10:00Z",
            ),
            [
                ("opt-qw2-1", "Protocol Buffers (Protobuf v3)", True),
                ("opt-qw2-2", "XML DTD Schema", False),
                ("opt-qw2-3", "Raw CSV Tables", False),
                ("opt-qw2-4", "HTML5 Web Forms", False),
            ],
        ),
        (
            QuestionModel(
                id="q-web-03",
                bank_id="qb-web-01",
                question_type="SINGLE_CHOICE",
                difficulty="MEDIUM",
                text="Trong Domain-Driven Design (DDD), tầng nào trực tiếp chứa nghiệp vụ cốt lõi không phụ thuộc framework?",
                explanation="Tầng Domain Entity chứa các quy tắc nghiệp vụ bất biến, độc lập hoàn toàn với framework và database.",
                created_at="2026-07-25T13:15:00Z",
            ),
            [
                ("opt-qw3-1", "Domain Layer (Thực thể & Luật nghiệp vụ cốt lõi)", True),
                ("opt-qw3-2", "Infrastructure Layer (SQL queries)", False),
                ("opt-qw3-3", "Presentation Layer (React components)", False),
                ("opt-qw3-4", "Docker Compose config", False),
            ],
        ),
        (
            QuestionModel(
                id="q-web-04",
                bank_id="qb-web-01",
                question_type="SINGLE_CHOICE",
                difficulty="MEDIUM",
                text="Lợi ích chính của việc sử dụng TanStack Query (React Query) trong ứng dụng Single Page là gì?",
                explanation="React Query tự động quản lý bộ nhớ đệm, deduplication requests và đồng bộ trạng thái ngầm khi tab active.",
                created_at="2026-07-25T13:20:00Z",
            ),
            [
                (
                    "opt-qw4-1",
                    "Tự động quản lý Cache, Refetch ngầm và Optimistic UI",
                    True,
                ),
                ("opt-qw4-2", "Biên dịch mã nguồn sang WebAssembly", False),
                ("opt-qw4-3", "Tự động mã hóa HTTPS cho server", False),
                ("opt-qw4-4", "Thay thế hoàn toàn Tailwind CSS", False),
            ],
        ),
        (
            QuestionModel(
                id="q-web-05",
                bank_id="qb-web-01",
                question_type="SINGLE_CHOICE",
                difficulty="HARD",
                text="Khi giải mã JWT Token trên Edge Runtime (Next.js Middleware), phương pháp nào an toàn và không gây lỗi crash?",
                explanation="Edge Runtime không hỗ trợ thư viện Node.js Buffer, bắt buộc phải dùng Web Standard atob + TextDecoder.",
                created_at="2026-07-25T13:25:00Z",
            ),
            [
                ("opt-qw5-1", "Sử dụng Web Standard atob và TextDecoder UTF-8", True),
                ("opt-qw5-2", "Import thư viện Node.js Buffer.from", False),
                ("opt-qw5-3", "Lưu private key trực tiếp vào LocalStorage", False),
                ("opt-qw5-4", "Tắt hoàn toàn cơ chế xác thực JWT", False),
            ],
        ),
    ]
    for q, opts in web_questions:
        await _seed_question_with_options(session, q, opts)

    await session.merge(
        QuizMatrixModel(
            item_id="item-web-quiz-1",
            bank_id="qb-web-01",
            time_limit_minutes=25,
            passing_threshold_percent=80.0,
            easy_count=2,
            medium_count=2,
            hard_count=1,
            shuffle_options=True,
        )
    )

    # 3. Question Bank & Quiz Matrix for Course 3 (Deep Learning)
    await session.merge(
        QuestionBankModel(
            id="qb-dl-01",
            course_id="course-deep-learning",
            title="Ngân hàng câu hỏi Deep Learning & Mạng Nơ-ron Sâu",
            category="GRADED",
            description="Tập hợp câu hỏi trắc nghiệm kiến thức Vectorization, He Initialization, Vanishing Gradient và Backpropagation.",
            created_at="2026-07-25T14:00:00Z",
        )
    )

    dl_questions = [
        (
            QuestionModel(
                id="q-dl-01",
                bank_id="qb-dl-01",
                question_type="SINGLE_CHOICE",
                difficulty="EASY",
                text="Hàm kích hoạt nào được ưu tiên hàng đầu để khắc phục hiện tượng Triệt tiêu Đạo hàm (Vanishing Gradient) trong Deep Learning?",
                explanation="ReLU (Rectified Linear Unit) có đạo hàm bằng 1 khi x > 0, giúp dòng đạo hàm truyền nguyên vẹn qua hàng chục tầng ẩn.",
                created_at="2026-07-25T14:05:00Z",
            ),
            [
                ("opt-qd1-1", "ReLU (Rectified Linear Unit)", True),
                ("opt-qd1-2", "Sigmoid", False),
                ("opt-qd1-3", "Tanh", False),
                ("opt-qd1-4", "Step Function", False),
            ],
        ),
        (
            QuestionModel(
                id="q-dl-02",
                bank_id="qb-dl-01",
                question_type="SINGLE_CHOICE",
                difficulty="EASY",
                text="Lợi ích cốt lõi của kỹ thuật Vectorization trong lập trình Deep Learning là gì?",
                explanation="Vectorization tận dụng các tập lệnh song song SIMD trên CPU/GPU để tính toán ma trận nhanh hơn hàng trăm lần so với vòng lặp.",
                created_at="2026-07-25T14:10:00Z",
            ),
            [
                (
                    "opt-qd2-1",
                    "Tận dụng tính toán song song phần cứng (SIMD/GPU) với tốc độ vượt trội",
                    True,
                ),
                ("opt-qd2-2", "Tự động sửa lỗi cú pháp Python", False),
                ("opt-qd2-3", "Giảm độ sâu của mạng nơ-ron về 1 tầng", False),
                ("opt-qd2-4", "Không cần dữ liệu đầu vào", False),
            ],
        ),
        (
            QuestionModel(
                id="q-dl-03",
                bank_id="qb-dl-01",
                question_type="SINGLE_CHOICE",
                difficulty="MEDIUM",
                text="Khi sử dụng hàm kích hoạt ReLU, kỹ thuật khởi tạo trọng số nào được khuyến nghị tốt nhất?",
                explanation="He Initialization (khởi tạo He/Kaiming) với phương sai 2/n_in được thiết kế đặc thù cho các tầng phi tuyến ReLU.",
                created_at="2026-07-25T14:15:00Z",
            ),
            [
                ("opt-qd3-1", "He Initialization (Kaiming Init)", True),
                ("opt-qd3-1a", "Khởi tạo tất cả trọng số bằng 0", False),
                ("opt-qd3-2", "Khởi tạo tất cả trọng số bằng 1", False),
                ("opt-qd3-3", "Random Uniform trong khoảng [-1000, 1000]", False),
            ],
        ),
        (
            QuestionModel(
                id="q-dl-04",
                bank_id="qb-dl-01",
                question_type="SINGLE_CHOICE",
                difficulty="MEDIUM",
                text="Quy tắc toán học nền tảng nào được áp dụng để tính toán Lan truyền ngược (Backpropagation)?",
                explanation="Quy tắc chuỗi (Chain Rule) trong giải tích nhiều biến cho phép tính đạo hàm riêng của hàm mất mát qua từng tầng liên tiếp.",
                created_at="2026-07-25T14:20:00Z",
            ),
            [
                (
                    "opt-qd4-1",
                    "Quy tắc chuỗi trong giải tích đạo hàm (Chain Rule)",
                    True,
                ),
                ("opt-qd4-2", "Định lý Pythagoras", False),
                ("opt-qd4-3", "Quy tắc L'Hopital", False),
                ("opt-qd4-4", "Công thức nhị thức Newton", False),
            ],
        ),
        (
            QuestionModel(
                id="q-dl-05",
                bank_id="qb-dl-01",
                question_type="SINGLE_CHOICE",
                difficulty="HARD",
                text="Mục đích chính của kỹ thuật Chuẩn hóa theo lô (Batch Normalization) trong mạng nơ-ron sâu là gì?",
                explanation="Batch Normalization ổn định phân phối đầu vào của các tầng ẩn (giảm Internal Covariate Shift), cho phép dùng Learning Rate cao hơn.",
                created_at="2026-07-25T14:25:00Z",
            ),
            [
                (
                    "opt-qd5-1",
                    "Giảm Internal Covariate Shift, ổn định và tăng tốc quá trình huấn luyện",
                    True,
                ),
                ("opt-qd5-2", "Tăng kích thước file checkpoint mô hình", False),
                ("opt-qd5-3", "Loại bỏ hoàn toàn bước tính đạo hàm", False),
                ("opt-qd5-4", "Chỉ dùng được cho bài toán xử lý ảnh", False),
            ],
        ),
    ]
    for q, opts in dl_questions:
        await _seed_question_with_options(session, q, opts)

    await session.merge(
        QuizMatrixModel(
            item_id="item-dl-quiz-1",
            bank_id="qb-dl-01",
            time_limit_minutes=30,
            passing_threshold_percent=80.0,
            easy_count=2,
            medium_count=2,
            hard_count=1,
            shuffle_options=True,
        )
    )
