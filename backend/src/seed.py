"""Database Seeding Script for Development & Demo Environment.

Best-Practice DDD Infrastructure Seeding Script:
- Default Execution (Upsert Mode): Uses session.merge() to safely insert missing seed records or update existing ones without destructive data wipes.
- Reset Execution (--reset Flag): Dynamically truncates all database tables when explicitly requested for a pristine environment reset.
- Dev Startup Integration: Auto-seeds initial catalog if the database contains no courses.

Usage:
  - Default / Upsert:  uv run python src/seed.py
  - Full Clean Reset:  uv run python src/seed.py --reset
"""

# ruff: noqa: F401

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from datetime import UTC, datetime, timezone

from sqlalchemy import delete, select, text

from src.modules.assessment.infrastructure.models import (
    GradeAppealModel,
    HonorCodeModel,
    LabSubmissionModel,
    PeerAssignmentSubmissionModel,
    PeerReviewModel,
    QuestionBankModel,
    QuestionModel,
    QuestionOptionModel,
    QuizCooldownModel,
    QuizMatrixModel,
    QuizSubmissionModel,
)
from src.modules.catalog.infrastructure.models import (
    CategoryModel,
    CourseAnnouncementModel,
    CourseModel,
    CourseReviewModel,
    InteractiveTranscriptModel,
    InVideoQuizModel,
    ItemType,
    LearningItemModel,
    LessonModel,
    SpecializationModel,
    WeekModuleModel,
)
from src.modules.certificate.infrastructure.models import (
    CertificateModel,
    FinancialAidModel,
)
from src.modules.forum.infrastructure.models import (
    ForumReplyORM,
    ForumThreadORM,
    ForumVoteORM,
)
from src.modules.identity.application import hash_password
from src.modules.identity.domain import UserRole
from src.modules.identity.infrastructure.models import (
    EnterpriseLicenseModel,
    OrganizationMemberModel,
    OrganizationModel,
    UserModel,
)
from src.modules.learning.domain import DeadlineStatus
from src.modules.learning.infrastructure.models import (
    LearningProgressModel,
    PersonalNoteModel,
    WeeklyDeadlineModel,
)
from src.modules.notification.infrastructure.models import (
    NotificationModel,
    UserNotificationPreferenceModel,
)
from src.modules.partner.infrastructure.models import PartnerModel
from src.modules.payment.infrastructure.models import (
    CoursePurchaseModel,
    PaymentOrderModel,
)
from src.shared.infrastructure.database import Base, async_session_scope
from src.shared.infrastructure.logging import setup_logging

setup_logging()
logger = logging.getLogger("seed")


def build_categories() -> list[CategoryModel]:
    return [
        CategoryModel(
            id="cat-subj-cs",
            name="Computer Science",
            slug="computer-science",
            type="SUBJECT",
            created_at="2026-07-20T00:00:00Z",
        ),
        CategoryModel(
            id="cat-subj-ds",
            name="Data Science",
            slug="data-science",
            type="SUBJECT",
            created_at="2026-07-20T00:00:00Z",
        ),
        CategoryModel(
            id="cat-subj-biz",
            name="Business",
            slug="business",
            type="SUBJECT",
            created_at="2026-07-20T00:00:00Z",
        ),
        CategoryModel(
            id="cat-subj-ai",
            name="Artificial Intelligence",
            slug="ai",
            type="SUBJECT",
            created_at="2026-07-20T00:00:00Z",
        ),
        CategoryModel(
            id="cat-subj-it",
            name="Information Technology",
            slug="information-technology",
            type="SUBJECT",
            created_at="2026-07-20T00:00:00Z",
        ),
        CategoryModel(
            id="cat-lvl-beg",
            name="Beginner",
            slug="beginner",
            type="LEVEL",
            created_at="2026-07-20T00:00:00Z",
        ),
        CategoryModel(
            id="cat-lvl-int",
            name="Intermediate",
            slug="intermediate",
            type="LEVEL",
            created_at="2026-07-20T00:00:00Z",
        ),
        CategoryModel(
            id="cat-lvl-adv",
            name="Advanced",
            slug="advanced",
            type="LEVEL",
            created_at="2026-07-20T00:00:00Z",
        ),
    ]


def build_sample_catalog() -> tuple[list[CourseModel], list[SpecializationModel]]:
    """Construct rich domain seed data objects for the initial catalog."""
    sample_url = "https://www.youtube.com/watch?v=aircAruvnKk"  # 3Blue1Brown - But what is a Neural Network? (19min)
    sample_url_2 = "https://www.youtube.com/watch?v=IHZwWFHWa-w"  # 3Blue1Brown - Gradient Descent (10min)
    sample_url_3 = "https://www.youtube.com/watch?v=rfscVS0vtbw"  # freeCodeCamp - Python for Beginners (short clip)
    deeplearning_logo = (
        "https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg"
    )
    meta_logo = "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg"

    # Course 1: Supervised Machine Learning
    course1 = CourseModel(
        id="course-python-ai",
        title="Supervised Machine Learning: Regression and Classification",
        slug="supervised-machine-learning",
        description="Build machine learning models in Python using NumPy and scikit-learn, train supervised models for prediction and binary classification.",
        partner_name="DeepLearning.AI",
        partner_logo_url=deeplearning_logo,
        owner_id="user_instructor_01",
        subject="cat-subj-ds",
        level="cat-lvl-int",
        status="PUBLISHED",
    )

    # Week 1
    week1 = WeekModuleModel(
        id="week-1-ml",
        course_id=course1.id,
        week_number=1,
        title="Week 1: Introduction to Machine Learning & Regression",
        summary="Learn the core concepts of supervised learning and implement your first linear regression model.",
    )

    lesson1 = LessonModel(
        id="lesson-linear-regression",
        week_module_id=week1.id,
        title="Lesson 1: Linear Regression with One Variable",
        estimated_minutes=37,
    )

    item1 = LearningItemModel(
        id="item-ml-intro-video",
        lesson_id=lesson1.id,
        title="Lecture: Introduction to Linear Regression & Cost Function",
        type=ItemType.VIDEO,
        estimated_minutes=12,
        video_url=sample_url,
        vtt_subtitle_url="",
    )

    raw_transcripts_ml1 = [
        (
            0,
            "This is a 3. It's recognizably a three, even though it's drawn in a low-resolution grid of pixels.",
        ),
        (
            8,
            "When you look at it, your visual cortex immediately recognizes patterns of strokes, loops, and edges.",
        ),
        (
            16,
            "How can we write a computer program that takes this image and correctly identifies it as the number 3?",
        ),
        (
            25,
            "A classic approach in machine learning is to build an artificial neural network inspired by biological brains.",
        ),
        (
            35,
            "The network begins with an input layer consisting of 784 neurons, corresponding to 28 by 28 pixels.",
        ),
        (
            46,
            "Each neuron in this input layer holds a number between 0 and 1, representing the brightness of that pixel.",
        ),
        (
            56,
            "This number is called an activation. Bright pixels have activations near 1, while dark pixels have activations near 0.",
        ),
        (
            68,
            "These 784 activations are passed forward into the first hidden layer containing 16 neurons.",
        ),
        (
            80,
            "Why do we have hidden layers? They act as intermediate feature detectors that recognize subcomponents.",
        ),
        (
            92,
            "For example, specific neurons might detect horizontal strokes, loops, or diagonal boundaries of the digit.",
        ),
        (
            105,
            "The second hidden layer then combines these simple strokes into recognizable component parts of digits.",
        ),
        (
            120,
            "Finally, the output layer consists of 10 neurons, representing the probability of each digit from 0 to 9.",
        ),
        (
            135,
            "The output neuron with the highest activation corresponds to the network's final prediction.",
        ),
        (
            150,
            "Now, how does information actually flow between consecutive layers of neurons?",
        ),
        (
            165,
            "Each neuron in the next layer is connected to all neurons in the previous layer.",
        ),
        (
            180,
            "Every single connection has an associated number called a weight, representing connection strength.",
        ),
        (
            195,
            "A positive weight indicates that an active neuron encourages the receiving neuron to fire as well.",
        ),
        (
            210,
            "A negative weight means the connection is inhibitory, suppressing the activation of the receiving neuron.",
        ),
        (
            225,
            "To compute the incoming signal, we calculate the weighted sum of all incoming neuron activations.",
        ),
        (
            245,
            "However, we only want the neuron to fire when this weighted sum exceeds a meaningful threshold.",
        ),
        (
            265,
            "To achieve this, we add another adjustable parameter called a bias to shift the activation threshold.",
        ),
        (
            285,
            "To keep the final activation bounded between 0 and 1, we pass the sum through an activation function.",
        ),
        (
            310,
            "Historically, the Sigmoid function was used to squish the real line into values strictly between 0 and 1.",
        ),
        (
            340,
            "In modern deep learning architectures, ReLU (Rectified Linear Unit, max(0, x)) is widely preferred.",
        ),
        (
            375,
            "ReLU is computationally efficient and avoids vanishing gradient issues during backpropagation.",
        ),
        (
            410,
            "We can express this entire computation compactly using linear algebra: a^(1) = sigma(W * a^(0) + b).",
        ),
        (
            450,
            "With 784 inputs, two hidden layers of 16 neurons, and 10 outputs, there are over 13,000 adjustable parameters.",
        ),
        (
            495,
            "How do we find the exact combination of weights and biases that performs digit classification accurately?",
        ),
        (
            545,
            "This is where learning begins: we define a cost function (or loss function) to quantify prediction error.",
        ),
        (
            600,
            "For a single training image, the cost is the sum of squared differences between actual and desired output values.",
        ),
        (
            660,
            "The total cost of the network is the average error computed across all 60,000 training images in the MNIST dataset.",
        ),
        (
            725,
            "When the network is first initialized with random weights, the cost is very high and accuracy is roughly 10%.",
        ),
        (
            795,
            "To minimize this cost, we use Gradient Descent — calculating the direction in parameter space that reduces error most rapidly.",
        ),
        (
            870,
            "The gradient vector tells us how sensitive the cost function is to small changes in each individual weight and bias.",
        ),
        (
            950,
            "By taking repeated small steps in the negative gradient direction, the network continuously refines its internal weights.",
        ),
        (
            1030,
            "Backpropagation is the efficient algorithm used to calculate these gradient derivatives via the calculus chain rule.",
        ),
        (
            1100,
            "In the next lecture, we will explore the deep mathematics and geometric intuition behind Gradient Descent.",
        ),
    ]

    for ts, txt in raw_transcripts_ml1:
        item1.interactive_transcripts.append(
            InteractiveTranscriptModel(timestamp_seconds=ts, text=txt)
        )

    q1 = InVideoQuizModel(
        timestamp_seconds=120,
        question="What determines how much influence one neuron has on another in a neural network?",
        options=[
            "Activation function",
            "Weights",
            "Bias",
            "Learning rate",
        ],
        correct_option_index=1,
        explanation="Weights are the parameters that determine the strength of connection between neurons. The network learns by adjusting these weights.",
    )
    item1.in_video_quizzes.append(q1)

    item2 = LearningItemModel(
        id="item-ml-reading-1",
        lesson_id=lesson1.id,
        title="Reading: Math Foundations of Gradient Descent",
        type=ItemType.READING,
        estimated_minutes=15,
        reading_markdown="# Math Foundations of Gradient Descent\n\nGradient descent is an optimization algorithm used to minimize cost functions in machine learning models.\n\n## Key Concepts\n- **Learning Rate (alpha)**: Controls the step size at each iteration.\n- **Loss Function**: Measures the prediction error.\n\n> *Tip: Choosing an appropriate learning rate is crucial for convergence.*",
    )

    item3_practice = LearningItemModel(
        id="item-ml-practice-1",
        lesson_id=lesson1.id,
        title="Practice Quiz: Linear Algebra & Numpy Fundamentals",
        type=ItemType.PRACTICE_QUIZ,
        estimated_minutes=15,
        quiz_matrix_id="qb-ml-practice",
    )

    item3 = LearningItemModel(
        id="item-ml-quiz-1",
        lesson_id=lesson1.id,
        title="Graded Quiz: Supervised Learning & Regression Basics",
        type=ItemType.GRADED_QUIZ,
        estimated_minutes=20,
        quiz_matrix_id="qb-ml-01",
    )

    sample_starter_code = """def solve_linear_loss(y_true: list[float], y_pred: list[float]) -> float:
    \"\"\"
    Calculate Mean Squared Error (MSE) between actual and predicted targets.
    Formula: MSE = (1/N) * sum((y_true[i] - y_pred[i]) ** 2)
    \"\"\"
    # TODO: Implement your solution here
    pass
"""
    sample_test_cases = [
        {
            "input": "[1.0, 2.0, 3.0], [1.0, 2.0, 3.0]",
            "expected_output": "0.0",
            "is_hidden": False,
        },
        {
            "input": "[2.0, 4.0], [4.0, 6.0]",
            "expected_output": "4.0",
            "is_hidden": False,
        },
        {
            "input": "[0.0, 1.0, 5.0], [1.0, 3.0, 5.0]",
            "expected_output": "1.6666666666666667",
            "is_hidden": True,
        },
    ]

    item4 = LearningItemModel(
        id="item-ml-lab-1",
        lesson_id=lesson1.id,
        title="Auto-Graded Lab: Implementing MSE Loss Function in Python",
        type=ItemType.AUTO_GRADED_LAB,
        estimated_minutes=30,
        language="python",
        starter_code=sample_starter_code,
        test_cases_json=json.dumps(sample_test_cases),
    )

    sample_rubric = [
        {
            "criterion": "1. Model Architecture & Mathematical Formulations",
            "max_points": 40,
            "description": "Clear explanation of linear/logistic regression hypotheses, cost functions, and gradient equations.",
        },
        {
            "criterion": "2. Feature Engineering & Preprocessing Strategy",
            "max_points": 30,
            "description": "Evaluation of feature scaling (Standardization/MinMax) and missing value handling techniques.",
        },
        {
            "criterion": "3. Code Organization & Documentation",
            "max_points": 30,
            "description": "Clean modular Python code with type annotations, docstrings, and comprehensive Markdown reports.",
        },
    ]

    item5 = LearningItemModel(
        id="item-ml-peer-1",
        lesson_id=lesson1.id,
        title="Peer-Graded Assignment: Supervised Machine Learning Model Design",
        type=ItemType.PEER_REVIEW,
        estimated_minutes=45,
        rubric_criteria_json=json.dumps(sample_rubric),
    )

    lesson1.items.extend([item1, item2, item3_practice, item3, item4, item5])
    week1.lessons.append(lesson1)

    # Week 2
    week2 = WeekModuleModel(
        id="week-2-ml",
        course_id=course1.id,
        week_number=2,
        title="Week 2: Classification & Logistic Regression",
        summary="Master binary classification algorithms, Sigmoid decision boundaries, and regularized cost functions.",
    )
    lesson2 = LessonModel(
        id="lesson-logistic-regression",
        week_module_id=week2.id,
        title="Lesson 2: Logistic Regression & Overfitting Prevention",
        estimated_minutes=40,
    )
    item6 = LearningItemModel(
        id="item-ml-video-2",
        lesson_id=lesson2.id,
        title="Lecture: Gradient Descent & Neural Network Training",
        type=ItemType.VIDEO,
        estimated_minutes=10,
        video_url=sample_url_2,
    )
    raw_transcripts_ml2 = [
        (
            0,
            "In this lecture, we examine Gradient Descent — the fundamental optimization algorithm powering deep learning.",
        ),
        (
            15,
            "Imagine yourself standing in a dense fog on a mountainous terrain, trying to find your way down to the lowest valley.",
        ),
        (
            35,
            "You cannot see the global map, but you can feel the local slope of the ground beneath your feet.",
        ),
        (
            55,
            "The intuitive strategy is to take a step in the direction of steepest downward descent.",
        ),
        (
            80,
            "In machine learning, this landscape is defined by the cost function C(w, b) across thousands of parameter dimensions.",
        ),
        (
            110,
            "The gradient vector nabla C points in the direction of steepest increase of the cost function.",
        ),
        (
            145,
            "Therefore, stepping in the opposite direction (-nabla C) ensures that cost decreases as quickly as possible.",
        ),
        (
            185,
            "The parameter update rule is simple: w := w - alpha * (partial C / partial w).",
        ),
        (
            225,
            "Here, alpha represents the learning rate, which controls how large of a step we take downhill on each iteration.",
        ),
        (
            270,
            "If alpha is set too small, convergence is agonizingly slow, requiring millions of steps to reach the minimum.",
        ),
        (
            320,
            "Conversely, if alpha is set too large, the optimizer can overshoot the valley entirely and diverge into infinity.",
        ),
        (
            375,
            "Standard batch gradient descent computes the exact gradient by averaging errors over every single training example.",
        ),
        (
            435,
            "When training sets contain millions of images, computing full batch gradients becomes prohibitively slow.",
        ),
        (
            500,
            "Stochastic Gradient Descent (SGD) solves this bottleneck by updating weights after each individual sample.",
        ),
        (
            570,
            "Mini-batch Gradient Descent provides the best of both worlds by computing gradients over small batches of 32 to 512 samples.",
        ),
        (
            645,
            "Mini-batches allow efficient vectorization on modern GPUs while providing noisy gradients that help escape local minima.",
        ),
        (
            725,
            "Advanced optimizers like Momentum add velocity terms to prevent oscillations across steep ravine walls.",
        ),
        (
            810,
            "The Adam optimizer dynamically adapts separate learning rates for each individual parameter based on running moments.",
        ),
        (
            900,
            "To prevent neural networks from overfitting training data, we incorporate L2 regularization (weight decay).",
        ),
        (
            995,
            "Monitoring both training loss and validation loss helps us detect when the network begins memorizing noise.",
        ),
        (
            1090,
            "Mastering gradient landscapes equips you with the intuition needed to diagnose training issues in production models.",
        ),
        (
            1180,
            "In the upcoming lab, you will implement gradient descent from scratch in Python with NumPy vectorization.",
        ),
    ]

    for ts, txt in raw_transcripts_ml2:
        item6.interactive_transcripts.append(
            InteractiveTranscriptModel(timestamp_seconds=ts, text=txt)
        )

    item7 = LearningItemModel(
        id="item-ml-quiz-2",
        lesson_id=lesson2.id,
        title="Graded Quiz: Classification & Logistic Regression",
        type=ItemType.GRADED_QUIZ,
        estimated_minutes=22,
        quiz_matrix_id="qb-ml-02",
    )
    lesson2.items.extend([item6, item7])
    week2.lessons.append(lesson2)
    course1.week_modules.extend([week1, week2])

    # Course 2: Modern Fullstack Web Development
    course2 = CourseModel(
        id="course-web-dev",
        title="Modern Fullstack Web Development with Next.js & ConnectRPC",
        slug="modern-fullstack-web-dev",
        description="Master modern Web Development using Next.js 15 App Router, TypeScript, ConnectRPC gRPC web, and Tailwind CSS v4.",
        partner_name="Meta",
        partner_logo_url=meta_logo,
        owner_id="user_instructor_02",
        subject="cat-subj-it",
        level="cat-lvl-beg",
        status="PUBLISHED",
    )

    week_web1 = WeekModuleModel(
        id="week-1-web",
        course_id=course2.id,
        week_number=1,
        title="Week 1: Next.js 15 App Router & Server Components",
        summary="Learn React Server Components, App Router routing, and ConnectRPC stub integration.",
    )

    lesson_web1 = LessonModel(
        id="lesson-nextjs-intro",
        week_module_id=week_web1.id,
        title="Lesson 1: Building Modern Web Apps with Next.js & ConnectRPC",
        estimated_minutes=45,
    )

    item_web1 = LearningItemModel(
        id="item-web-video-1",
        lesson_id=lesson_web1.id,
        title="Lecture: Fullstack Web Architecture & ConnectRPC",
        type=ItemType.VIDEO,
        estimated_minutes=20,
        video_url=sample_url_3,
        vtt_subtitle_url="",
    )

    raw_transcripts_web1 = [
        (
            0,
            "Welcome to Modern Fullstack Web Architecture with Next.js 15, TypeScript, and ConnectRPC!",
        ),
        (
            18,
            "In this series, we build scalable production systems using contract-first RPC protocols and React Server Components.",
        ),
        (
            40,
            "React Server Components (RSC) execute exclusively on the server, streaming rendered UI without shipping JavaScript to the browser.",
        ),
        (
            70,
            "This architectural shift reduces bundle sizes dramatically and allows direct, secure access to backend microservices.",
        ),
        (
            105,
            "For communication between frontend and backend, we adopt ConnectRPC powered by Protocol Buffers.",
        ),
        (
            145,
            "Unlike traditional REST APIs, Protobuf schemas define strict, type-safe data contracts shared across Python and TypeScript.",
        ),
        (
            190,
            "ConnectRPC operates smoothly across HTTP/1.1, HTTP/2, and gRPC-Web without requiring complex Envoy proxy setups.",
        ),
        (
            240,
            "Our backend architecture follows Domain-Driven Design (DDD), dividing the monolith into clean, isolated bounded contexts.",
        ),
        (
            295,
            "Each domain module maintains strict boundary separation: Domain entities, Application use-cases, and Infrastructure adapters.",
        ),
        (
            355,
            "Next.js App Router provides parallel and intercepted routes for rich interactive modal workflows.",
        ),
        (
            420,
            "Tailwind CSS v4 brings zero-runtime utility styling with CSS variables and lightning-fast build compilation.",
        ),
        (
            490,
            "On the client, TanStack React Query manages caching, automatic refetching, and optimistic UI mutations.",
        ),
        (
            565,
            "Security is enforced using JWT token interceptors that authenticate every ConnectRPC header automatically.",
        ),
        (
            645,
            "For AI-assisted workflows, we integrate CopilotKit streaming copilot interactions over Server-Sent Events (SSE).",
        ),
        (
            730,
            "Automated CI/CD pipelines run Playwright blackbox tests and backend unit tests on every pull request.",
        ),
        (
            820,
            "This contract-driven design ensures that API contract mismatches are caught at compile time before reaching production.",
        ),
        (
            915,
            "In the hands-on lab following this video, you will set up your first ConnectRPC client and invoke live backend endpoints.",
        ),
        (
            1010,
            "Let's open our development environment and start building our modern fullstack application!",
        ),
    ]

    for ts, txt in raw_transcripts_web1:
        item_web1.interactive_transcripts.append(
            InteractiveTranscriptModel(timestamp_seconds=ts, text=txt)
        )

    item_web2 = LearningItemModel(
        id="item-web-reading-1",
        lesson_id=lesson_web1.id,
        title="Reading: ConnectRPC gRPC-web Best Practices",
        type=ItemType.READING,
        estimated_minutes=15,
        reading_markdown="# ConnectRPC Best Practices\n\nConnectRPC provides lightweight, type-safe gRPC web protocol stubs for TypeScript and Python.\n\n## Key Features\n- **Type Safety**: Proto stubs generated automatically.\n- **Fast Serialization**: Binary Protobuf & JSON support.",
    )

    item_web_quiz = LearningItemModel(
        id="item-web-quiz-1",
        lesson_id=lesson_web1.id,
        title="Graded Quiz: Next.js 15 App Router & ConnectRPC Architecture",
        type=ItemType.GRADED_QUIZ,
        estimated_minutes=25,
        quiz_matrix_id="qb-web-01",
    )

    lesson_web1.items.extend([item_web1, item_web2, item_web_quiz])
    week_web1.lessons.append(lesson_web1)

    week_web2 = WeekModuleModel(
        id="week-2-web",
        course_id=course2.id,
        week_number=2,
        title="Week 2: Styling & Component Libraries with Tailwind CSS v4",
        summary="Design stunning UI components with CSS Grid, Glassmorphism, dynamic animations, and Tailwind v4.",
    )
    lesson_web2 = LessonModel(
        id="lesson-tailwind-ui",
        week_module_id=week_web2.id,
        title="Lesson 2: Modern CSS Architecture & Responsive Design",
        estimated_minutes=35,
    )
    item_web3 = LearningItemModel(
        id="item-web-lab-2",
        lesson_id=lesson_web2.id,
        title="Auto-Graded Lab: Building Responsive Card Components",
        type=ItemType.AUTO_GRADED_LAB,
        estimated_minutes=30,
    )
    lesson_web2.items.append(item_web3)
    week_web2.lessons.append(lesson_web2)
    course2.week_modules.extend([week_web1, week_web2])

    # Course 3: Neural Networks & Deep Learning
    course3 = CourseModel(
        id="course-deep-learning",
        title="Neural Networks and Deep Learning",
        slug="neural-networks-deep-learning",
        description="Master deep learning fundamentals, build deep neural networks using Python and Vectorization, and understand forward and backward propagation.",
        partner_name="DeepLearning.AI",
        partner_logo_url=deeplearning_logo,
        owner_id="user_instructor_01",
        subject="cat-subj-cs",
        level="cat-lvl-adv",
        status="PUBLISHED",
    )
    week_dl1 = WeekModuleModel(
        id="week-1-dl",
        course_id=course3.id,
        week_number=1,
        title="Week 1: Introduction to Deep Learning",
        summary="Understand how neural networks learn complex pattern representations from large-scale data.",
    )
    lesson_dl1 = LessonModel(
        id="lesson-dl-intro",
        week_module_id=week_dl1.id,
        title="Lesson 1: Introduction to Neural Networks",
        estimated_minutes=30,
    )
    item_dl1 = LearningItemModel(
        id="item-dl-video-1",
        lesson_id=lesson_dl1.id,
        title="Lecture: What is a Neural Network?",
        type=ItemType.VIDEO,
        estimated_minutes=15,
        video_url=sample_url_2,
    )
    t_dl1 = InteractiveTranscriptModel(
        timestamp_seconds=0,
        text="Welcome to Deep Learning! In this course, we demystify how multi-layer deep networks extract hierarchical representations.",
    )
    t_dl2 = InteractiveTranscriptModel(
        timestamp_seconds=90,
        text="Deep learning succeeds because deeper layers learn compositional features: pixels -> edges -> shapes -> semantic objects.",
    )
    t_dl3 = InteractiveTranscriptModel(
        timestamp_seconds=200,
        text="Vectorized implementations in NumPy and PyTorch execute operations across entire batches simultaneously using SIMD / GPU acceleration.",
    )
    t_dl4 = InteractiveTranscriptModel(
        timestamp_seconds=330,
        text="Forward propagation calculates activations layer by layer: Z^[l] = W^[l] * A^[l-1] + b^[l], A^[l] = g^[l](Z^[l]).",
    )
    t_dl5 = InteractiveTranscriptModel(
        timestamp_seconds=480,
        text="Backpropagation applies the multivariate calculus chain rule to calculate dW and db efficiently from output to input.",
    )
    t_dl6 = InteractiveTranscriptModel(
        timestamp_seconds=620,
        text="Activation functions: Sigmoid and Tanh can suffer from vanishing gradients, while ReLU and Leaky ReLU maintain active propagation.",
    )
    t_dl7 = InteractiveTranscriptModel(
        timestamp_seconds=760,
        text="Weight initialization strategies (such as He and Xavier/Glorot initialization) prevent signal explosion or decay during deep passes.",
    )
    t_dl8 = InteractiveTranscriptModel(
        timestamp_seconds=900,
        text="Let us now dive into the implementation lab where you will code forward propagation from scratch in Python.",
    )
    item_dl1.interactive_transcripts.extend(
        [t_dl1, t_dl2, t_dl3, t_dl4, t_dl5, t_dl6, t_dl7, t_dl8]
    )

    item_dl_quiz = LearningItemModel(
        id="item-dl-quiz-1",
        lesson_id=lesson_dl1.id,
        title="Graded Quiz: Deep Learning Foundations & Vectorization",
        type=ItemType.GRADED_QUIZ,
        estimated_minutes=30,
        quiz_matrix_id="qb-dl-01",
    )

    lesson_dl1.items.extend([item_dl1, item_dl_quiz])
    week_dl1.lessons.append(lesson_dl1)
    course3.week_modules.append(week_dl1)

    # Specializations
    spec1 = SpecializationModel(
        id="spec-ai-eng",
        title="Machine Learning Specialization",
        description="Master fundamental AI concepts and develop practical machine learning skills in this beginner-friendly program.",
        partner_name="DeepLearning.AI",
        course_ids=[course1.id, course3.id],
    )

    spec2 = SpecializationModel(
        id="spec-fullstack-web",
        title="Fullstack Web Engineering Specialization",
        description="Build high-performance web applications with Next.js 15, ConnectRPC, and microservice architectures.",
        partner_name="Meta",
        course_ids=[course2.id],
    )

    return [course1, course2, course3], [spec1, spec2]


async def seed_database(reset: bool = False, auto_mode: bool = False) -> None:
    """Execute database seeding with best-practice options.

    :param reset: If True, truncates all database tables before re-seeding.
    :param auto_mode: If True (e.g. dev startup), skips seeding if database already contains courses.
    """
    async with async_session_scope() as session:
        if auto_mode:
            stmt = select(CourseModel).limit(1)
            res = await session.execute(stmt)
            if res.scalar_one_or_none() is not None:
                logger.info(
                    "[SEED] Database already contains courses. Auto-seeding skipped."
                )
                return

        if reset:
            logger.info("[SEED] Truncating ALL database tables for full clean reset...")
            tables = [f'"{table.name}"' for table in Base.metadata.sorted_tables]
            if tables:
                await session.execute(
                    text(f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE")
                )
                await session.commit()

        logger.info("[SEED] Seeding demonstration catalog into PostgreSQL...")
        categories = build_categories()
        courses, specializations = build_sample_catalog()

        # Idempotent Upsert using session.merge()
        for cat in categories:
            await session.merge(cat)
        for course in courses:
            await session.merge(course)
        for spec in specializations:
            await session.merge(spec)

        # Seed Sample Partners
        partner_stanford = PartnerModel(
            id="partner-stanford",
            name="Stanford Online",
            slug="stanford-online",
            description="Stanford Online offers lifelong learning opportunities from Stanford University.",
            logo_url="https://upload.wikimedia.org/wikipedia/commons/4/4b/Stanford_Cardinal_logo.svg",
            banner_url="https://images.unsplash.com/photo-1541339907198-e08756dedf3f",
            website_url="https://online.stanford.edu",
            allowed_domains=["stanford.edu", "online.stanford.edu"],
            signature_image_url="https://example.com/signatures/stanford_dean.png",
            signer_name="Prof. Jennifer Widom",
            signer_title="Dean of Stanford Engineering",
            public_key_pem="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAstanford...\n-----END PUBLIC KEY-----",
            created_at="2026-07-20T00:00:00Z",
            updated_at="2026-07-20T00:00:00Z",
        )
        partner_dl = PartnerModel(
            id="partner-deeplearning-ai",
            name="DeepLearning.AI",
            slug="deeplearning-ai",
            description="Empowering people to build an AI-powered future through world-class education.",
            logo_url="https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
            banner_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
            website_url="https://www.deeplearning.ai",
            allowed_domains=["deeplearning.ai"],
            signature_image_url="https://example.com/signatures/andrew_ng.png",
            signer_name="Andrew Ng",
            signer_title="Founder, DeepLearning.AI",
            public_key_pem="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAdeeplearning...\n-----END PUBLIC KEY-----",
            created_at="2026-07-20T00:00:00Z",
            updated_at="2026-07-20T00:00:00Z",
        )
        partner_gcp = PartnerModel(
            id="partner-google-cloud",
            name="Google Cloud",
            slug="google-cloud",
            description="Build your cloud skills with Google Cloud training and certifications.",
            logo_url="https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg",
            banner_url="https://images.unsplash.com/photo-1573164713988-8665fc963095",
            website_url="https://cloud.google.com/training",
            allowed_domains=["cloud.google.com", "google.com"],
            signature_image_url="https://example.com/signatures/google_cloud_vp.png",
            signer_name="Thomas Kurian",
            signer_title="CEO, Google Cloud",
            public_key_pem="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAgooglecloud...\n-----END PUBLIC KEY-----",
            created_at="2026-07-20T00:00:00Z",
            updated_at="2026-07-20T00:00:00Z",
        )
        await session.merge(partner_stanford)
        await session.merge(partner_dl)
        await session.merge(partner_gcp)

        # Seed Valid Enterprise Licenses
        lic1 = EnterpriseLicenseModel(
            key="ENT-DEMO-2026-X99",
            partner_name="DeepLearning.AI Partner Program",
            total_seats=500,
            used_seats=1,
            is_active=True,
        )
        lic2 = EnterpriseLicenseModel(
            key="ENT-UNI-HCMUT-2026",
            partner_name="Trường Đại học Bách Khoa TP.HCM",
            total_seats=1000,
            used_seats=1,
            is_active=True,
        )
        lic3 = EnterpriseLicenseModel(
            key="ENT-TECH-FPT-2026",
            partner_name="FPT Software Enterprise Academy",
            total_seats=250,
            used_seats=0,
            is_active=True,
        )
        await session.merge(lic1)
        await session.merge(lic2)
        await session.merge(lic3)

        # Seed Demo Users for ALL 5 Roles (Password for all accounts: 123456)
        default_pw_hash = hash_password("123456")

        learner_user1 = UserModel(
            id="user_learner_demo",
            email="learner@coursera.ai",
            full_name="Nguyễn Văn A",
            role=UserRole.LEARNER,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=learner@coursera.ai",
            enterprise_seat_key="ENT-DEMO-2026-X99",
            password_hash=default_pw_hash,
            is_identity_verified=False,
        )

        learner_user2 = UserModel(
            id="user_learner_02",
            email="learner2@coursera.ai",
            full_name="Trần Thu Hà",
            role=UserRole.LEARNER,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=learner2@coursera.ai",
            enterprise_seat_key="ENT-UNI-HCMUT-2026",
            password_hash=default_pw_hash,
            is_identity_verified=True,
        )

        learner_user3 = UserModel(
            id="user_learner_03",
            email="learner3@coursera.ai",
            full_name="Phạm Quốc Bảo",
            role=UserRole.LEARNER,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=learner3@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
            is_identity_verified=False,
        )

        instructor_user = UserModel(
            id="user_instructor_01",
            email="instructor@coursera.ai",
            full_name="Prof. Andrew Ng",
            role=UserRole.INSTRUCTOR,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=instructor@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
            title="Founder, DeepLearning.AI & Adjunct Professor, Stanford University",
            signature_image_url="https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
        )

        ta_user = UserModel(
            id="user_ta_01",
            email="ta@coursera.ai",
            full_name="ThS. Nguyễn Hoàng Nam",
            role=UserRole.INSTRUCTOR,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=ta@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
        )

        admin_user = UserModel(
            id="user_admin_01",
            email="admin@coursera.ai",
            full_name="Platform Admin",
            role=UserRole.ADMIN,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=admin@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
        )

        partner_user = UserModel(
            id="user_partner_01",
            email="partner@coursera.ai",
            full_name="Stanford Organization Admin",
            role=UserRole.INSTRUCTOR,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=partner@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
        )

        org_internal = OrganizationModel(
            id="org_system_internal",
            name="System Internal Organization",
            slug="system-internal",
            avatar_url="",
        )
        org_stanford = OrganizationModel(
            id="partner_stanford",
            name="Stanford University",
            slug="stanford",
            avatar_url="https://upload.wikimedia.org/wikipedia/commons/4/4b/Stanford_Cardinal_logo.svg",
        )
        org_community = OrganizationModel(
            id="partner_community",
            name="Coursera Project Network",
            slug="coursera-project-network",
            avatar_url="",
        )

        org_member_admin = OrganizationMemberModel(
            id="member_admin_01",
            user_id="user_admin_01",
            organization_id="partner_community",
            role_id="OWNER",
            status="ACTIVE",
        )
        org_member_partner = OrganizationMemberModel(
            id="member_partner_01",
            user_id="user_partner_01",
            organization_id="partner_stanford",
            role_id="OWNER",
            status="ACTIVE",
        )
        org_member_instructor = OrganizationMemberModel(
            id="member_instructor_01",
            user_id="user_instructor_01",
            organization_id="partner_stanford",
            role_id="INSTRUCTOR",
            status="ACTIVE",
        )
        org_member_ta = OrganizationMemberModel(
            id="member_ta_01",
            user_id="user_ta_01",
            organization_id="partner_stanford",
            role_id="INSTRUCTOR",
            status="ACTIVE",
        )

        team_user_phong = UserModel(
            id="user_team_phong",
            email="n22dccn158@student.ptithcm.edu.vn",
            full_name="Nguyễn Thanh Phong",
            role=UserRole.LEARNER,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=n22dccn158",
            enterprise_seat_key="ENT-DEMO-2026-X99",
            password_hash=default_pw_hash,
            is_identity_verified=False,
        )

        team_user_instructor = UserModel(
            id="user_team_instructor",
            email="phongnguyen.30604@gmail.com",
            full_name="Phong Nguyễn",
            role=UserRole.INSTRUCTOR,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=phongnguyen30604",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
            is_identity_verified=True,
        )

        team_user_admin = UserModel(
            id="user_team_admin",
            email="ttxmath1110@gmail.com",
            full_name="Thanh Phong Nguyễn",
            role=UserRole.ADMIN,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=ttxmath1110",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
            is_identity_verified=True,
        )

        await session.merge(learner_user1)
        await session.merge(learner_user2)
        await session.merge(learner_user3)
        await session.merge(team_user_phong)
        await session.merge(team_user_instructor)
        await session.merge(team_user_admin)
        await session.merge(instructor_user)
        await session.merge(ta_user)
        await session.merge(admin_user)
        await session.merge(partner_user)
        await session.merge(org_internal)
        await session.merge(org_stanford)
        await session.merge(org_community)
        await session.merge(org_member_admin)
        await session.merge(org_member_partner)
        await session.merge(org_member_instructor)
        await session.merge(org_member_ta)

        # Seed Learning Progress & Deadlines
        prog1 = LearningProgressModel(
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
        )
        prog2 = LearningProgressModel(
            id="user_learner_demo:course-web-dev",
            user_id="user_learner_demo",
            course_id="course-web-dev",
            overall_progress_percent=50.0,
            completed_item_ids=["item-web-video-1", "item-web-reading-1"],
        )
        prog3 = LearningProgressModel(
            id="user_learner_demo:course-deep-learning",
            user_id="user_learner_demo",
            course_id="course-deep-learning",
            overall_progress_percent=33.3,
            completed_item_ids=["item-dl-video-1"],
        )
        prog_team1 = LearningProgressModel(
            id="user_team_phong:course-python-ai",
            user_id="user_team_phong",
            course_id="course-python-ai",
            overall_progress_percent=71.4,
            completed_item_ids=[
                "item-ml-intro-video",
                "item-ml-reading-1",
                "item-ml-quiz-1",
                "item-ml-lab-1",
                "item-ml-peer-1",
            ],
        )
        prog_team2 = LearningProgressModel(
            id="user_team_phong:course-web-dev",
            user_id="user_team_phong",
            course_id="course-web-dev",
            overall_progress_percent=50.0,
            completed_item_ids=["item-web-video-1", "item-web-reading-1"],
        )
        prog_team3 = LearningProgressModel(
            id="user_team_phong:course-deep-learning",
            user_id="user_team_phong",
            course_id="course-deep-learning",
            overall_progress_percent=33.3,
            completed_item_ids=["item-dl-video-1"],
        )
        await session.merge(prog1)
        await session.merge(prog2)
        await session.merge(prog3)
        await session.merge(prog_team1)
        await session.merge(prog_team2)
        await session.merge(prog_team3)

        deadline1 = WeeklyDeadlineModel(
            id=1,
            progress_id="user_learner_demo:course-python-ai",
            week_number=1,
            due_date="2026-07-20T23:59:59Z",
            status=DeadlineStatus.COMPLETED,
        )
        deadline2 = WeeklyDeadlineModel(
            id=2,
            progress_id="user_learner_demo:course-python-ai",
            week_number=2,
            due_date="2026-07-27T23:59:59Z",
            status=DeadlineStatus.ON_TRACK,
        )
        await session.merge(deadline1)
        await session.merge(deadline2)

        # Seed Personal Notes
        note1 = PersonalNoteModel(
            id="note-demo-01",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            item_id="item-ml-intro-video",
            highlighted_text="Mean Squared Error (MSE)",
            note_comment="Formula: J(w,b) = (1/2m) * sum((h(x) - y)^2). Standard loss function for regression.",
            created_at="2026-07-22T09:15:00Z",
        )
        note2 = PersonalNoteModel(
            id="note-demo-02",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            item_id="item-ml-reading-1",
            highlighted_text="Learning Rate (alpha)",
            note_comment="If alpha is too large, gradient descent may fail to converge or even diverge.",
            created_at="2026-07-22T09:40:00Z",
        )
        await session.merge(note1)
        await session.merge(note2)

        # Seed Assessment Submissions & Appeals
        honor1 = HonorCodeModel(
            id="user_learner_demo:item-ml-quiz-1",
            user_id="user_learner_demo",
            item_id="item-ml-quiz-1",
            is_agreed=True,
            agreed_at="2026-07-22T09:00:00Z",
        )
        await session.merge(honor1)

        qsub1 = QuizSubmissionModel(
            id="quiz_sub_demo_01",
            user_id="user_learner_demo",
            item_id="item-ml-quiz-1",
            selected_option_indexes=[1, 0, 2],
            score_percent=100.0,
            passed=True,
            attempt_number=1,
            created_at="2026-07-22T09:30:00Z",
        )
        await session.merge(qsub1)

        lsub1 = LabSubmissionModel(
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
        await session.merge(lsub1)

        psub1 = PeerAssignmentSubmissionModel(
            id="peer_sub_demo_01",
            user_id="user_learner_demo",
            item_id="item-ml-peer-1",
            submission_url="https://github.com/learner-demo/housing-price-regression",
            text_content="Supervised ML model architecture design for housing price prediction.",
            created_at="2026-07-22T10:30:00Z",
        )
        await session.merge(psub1)

        preview1 = PeerReviewModel(
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
        )
        preview2 = PeerReviewModel(
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
        )
        await session.merge(preview1)
        await session.merge(preview2)

        appeal1 = GradeAppealModel(
            id="appeal_demo_01",
            user_id="user_learner_03",
            submission_id="peer_sub_demo_01",
            appeal_reason="The reviewer marked point deduction for missing documentation, but inline comments were included in code blocks.",
            status="PENDING",
            created_at="2026-07-22T14:00:00Z",
        )
        await session.merge(appeal1)

        # Seed Verified Certificates
        demo_cert1 = CertificateModel(
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
        )
        demo_cert2 = CertificateModel(
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
        )
        await session.merge(demo_cert1)
        await session.merge(demo_cert2)

        # Seed Financial Aid Applications
        faid1 = FinancialAidModel(
            id="faid_seed_01",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            essay_150_words=(
                "Kính gửi Ban Giảng viên và Quản trị viên khóa học, Em hiện là sinh viên chuyên ngành Công nghệ thông tin đang rất khao khát tiếp cận tri thức chuyên sâu về Lập trình Python và AI Agent. Tuy nhiên do hoàn cảnh gia đình thuộc diện khó khăn và chưa có thu nhập độc lập, em chưa có khả năng chi trả học phí đầy đủ cho chứng chỉ khóa học. Em cam kết sẽ học tập nghiêm túc 100% thời lượng, hoàn thành đầy đủ các bài tập thực hành, bài thi Graded Quiz và bài nộp chấm chéo Peer Review đúng hạn. Kiến thức từ khóa học này sẽ là nền tảng quan trọng giúp em chuẩn bị cho đồ án tốt nghiệp và ứng tuyển vị trí thực tập sinh AI Engineer trong tương lai. Em rất mong nhận được sự hỗ trợ tài chính từ nhà trường để tiếp tục con đường học vấn của mình. Em chân thành cảm ơn!"
            ),
            status="PENDING",
            review_deadline_days_left=15,
        )
        faid2 = FinancialAidModel(
            id="faid_seed_02",
            user_id="user_learner_02",
            course_id="course-web-dev",
            essay_150_words=(
                "Kính gửi Ban Xét duyệt Hỗ trợ Tài chính, Tôi hiện là học viên tự học mong muốn chuyển hướng nghề nghiệp sang lĩnh vực Lập trình Web Fullstack với Next.js và ConnectRPC. Hiện tại mức thu nhập nhập môn còn hạn chế nên việc nâng cấp tài khoản có chứng chỉ xác minh là một thử thách tài chính lớn đối với tôi."
            ),
            status="APPROVED",
            review_deadline_days_left=0,
        )
        faid3 = FinancialAidModel(
            id="faid_seed_03",
            user_id="user_learner_03",
            course_id="course-deep-learning",
            essay_150_words=(
                "Em muốn xin học bổng để học khóa Deep Learning nhằm phát triển các dự án cá nhân."
            ),
            status="REJECTED",
            review_deadline_days_left=0,
        )
        await session.merge(faid1)
        await session.merge(faid2)
        await session.merge(faid3)

        # Seed Forum Sample Threads, Replies & Votes
        thread1 = ForumThreadORM(
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
        )
        reply1_1 = ForumReplyORM(
            id="reply-ml-01-1",
            thread_id="thread-ml-01",
            author_name="ThS. Nguyễn Hoàng Nam",
            author_role="USER_ROLE_INSTRUCTOR",
            author_user_id="user_ta_01",
            content="Chào bạn Trí! Bạn nên thử các giá trị theo quy tắc lũy thừa của 10 như 0.001, 0.01, 0.1 và vẽ đồ thị Cost Function theo từng Iteration. Nếu Cost Function tăng dần nghĩa là Alpha quá lớn!",
            is_staff_answer=True,
            upvote_count=12,
            created_at="2026-07-22T10:30:00Z",
        )
        reply1_2 = ForumReplyORM(
            id="reply-ml-01-2",
            thread_id="thread-ml-01",
            author_name="Trần Thu Hà",
            author_role="USER_ROLE_LEARNER",
            author_user_id="user_learner_02",
            content="Cảm ơn thầy Nam, em cũng thử vẽ plot J(theta) theo lời khuyên của thầy và thấy học rất nhanh!",
            is_staff_answer=False,
            upvote_count=3,
            created_at="2026-07-22T10:30:00Z",
        )

        thread2 = ForumThreadORM(
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
        )
        reply2_1 = ForumReplyORM(
            id="reply-web-01-1",
            thread_id="thread-web-01",
            author_name="ThS. Nguyễn Hoàng Nam",
            author_role="USER_ROLE_INSTRUCTOR",
            author_user_id="user_ta_01",
            content="ConnectRPC sinh mã nguồn Type-Safe stubs tự động cho cả Frontend lẫn Backend từ tệp .proto, giúp hạn chế lỗi runtime gõ sai tên trường API và tối ưu tốc độ nhờ Protobuf binary serialization!",
            is_staff_answer=True,
            upvote_count=9,
            created_at="2026-07-22T12:45:00Z",
        )

        thread3 = ForumThreadORM(
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
        )

        await session.merge(thread1)
        await session.merge(reply1_1)
        await session.merge(reply1_2)
        await session.merge(thread2)
        await session.merge(reply2_1)
        await session.merge(thread3)

        await session.execute(delete(ForumVoteORM))

        vote1 = ForumVoteORM(
            id="vote-01",
            user_id="user_learner_demo",
            post_id="thread-ml-01",
            created_at="2026-07-22T10:16:00Z",
        )
        vote2 = ForumVoteORM(
            id="vote-02",
            user_id="user_learner_demo",
            post_id="reply-ml-01-1",
            created_at="2026-07-22T10:31:00Z",
        )
        vote3 = ForumVoteORM(
            id="vote-03",
            user_id="user_learner_02",
            post_id="thread-web-01",
            created_at="2026-07-22T12:05:00Z",
        )
        await session.merge(vote1)
        await session.merge(vote2)
        await session.merge(vote3)

        rev1 = CourseReviewModel(
            id="rev-demo-01",
            user_id="user_learner_demo",
            user_name="Nguyễn Văn A",
            course_id="course-python-ai",
            rating_stars=5,
            comment_text="Khóa học cực kỳ chất lượng! Thầy Andrew Ng giảng rất dễ hiểu và chi tiết.",
            created_at="2026-07-22T14:30:00Z",
        )
        rev2 = CourseReviewModel(
            id="rev-demo-02",
            user_id="user_learner_02",
            user_name="Trần Thị B",
            course_id="course-python-ai",
            rating_stars=5,
            comment_text="Bài tập lập trình trên Jupyter notebook chuẩn thực tế, giao diện dễ dùng.",
            created_at="2026-07-23T09:15:00Z",
        )
        rev3 = CourseReviewModel(
            id="rev-demo-03",
            user_id="user_learner_03",
            user_name="Lê Hoàng C",
            course_id="course-deep-learning",
            rating_stars=4,
            comment_text="Nội dung chuyên sâu về Deep Learning và PyTorch. Rất đáng học!",
            created_at="2026-07-23T11:45:00Z",
        )
        await session.merge(rev1)
        await session.merge(rev2)
        await session.merge(rev3)

        # Seed Question Bank & Quiz Matrix for Dynamic Quiz Sessions
        qb_ml = QuestionBankModel(
            id="qb-ml-01",
            course_id="course-python-ai",
            title="Ngân hàng câu hỏi Máy học cơ bản (ML Fundamentals)",
            category="PRACTICE",
            description="Tập hợp câu hỏi trắc nghiệm lý thuyết và bài tập Máy học cơ bản.",
            created_at="2026-07-25T12:00:00Z",
        )
        await session.merge(qb_ml)

        # Question 1 (EASY)
        q1 = QuestionModel(
            id="q-ml-01",
            bank_id="qb-ml-01",
            question_type="SINGLE_CHOICE",
            difficulty="EASY",
            text="Thuật toán nào dưới đây thuộc nhóm Học có giám sát (Supervised Learning)?",
            explanation="Hồi quy tuyến tính (Linear Regression) yêu cầu nhãn dữ liệu đầu ra (Target label) để huấn luyện.",
            created_at="2026-07-25T12:05:00Z",
        )
        await session.merge(q1)
        opt1_1 = QuestionOptionModel(
            id="opt-q1-1",
            question_id="q-ml-01",
            option_text="Hồi quy tuyến tính (Linear Regression)",
            is_correct=True,
            order_index=0,
        )
        opt1_2 = QuestionOptionModel(
            id="opt-q1-2",
            question_id="q-ml-01",
            option_text="Phân cụm K-Means",
            is_correct=False,
            order_index=1,
        )
        opt1_3 = QuestionOptionModel(
            id="opt-q1-3",
            question_id="q-ml-01",
            option_text="Phân tích thành phần chính (PCA)",
            is_correct=False,
            order_index=2,
        )
        opt1_4 = QuestionOptionModel(
            id="opt-q1-4",
            question_id="q-ml-01",
            option_text="Thuật toán DBSCAN",
            is_correct=False,
            order_index=3,
        )
        await session.merge(opt1_1)
        await session.merge(opt1_2)
        await session.merge(opt1_3)
        await session.merge(opt1_4)

        # Question 2 (EASY)
        q2 = QuestionModel(
            id="q-ml-02",
            bank_id="qb-ml-01",
            question_type="SINGLE_CHOICE",
            difficulty="EASY",
            text="Hàm mất mát phổ biến nhất được dùng cho bài toán Hồi quy tuyến tính là gì?",
            explanation="Mean Squared Error (MSE - Sai số bình phương trung bình) đo lường khoảng cách giữa dự đoán và thực tế.",
            created_at="2026-07-25T12:10:00Z",
        )
        await session.merge(q2)
        opt2_1 = QuestionOptionModel(
            id="opt-q2-1",
            question_id="q-ml-02",
            option_text="Mean Squared Error (MSE)",
            is_correct=True,
            order_index=0,
        )
        opt2_2 = QuestionOptionModel(
            id="opt-q2-2",
            question_id="q-ml-02",
            option_text="Cross-Entropy Loss",
            is_correct=False,
            order_index=1,
        )
        opt2_3 = QuestionOptionModel(
            id="opt-q2-3",
            question_id="q-ml-02",
            option_text="Hinge Loss",
            is_correct=False,
            order_index=2,
        )
        opt2_4 = QuestionOptionModel(
            id="opt-q2-4",
            question_id="q-ml-02",
            option_text="Binary Cross-Entropy",
            is_correct=False,
            order_index=3,
        )
        await session.merge(opt2_1)
        await session.merge(opt2_2)
        await session.merge(opt2_3)
        await session.merge(opt2_4)

        # Question 3 (MEDIUM)
        q3 = QuestionModel(
            id="q-ml-03",
            bank_id="qb-ml-01",
            question_type="SINGLE_CHOICE",
            difficulty="MEDIUM",
            text="Phương pháp nào được dùng để tránh hiện tượng Overfitting trong mô hình Deep Learning?",
            explanation="Dropout và L2 Regularization giúp giảm bớt sự phụ thuộc quá mức vào các trọng số cụ thể.",
            created_at="2026-07-25T12:15:00Z",
        )
        await session.merge(q3)
        opt3_1 = QuestionOptionModel(
            id="opt-q3-1",
            question_id="q-ml-03",
            option_text="Kỹ thuật Dropout & L2 Regularization",
            is_correct=True,
            order_index=0,
        )
        opt3_2 = QuestionOptionModel(
            id="opt-q3-2",
            question_id="q-ml-03",
            option_text="Tăng tốc độ học (Learning Rate) quá lớn",
            is_correct=False,
            order_index=1,
        )
        opt3_3 = QuestionOptionModel(
            id="opt-q3-3",
            question_id="q-ml-03",
            option_text="Xóa tập dữ liệu Validation",
            is_correct=False,
            order_index=2,
        )
        opt3_4 = QuestionOptionModel(
            id="opt-q3-4",
            question_id="q-ml-03",
            option_text="Bỏ qua hàm kích hoạt (Activation Function)",
            is_correct=False,
            order_index=3,
        )
        await session.merge(opt3_1)
        await session.merge(opt3_2)
        await session.merge(opt3_3)
        await session.merge(opt3_4)

        # Question 4 (MEDIUM)
        q4 = QuestionModel(
            id="q-ml-04",
            bank_id="qb-ml-01",
            question_type="SINGLE_CHOICE",
            difficulty="MEDIUM",
            text="Mạng Nơ-ron Nhân tạo (ANN) sử dụng thuật toán nào để cập nhật trọng số theo độ dốc đạo hàm?",
            explanation="Backpropagation (Lan truyền ngược) tính toán gradient của hàm mất mát theo từng trọng số trong mạng.",
            created_at="2026-07-25T12:20:00Z",
        )
        await session.merge(q4)
        opt4_1 = QuestionOptionModel(
            id="opt-q4-1",
            question_id="q-ml-04",
            option_text="Backpropagation (Lan truyền ngược)",
            is_correct=True,
            order_index=0,
        )
        opt4_2 = QuestionOptionModel(
            id="opt-q4-2",
            question_id="q-ml-04",
            option_text="Forward Propagation",
            is_correct=False,
            order_index=1,
        )
        opt4_3 = QuestionOptionModel(
            id="opt-q4-3",
            question_id="q-ml-04",
            option_text="K-Fold Cross Validation",
            is_correct=False,
            order_index=2,
        )
        opt4_4 = QuestionOptionModel(
            id="opt-q4-4",
            question_id="q-ml-04",
            option_text="Principal Component Analysis",
            is_correct=False,
            order_index=3,
        )
        await session.merge(opt4_1)
        await session.merge(opt4_2)
        await session.merge(opt4_3)
        await session.merge(opt4_4)

        # Question 5 (HARD)
        q5 = QuestionModel(
            id="q-ml-05",
            bank_id="qb-ml-01",
            question_type="SINGLE_CHOICE",
            difficulty="HARD",
            text="Đánh giá hiệu năng mô hình Phân loại (Classification) với dữ liệu mất cân bằng (Imbalanced Data) nên ưu tiên chỉ số nào?",
            explanation="F1-Score (dung hòa Precision & Recall) và AUC-ROC đánh giá chính xác hơn chỉ số Accuracy khi dữ liệu lệch nặng.",
            created_at="2026-07-25T12:25:00Z",
        )
        await session.merge(q5)
        opt5_1 = QuestionOptionModel(
            id="opt-q5-1",
            question_id="q-ml-05",
            option_text="F1-Score & AUC-ROC",
            is_correct=True,
            order_index=0,
        )
        opt5_2 = QuestionOptionModel(
            id="opt-q5-2",
            question_id="q-ml-05",
            option_text="Accuracy (Tỷ lệ chính xác tổng thể)",
            is_correct=False,
            order_index=1,
        )
        opt5_3 = QuestionOptionModel(
            id="opt-q5-3",
            question_id="q-ml-05",
            option_text="Hệ số R-Squared",
            is_correct=False,
            order_index=2,
        )
        opt5_4 = QuestionOptionModel(
            id="opt-q5-4",
            question_id="q-ml-05",
            option_text="Mean Absolute Error (MAE)",
            is_correct=False,
            order_index=3,
        )
        await session.merge(opt5_1)
        await session.merge(opt5_2)
        await session.merge(opt5_3)
        await session.merge(opt5_4)

        # Seed Quiz Matrix Models for Course 1
        qm_ml = QuizMatrixModel(
            item_id="item-ml-quiz-1",
            bank_id="qb-ml-01",
            time_limit_minutes=30,
            passing_threshold_percent=80.0,
            easy_count=2,
            medium_count=2,
            hard_count=1,
            shuffle_options=True,
        )
        qm_practice = QuizMatrixModel(
            item_id="item-ml-practice-1",
            bank_id="qb-ml-01",
            time_limit_minutes=15,
            passing_threshold_percent=60.0,
            easy_count=2,
            medium_count=1,
            hard_count=0,
            shuffle_options=True,
        )
        qm_ml2 = QuizMatrixModel(
            item_id="item-ml-quiz-2",
            bank_id="qb-ml-01",
            time_limit_minutes=45,
            passing_threshold_percent=80.0,
            easy_count=2,
            medium_count=2,
            hard_count=1,
            shuffle_options=True,
        )
        await session.merge(qm_ml)
        await session.merge(qm_practice)
        await session.merge(qm_ml2)

        # Question Bank & Questions for Course 2 (Web Dev)
        qb_web = QuestionBankModel(
            id="qb-web-01",
            course_id="course-web-dev",
            title="Ngân hàng câu hỏi Lập trình Web Fullstack Next.js & ConnectRPC",
            category="GRADED",
            description="Tập hợp câu hỏi trắc nghiệm kiến trúc Next.js App Router, RSC, Tailwind v4 và ConnectRPC.",
            created_at="2026-07-25T13:00:00Z",
        )
        await session.merge(qb_web)

        q_w1 = QuestionModel(
            id="q-web-01",
            bank_id="qb-web-01",
            question_type="SINGLE_CHOICE",
            difficulty="EASY",
            text="Ưu điểm vượt trội nhất của React Server Components (RSC) trong Next.js là gì?",
            explanation="RSC render trực tiếp trên máy chủ và không gửi mã JavaScript bundle thừa về trình duyệt của người dùng.",
            created_at="2026-07-25T13:05:00Z",
        )
        await session.merge(q_w1)
        await session.merge(
            QuestionOptionModel(
                id="opt-qw1-1",
                question_id="q-web-01",
                option_text="Giảm kích thước JavaScript bundle gửi xuống client về 0",
                is_correct=True,
                order_index=0,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw1-2",
                question_id="q-web-01",
                option_text="Bắt buộc mọi component phải dùng useState",
                is_correct=False,
                order_index=1,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw1-3",
                question_id="q-web-01",
                option_text="Chỉ chạy được trên trình duyệt Chrome",
                is_correct=False,
                order_index=2,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw1-4",
                question_id="q-web-01",
                option_text="Thay thế hoàn toàn cơ sở dữ liệu SQL",
                is_correct=False,
                order_index=3,
            )
        )

        q_w2 = QuestionModel(
            id="q-web-02",
            bank_id="qb-web-01",
            question_type="SINGLE_CHOICE",
            difficulty="EASY",
            text="Giao thức ConnectRPC sử dụng định dạng schema nào để đảm bảo type-safety hai đầu Frontend - Backend?",
            explanation="ConnectRPC dùng Protocol Buffers (.proto) để tự động sinh ra client stubs type-safe cho TypeScript và Python.",
            created_at="2026-07-25T13:10:00Z",
        )
        await session.merge(q_w2)
        await session.merge(
            QuestionOptionModel(
                id="opt-qw2-1",
                question_id="q-web-02",
                option_text="Protocol Buffers (Protobuf v3)",
                is_correct=True,
                order_index=0,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw2-2",
                question_id="q-web-02",
                option_text="XML DTD Schema",
                is_correct=False,
                order_index=1,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw2-3",
                question_id="q-web-02",
                option_text="Raw CSV Tables",
                is_correct=False,
                order_index=2,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw2-4",
                question_id="q-web-02",
                option_text="HTML5 Web Forms",
                is_correct=False,
                order_index=3,
            )
        )

        q_w3 = QuestionModel(
            id="q-web-03",
            bank_id="qb-web-01",
            question_type="SINGLE_CHOICE",
            difficulty="MEDIUM",
            text="Trong Domain-Driven Design (DDD), tầng nào trực tiếp chứa nghiệp vụ cốt lõi không phụ thuộc framework?",
            explanation="Tầng Domain Entity chứa các quy tắc nghiệp vụ bất biến, độc lập hoàn toàn với framework và database.",
            created_at="2026-07-25T13:15:00Z",
        )
        await session.merge(q_w3)
        await session.merge(
            QuestionOptionModel(
                id="opt-qw3-1",
                question_id="q-web-03",
                option_text="Domain Layer (Thực thể & Luật nghiệp vụ cốt lõi)",
                is_correct=True,
                order_index=0,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw3-2",
                question_id="q-web-03",
                option_text="Infrastructure Layer (SQL queries)",
                is_correct=False,
                order_index=1,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw3-3",
                question_id="q-web-03",
                option_text="Presentation Layer (React components)",
                is_correct=False,
                order_index=2,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw3-4",
                question_id="q-web-03",
                option_text="Docker Compose config",
                is_correct=False,
                order_index=3,
            )
        )

        q_w4 = QuestionModel(
            id="q-web-04",
            bank_id="qb-web-01",
            question_type="SINGLE_CHOICE",
            difficulty="MEDIUM",
            text="Lợi ích chính của việc sử dụng TanStack Query (React Query) trong ứng dụng Single Page là gì?",
            explanation="React Query tự động quản lý bộ nhớ đệm, deduplication requests và đồng bộ trạng thái ngầm khi tab active.",
            created_at="2026-07-25T13:20:00Z",
        )
        await session.merge(q_w4)
        await session.merge(
            QuestionOptionModel(
                id="opt-qw4-1",
                question_id="q-web-04",
                option_text="Tự động quản lý Cache, Refetch ngầm và Optimistic UI",
                is_correct=True,
                order_index=0,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw4-2",
                question_id="q-web-04",
                option_text="Biên dịch mã nguồn sang WebAssembly",
                is_correct=False,
                order_index=1,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw4-3",
                question_id="q-web-04",
                option_text="Tự động mã hóa HTTPS cho server",
                is_correct=False,
                order_index=2,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw4-4",
                question_id="q-web-04",
                option_text="Thay thế hoàn toàn Tailwind CSS",
                is_correct=False,
                order_index=3,
            )
        )

        q_w5 = QuestionModel(
            id="q-web-05",
            bank_id="qb-web-01",
            question_type="SINGLE_CHOICE",
            difficulty="HARD",
            text="Khi giải mã JWT Token trên Edge Runtime (Next.js Middleware), phương pháp nào an toàn và không gây lỗi crash?",
            explanation="Edge Runtime không hỗ trợ thư viện Node.js Buffer, bắt buộc phải dùng Web Standard atob + TextDecoder.",
            created_at="2026-07-25T13:25:00Z",
        )
        await session.merge(q_w5)
        await session.merge(
            QuestionOptionModel(
                id="opt-qw5-1",
                question_id="q-web-05",
                option_text="Sử dụng Web Standard atob và TextDecoder UTF-8",
                is_correct=True,
                order_index=0,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw5-2",
                question_id="q-web-05",
                option_text="Import thư viện Node.js Buffer.from",
                is_correct=False,
                order_index=1,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw5-3",
                question_id="q-web-05",
                option_text="Lưu private key trực tiếp vào LocalStorage",
                is_correct=False,
                order_index=2,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qw5-4",
                question_id="q-web-05",
                option_text="Tắt hoàn toàn cơ chế xác thực JWT",
                is_correct=False,
                order_index=3,
            )
        )

        qm_web = QuizMatrixModel(
            item_id="item-web-quiz-1",
            bank_id="qb-web-01",
            time_limit_minutes=25,
            passing_threshold_percent=80.0,
            easy_count=2,
            medium_count=2,
            hard_count=1,
            shuffle_options=True,
        )
        await session.merge(qm_web)

        # Question Bank & Questions for Course 3 (Deep Learning)
        qb_dl = QuestionBankModel(
            id="qb-dl-01",
            course_id="course-deep-learning",
            title="Ngân hàng câu hỏi Deep Learning & Mạng Nơ-ron Sâu",
            category="GRADED",
            description="Tập hợp câu hỏi trắc nghiệm kiến thức Vectorization, He Initialization, Vanishing Gradient và Backpropagation.",
            created_at="2026-07-25T14:00:00Z",
        )
        await session.merge(qb_dl)

        q_d1 = QuestionModel(
            id="q-dl-01",
            bank_id="qb-dl-01",
            question_type="SINGLE_CHOICE",
            difficulty="EASY",
            text="Hàm kích hoạt nào được ưu tiên hàng đầu để khắc phục hiện tượng Triệt tiêu Đạo hàm (Vanishing Gradient) trong Deep Learning?",
            explanation="ReLU (Rectified Linear Unit) có đạo hàm bằng 1 khi x > 0, giúp dòng đạo hàm truyền nguyên vẹn qua hàng chục tầng ẩn.",
            created_at="2026-07-25T14:05:00Z",
        )
        await session.merge(q_d1)
        await session.merge(
            QuestionOptionModel(
                id="opt-qd1-1",
                question_id="q-dl-01",
                option_text="ReLU (Rectified Linear Unit)",
                is_correct=True,
                order_index=0,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd1-2",
                question_id="q-dl-01",
                option_text="Sigmoid",
                is_correct=False,
                order_index=1,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd1-3",
                question_id="q-dl-01",
                option_text="Tanh",
                is_correct=False,
                order_index=2,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd1-4",
                question_id="q-dl-01",
                option_text="Step Function",
                is_correct=False,
                order_index=3,
            )
        )

        q_d2 = QuestionModel(
            id="q-dl-02",
            bank_id="qb-dl-01",
            question_type="SINGLE_CHOICE",
            difficulty="EASY",
            text="Lợi ích cốt lõi của kỹ thuật Vectorization trong lập trình Deep Learning là gì?",
            explanation="Vectorization tận dụng các tập lệnh song song SIMD trên CPU/GPU để tính toán ma trận nhanh hơn hàng trăm lần so với vòng lặp.",
            created_at="2026-07-25T14:10:00Z",
        )
        await session.merge(q_d2)
        await session.merge(
            QuestionOptionModel(
                id="opt-qd2-1",
                question_id="q-dl-02",
                option_text="Tận dụng tính toán song song phần cứng (SIMD/GPU) với tốc độ vượt trội",
                is_correct=True,
                order_index=0,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd2-2",
                question_id="q-dl-02",
                option_text="Tự động sửa lỗi cú pháp Python",
                is_correct=False,
                order_index=1,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd2-3",
                question_id="q-dl-02",
                option_text="Giảm độ sâu của mạng nơ-ron về 1 tầng",
                is_correct=False,
                order_index=2,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd2-4",
                question_id="q-dl-02",
                option_text="Không cần dữ liệu đầu vào",
                is_correct=False,
                order_index=3,
            )
        )

        q_d3 = QuestionModel(
            id="q-dl-03",
            bank_id="qb-dl-01",
            question_type="SINGLE_CHOICE",
            difficulty="MEDIUM",
            text="Khi sử dụng hàm kích hoạt ReLU, kỹ thuật khởi tạo trọng số nào được khuyến nghị tốt nhất?",
            explanation="He Initialization (khởi tạo He/Kaiming) với phương sai 2/n_in được thiết kế đặc thù cho các tầng phi tuyến ReLU.",
            created_at="2026-07-25T14:15:00Z",
        )
        await session.merge(q_d3)
        await session.merge(
            QuestionOptionModel(
                id="opt-qd3-1",
                question_id="q-dl-03",
                option_text="He Initialization (Kaiming Init)",
                is_correct=True,
                order_index=0,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd3-1a",
                question_id="q-dl-03",
                option_text="Khởi tạo tất cả trọng số bằng 0",
                is_correct=False,
                order_index=1,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd3-2",
                question_id="q-dl-03",
                option_text="Khởi tạo tất cả trọng số bằng 1",
                is_correct=False,
                order_index=2,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd3-3",
                question_id="q-dl-03",
                option_text="Random Uniform trong khoảng [-1000, 1000]",
                is_correct=False,
                order_index=3,
            )
        )

        q_d4 = QuestionModel(
            id="q-dl-04",
            bank_id="qb-dl-01",
            question_type="SINGLE_CHOICE",
            difficulty="MEDIUM",
            text="Quy tắc toán học nền tảng nào được áp dụng để tính toán Lan truyền ngược (Backpropagation)?",
            explanation="Quy tắc chuỗi (Chain Rule) trong giải tích nhiều biến cho phép tính đạo hàm riêng của hàm mất mát qua từng tầng liên tiếp.",
            created_at="2026-07-25T14:20:00Z",
        )
        await session.merge(q_d4)
        await session.merge(
            QuestionOptionModel(
                id="opt-qd4-1",
                question_id="q-dl-04",
                option_text="Quy tắc chuỗi trong giải tích đạo hàm (Chain Rule)",
                is_correct=True,
                order_index=0,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd4-2",
                question_id="q-dl-04",
                option_text="Định lý Pythagoras",
                is_correct=False,
                order_index=1,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd4-3",
                question_id="q-dl-04",
                option_text="Quy tắc L'Hopital",
                is_correct=False,
                order_index=2,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd4-4",
                question_id="q-dl-04",
                option_text="Công thức nhị thức Newton",
                is_correct=False,
                order_index=3,
            )
        )

        q_d5 = QuestionModel(
            id="q-dl-05",
            bank_id="qb-dl-01",
            question_type="SINGLE_CHOICE",
            difficulty="HARD",
            text="Mục đích chính của kỹ thuật Chuẩn hóa theo lô (Batch Normalization) trong mạng nơ-ron sâu là gì?",
            explanation="Batch Normalization ổn định phân phối đầu vào của các tầng ẩn (giảm Internal Covariate Shift), cho phép dùng Learning Rate cao hơn.",
            created_at="2026-07-25T14:25:00Z",
        )
        await session.merge(q_d5)
        await session.merge(
            QuestionOptionModel(
                id="opt-qd5-1",
                question_id="q-dl-05",
                option_text="Giảm Internal Covariate Shift, ổn định và tăng tốc quá trình huấn luyện",
                is_correct=True,
                order_index=0,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd5-2",
                question_id="q-dl-05",
                option_text="Tăng kích thước file checkpoint mô hình",
                is_correct=False,
                order_index=1,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd5-3",
                question_id="q-dl-05",
                option_text="Loại bỏ hoàn toàn bước tính đạo hàm",
                is_correct=False,
                order_index=2,
            )
        )
        await session.merge(
            QuestionOptionModel(
                id="opt-qd5-4",
                question_id="q-dl-05",
                option_text="Chỉ dùng được cho bài toán xử lý ảnh",
                is_correct=False,
                order_index=3,
            )
        )

        qm_dl = QuizMatrixModel(
            item_id="item-dl-quiz-1",
            bank_id="qb-dl-01",
            time_limit_minutes=30,
            passing_threshold_percent=80.0,
            easy_count=2,
            medium_count=2,
            hard_count=1,
            shuffle_options=True,
        )
        await session.merge(qm_dl)

        # Seed Course Announcements
        ann1 = CourseAnnouncementModel(
            id="ann-ml-01",
            course_id="course-python-ai",
            author_id="user_instructor_01",
            author_name="Prof. Andrew Ng",
            title="[Lịch học] Buổi thảo luận trực tuyến tuần 1 về Gradient Descent",
            content="Chào các bạn học viên, tuần này chúng ta sẽ có buổi Office Hours trực tuyến vào lúc 20:00 thứ Sáu để giải đáp thắc mắc về thuật toán Lan truyền ngược. Mời các bạn tham gia!",
            created_at="2026-07-25T08:00:00Z",
        )
        ann2 = CourseAnnouncementModel(
            id="ann-web-01",
            course_id="course-web-dev",
            author_id="user_team_instructor",
            author_name="Phong Nguyễn",
            title="[Cập nhật] Tài liệu thực hành Next.js 15 App Router & ConnectRPC",
            content="Kho tài liệu mã nguồn mẫu cho bài tập Lab đã được tải lên. Các bạn có thể clone repository để thực hành trực tiếp trên máy cục bộ.",
            created_at="2026-07-25T09:30:00Z",
        )
        await session.merge(ann1)
        await session.merge(ann2)

        # Seed Course Purchases & Payment Orders for My Purchases & Transactions
        pur1 = CoursePurchaseModel(
            id="pur-demo-01",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            amount=1200000.0,
            currency="VND",
            status="COMPLETED",
            payment_method="VNPAY",
            created_at="2026-07-20T10:00:00Z",
        )
        pur2 = CoursePurchaseModel(
            id="pur-demo-02",
            user_id="user_learner_demo",
            course_id="course-web-dev",
            amount=990000.0,
            currency="VND",
            status="COMPLETED",
            payment_method="VNPAY",
            created_at="2026-07-21T14:30:00Z",
        )
        await session.merge(pur1)
        await session.merge(pur2)

        order1 = PaymentOrderModel(
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
        )
        order2 = PaymentOrderModel(
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
        )
        order3 = PaymentOrderModel(
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
        )
        await session.merge(order1)
        await session.merge(order2)
        await session.merge(order3)

        # Seed In-App Notifications for Learner
        now_utc = datetime.now(UTC)
        noti1 = NotificationModel(
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
        )
        noti2 = NotificationModel(
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
        )
        noti3 = NotificationModel(
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
        )
        noti4 = NotificationModel(
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
        )
        await session.merge(noti1)
        await session.merge(noti2)
        await session.merge(noti3)
        await session.merge(noti4)

        await session.commit()
        logger.info("[SEED] Database seeding completed successfully!")


def parse_args() -> argparse.Namespace:
    """Parse command line arguments for CLI execution."""
    parser = argparse.ArgumentParser(
        description="Database Seeding Script for Coursera Clone"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Truncate existing tables before seeding for a 100%% clean reset.",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Seed clean JSON demo data from data/demo_data/ directory.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(seed_database(reset=args.reset, auto_mode=False))
