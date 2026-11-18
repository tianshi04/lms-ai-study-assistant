"""Seed data for Certificates, Financial Aid, Discussion Forum, Payments, and Notifications."""

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.certificate.infrastructure.models import (
    CertificateModel,
    FinancialAidModel,
)
from src.modules.forum.infrastructure.models import (
    ForumReplyORM,
    ForumThreadORM,
    ForumVoteORM,
)
from src.modules.notification.infrastructure.models import NotificationModel
from src.modules.payment.infrastructure.models import (
    CoursePurchaseModel,
    PaymentOrderModel,
)


async def seed_commerce_and_community(session: AsyncSession) -> None:
    """Seed verified certificates, financial aid, forum discussions, purchases, and notifications."""
    certificates = [
        CertificateModel(
            certificate_id="CERT-DEMO12345",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            learner_name="Nguyễn Văn A",
            course_title="Supervised Machine Learning: Regression and Classification",
            partner_name="DeepLearning.AI",
            partner_logo_url="https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
            issue_date="22/07/2026",
            verification_url="/verify/CERT-DEMO12345",
            qr_code_url="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=CERT-DEMO12345",
            open_badges_json_ld={
                "@context": "https://w3id.org/openbadges/v2",
                "type": "BadgeClass",
                "name": "Supervised Machine Learning Verified Certificate",
            },
        ),
        CertificateModel(
            certificate_id="CERT-DEMO67890",
            user_id="user_learner_02",
            course_id="course-web-dev",
            learner_name="Trần Thu Hà",
            course_title="Modern Fullstack Web Development with Next.js & ConnectRPC",
            partner_name="Meta",
            partner_logo_url="https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg",
            issue_date="23/07/2026",
            verification_url="/verify/CERT-DEMO67890",
            qr_code_url="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=CERT-DEMO67890",
            open_badges_json_ld={
                "@context": "https://w3id.org/openbadges/v2",
                "type": "BadgeClass",
                "name": "Fullstack Web Development Verified Certificate",
            },
        ),
    ]
    for cert in certificates:
        await session.merge(cert)

    # Financial Aid Applications
    financial_aids = [
        FinancialAidModel(
            id="faid_seed_01",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            essay_150_words=(
                "Kính gửi Ban Giảng viên và Quản trị viên khóa học, Em hiện là sinh viên chuyên ngành Công nghệ thông tin đang rất khao khát tiếp cận tri thức chuyên sâu về Lập trình Python và AI Agent. Tuy nhiên do hoàn cảnh gia đình thuộc diện khó khăn và chưa có thu nhập độc lập, em chưa có khả năng chi trả học phí đầy đủ cho chứng chỉ khóa học. Em cam kết sẽ học tập nghiêm túc 100% thời lượng, hoàn thành đầy đủ các bài tập thực hành, bài thi Graded Quiz và bài nộp chấm chéo Peer Review đúng hạn. Kiến thức từ khóa học này sẽ là nền tảng quan trọng giúp em chuẩn bị cho đồ án tốt nghiệp và ứng tuyển vị trí thực tập sinh AI Engineer trong tương lai. Em rất mong nhận được sự hỗ trợ tài chính từ nhà trường để tiếp tục con đường học vấn của mình. Em chân thành cảm ơn!"
            ),
            status="PENDING",
            review_deadline_days_left=15,
        ),
        FinancialAidModel(
            id="faid_seed_02",
            user_id="user_learner_02",
            course_id="course-web-dev",
            essay_150_words=(
                "Kính gửi Ban Xét duyệt Hỗ trợ Tài chính, Tôi hiện là học viên tự học mong muốn chuyển hướng nghề nghiệp sang lĩnh vực Lập trình Web Fullstack với Next.js và ConnectRPC. Hiện tại mức thu nhập nhập môn còn hạn chế nên việc nâng cấp tài khoản có chứng chỉ xác minh là một thử thách tài chính lớn đối với tôi."
            ),
            status="APPROVED",
            review_deadline_days_left=0,
        ),
        FinancialAidModel(
            id="faid_seed_03",
            user_id="user_learner_03",
            course_id="course-deep-learning",
            essay_150_words=(
                "Em muốn xin học bổng để học khóa Deep Learning nhằm phát triển các dự án cá nhân."
            ),
            status="REJECTED",
            review_deadline_days_left=0,
        ),
    ]
    for faid in financial_aids:
        await session.merge(faid)

    # Forum Threads, Replies, and Votes
    threads = [
        ForumThreadORM(
            id="thread-ml-01",
            course_id="course-python-ai",
            item_id="item-ml-intro-video",
            title="Làm thế nào để chọn Learning Rate (Alpha) tối ưu cho Gradient Descent?",
            author_name="Lê Minh Trí",
            author_role="USER_ROLE_LEARNER",
            author_user_id="user_learner_demo",
            created_at="2026-07-22T10:15:00Z",
            upvote_count=5,
            is_staff_pinned=True,
        ),
        ForumThreadORM(
            id="thread-web-01",
            course_id="course-web-dev",
            item_id="item-web-video-1",
            title="Thắc mắc về ưu điểm của ConnectRPC so với REST API truyền thống",
            author_name="Phạm Quốc Bảo",
            author_role="USER_ROLE_LEARNER",
            author_user_id="user_learner_03",
            created_at="2026-07-22T12:00:00Z",
            upvote_count=8,
            is_staff_pinned=False,
        ),
        ForumThreadORM(
            id="thread-dl-01",
            course_id="course-deep-learning",
            item_id="item-dl-video-1",
            title="[Thông báo] Tài liệu hướng dẫn cài đặt PyTorch và CUDA 12 cho bài thực hành Neural Networks",
            author_name="Prof. Andrew Ng",
            author_role="USER_ROLE_INSTRUCTOR",
            author_user_id="user_instructor_01",
            created_at="2026-07-23T08:00:00Z",
            upvote_count=24,
            is_staff_pinned=True,
        ),
    ]
    for thread in threads:
        await session.merge(thread)

    replies = [
        ForumReplyORM(
            id="reply-ml-01-1",
            thread_id="thread-ml-01",
            author_name="ThS. Nguyễn Hoàng Nam",
            author_role="USER_ROLE_INSTRUCTOR",
            author_user_id="user_ta_01",
            content="Chào bạn Trí! Bạn nên thử các giá trị theo quy tắc lũy thừa của 10 như 0.001, 0.01, 0.1 và vẽ đồ thị Cost Function theo từng Iteration. Nếu Cost Function tăng dần nghĩa là Alpha quá lớn!",
            is_staff_answer=True,
            upvote_count=12,
            created_at="2026-07-22T10:30:00Z",
        ),
        ForumReplyORM(
            id="reply-ml-01-2",
            thread_id="thread-ml-01",
            author_name="Trần Thu Hà",
            author_role="USER_ROLE_LEARNER",
            author_user_id="user_learner_02",
            content="Cảm ơn thầy Nam, em cũng thử vẽ plot J(theta) theo lời khuyên của thầy và thấy học rất nhanh!",
            is_staff_answer=False,
            upvote_count=3,
            created_at="2026-07-22T10:30:00Z",
        ),
        ForumReplyORM(
            id="reply-web-01-1",
            thread_id="thread-web-01",
            author_name="ThS. Nguyễn Hoàng Nam",
            author_role="USER_ROLE_INSTRUCTOR",
            author_user_id="user_ta_01",
            content="ConnectRPC sinh mã nguồn Type-Safe stubs tự động cho cả Frontend lẫn Backend từ tệp .proto, giúp hạn chế lỗi runtime gõ sai tên trường API và tối ưu tốc độ nhờ Protobuf binary serialization!",
            is_staff_answer=True,
            upvote_count=9,
            created_at="2026-07-22T12:45:00Z",
        ),
    ]
    for reply in replies:
        await session.merge(reply)

    votes = [
        ForumVoteORM(
            id="vote-01",
            user_id="user_learner_demo",
            post_id="thread-ml-01",
            created_at="2026-07-22T10:16:00Z",
        ),
        ForumVoteORM(
            id="vote-02",
            user_id="user_learner_demo",
            post_id="reply-ml-01-1",
            created_at="2026-07-22T10:31:00Z",
        ),
        ForumVoteORM(
            id="vote-03",
            user_id="user_learner_02",
            post_id="thread-web-01",
            created_at="2026-07-22T12:05:00Z",
        ),
    ]
    for vote in votes:
        await session.merge(vote)

    # Course Purchases & Payment Orders
    purchases = [
        CoursePurchaseModel(
            id="pur-demo-01",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            amount=1200000.0,
            currency="VND",
            status="COMPLETED",
            payment_method="VNPAY",
            created_at="2026-07-20T10:00:00Z",
        ),
        CoursePurchaseModel(
            id="pur-demo-02",
            user_id="user_learner_demo",
            course_id="course-web-dev",
            amount=990000.0,
            currency="VND",
            status="COMPLETED",
            payment_method="VNPAY",
            created_at="2026-07-21T14:30:00Z",
        ),
        CoursePurchaseModel(
            id="pur-demo-micro",
            user_id="user_learner_demo",
            course_id="course-microeconomics-foundations",
            amount=790000.0,
            currency="VND",
            status="COMPLETED",
            payment_method="VNPAY",
            created_at="2026-07-24T10:00:00Z",
        ),
        CoursePurchaseModel(
            id="pur-demo-econ",
            user_id="user_learner_demo",
            course_id="course-applied-econometrics",
            amount=1290000.0,
            currency="VND",
            status="COMPLETED",
            payment_method="VNPAY",
            created_at="2026-07-25T08:30:00Z",
        ),
        CoursePurchaseModel(
            id="pur-demo-pricing",
            user_id="user_learner_demo",
            course_id="course-behavioral-pricing-strategy",
            amount=1890000.0,
            currency="VND",
            status="COMPLETED",
            payment_method="VNPAY",
            created_at="2026-07-25T12:00:00Z",
        ),
    ]
    for pur in purchases:
        await session.merge(pur)

    orders = [
        PaymentOrderModel(
            id="order-demo-01",
            user_id="user_learner_demo",
            target_type="COURSE",
            target_id="course-python-ai",
            plan_type="NONE",
            amount=1200000.0,
            currency="VND",
            status="COMPLETED",
            vnp_txn_ref="VNPTXN-DEMO-001",
            created_at="2026-07-20T09:55:00Z",
            updated_at="2026-07-20T10:00:00Z",
        ),
        PaymentOrderModel(
            id="order-demo-02",
            user_id="user_learner_demo",
            target_type="COURSE",
            target_id="course-web-dev",
            plan_type="NONE",
            amount=990000.0,
            currency="VND",
            status="COMPLETED",
            vnp_txn_ref="VNPTXN-DEMO-002",
            created_at="2026-07-21T14:25:00Z",
            updated_at="2026-07-21T14:30:00Z",
        ),
        PaymentOrderModel(
            id="order-demo-03",
            user_id="user_learner_demo",
            target_type="COURSE",
            target_id="course-deep-learning",
            plan_type="NONE",
            amount=1500000.0,
            currency="VND",
            status="PENDING",
            vnp_txn_ref="VNPTXN-DEMO-003",
            created_at="2026-07-26T16:00:00Z",
            updated_at="2026-07-26T16:00:00Z",
        ),
        PaymentOrderModel(
            id="order-demo-micro",
            user_id="user_learner_demo",
            target_type="COURSE",
            target_id="course-microeconomics-foundations",
            plan_type="NONE",
            amount=790000.0,
            currency="VND",
            status="COMPLETED",
            vnp_txn_ref="VNPTXN-DEMO-MICRO",
            created_at="2026-07-24T09:55:00Z",
            updated_at="2026-07-24T10:00:00Z",
        ),
        PaymentOrderModel(
            id="order-demo-econ",
            user_id="user_learner_demo",
            target_type="COURSE",
            target_id="course-applied-econometrics",
            plan_type="NONE",
            amount=1290000.0,
            currency="VND",
            status="COMPLETED",
            vnp_txn_ref="VNPTXN-DEMO-ECON",
            created_at="2026-07-25T08:25:00Z",
            updated_at="2026-07-25T08:30:00Z",
        ),
        PaymentOrderModel(
            id="order-demo-pricing",
            user_id="user_learner_demo",
            target_type="COURSE",
            target_id="course-behavioral-pricing-strategy",
            plan_type="NONE",
            amount=1890000.0,
            currency="VND",
            status="COMPLETED",
            vnp_txn_ref="VNPTXN-DEMO-PRICING",
            created_at="2026-07-25T11:55:00Z",
            updated_at="2026-07-25T12:00:00Z",
        ),
    ]
    for order in orders:
        await session.merge(order)

    # In-App Notifications
    now_utc = datetime.now(UTC)
    notifications = [
        NotificationModel(
            id="noti-demo-01",
            recipient_id="user_learner_demo",
            category="SYSTEM",
            title="Chào mừng bạn đến với Nền tảng Học tập Coursera AI!",
            content="Tài khoản của bạn đã được kích hoạt thành công với giấy phép Doanh nghiệp đối tác.",
            action_url="/my-learning",
            actor_avatar_url="https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
            is_read=True,
            read_at=now_utc,
            created_at=now_utc,
        ),
        NotificationModel(
            id="noti-demo-02",
            recipient_id="user_learner_demo",
            category="ACADEMIC",
            title="Nhắc nhở hạn nộp: Graded Quiz Tuần 1",
            content="Hạn nộp bài kiểm tra Máy học cơ bản sẽ kết thúc sau 48 giờ tới. Hãy hoàn thành đúng hạn!",
            action_url="/learn/course-python-ai",
            actor_avatar_url="",
            is_read=False,
            read_at=None,
            created_at=now_utc,
        ),
        NotificationModel(
            id="noti-demo-03",
            recipient_id="user_learner_demo",
            category="COMMUNITY",
            title="Phản hồi mới trên Diễn đàn thảo luận",
            content="Giảng viên Nguyễn Hoàng Nam đã phản hồi thắc mắc về Learning Rate của bạn.",
            action_url="/learn/course-python-ai",
            actor_avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=ta@coursera.ai",
            is_read=False,
            read_at=None,
            created_at=now_utc,
        ),
        NotificationModel(
            id="noti-demo-04",
            recipient_id="user_learner_demo",
            category="SYSTEM",
            title="Đơn xin Hỗ trợ Tài chính (Financial Aid) đã được tiếp nhận",
            content="Hồ sơ xin hỗ trợ học phí cho khóa học Python & AI đang được Hội đồng xét duyệt.",
            action_url="/financial-aid",
            actor_avatar_url="",
            is_read=False,
            read_at=None,
            created_at=now_utc,
        ),
    ]
    for noti in notifications:
        await session.merge(noti)
