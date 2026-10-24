"""Seed data for Catalog (Categories, Courses, Specializations, Announcements, Reviews)."""

import json

from sqlalchemy.ext.asyncio import AsyncSession

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


def build_categories() -> list[CategoryModel]:
    """Construct standard subject and level categories."""
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
    """Construct domain seed data objects for the initial catalog."""
    sample_url = "https://www.youtube.com/watch?v=aircAruvnKk"
    sample_url_2 = "https://www.youtube.com/watch?v=IHZwWFHWa-w"
    sample_url_3 = "https://www.youtube.com/watch?v=rfscVS0vtbw"
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

    item1.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=120,
            question="What determines how much influence one neuron has on another in a neural network?",
            options=["Activation function", "Weights", "Bias", "Learning rate"],
            correct_option_index=1,
            explanation="Weights are the parameters that determine the strength of connection between neurons. The network learns by adjusting these weights.",
        )
    )

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
    raw_transcripts_dl1 = [
        (
            0,
            "Welcome to Deep Learning! In this course, we demystify how multi-layer deep networks extract hierarchical representations.",
        ),
        (
            90,
            "Deep learning succeeds because deeper layers learn compositional features: pixels -> edges -> shapes -> semantic objects.",
        ),
        (
            200,
            "Vectorized implementations in NumPy and PyTorch execute operations across entire batches simultaneously using SIMD / GPU acceleration.",
        ),
        (
            330,
            "Forward propagation calculates activations layer by layer: Z^[l] = W^[l] * A^[l-1] + b^[l], A^[l] = g^[l](Z^[l]).",
        ),
        (
            480,
            "Backpropagation applies the multivariate calculus chain rule to calculate dW and db efficiently from output to input.",
        ),
        (
            620,
            "Activation functions: Sigmoid and Tanh can suffer from vanishing gradients, while ReLU and Leaky ReLU maintain active propagation.",
        ),
        (
            760,
            "Weight initialization strategies (such as He and Xavier/Glorot initialization) prevent signal explosion or decay during deep passes.",
        ),
        (
            900,
            "Let us now dive into the implementation lab where you will code forward propagation from scratch in Python.",
        ),
    ]
    for ts, txt in raw_transcripts_dl1:
        item_dl1.interactive_transcripts.append(
            InteractiveTranscriptModel(timestamp_seconds=ts, text=txt)
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


async def seed_catalog_and_reviews(session: AsyncSession) -> None:
    """Seed categories, courses, specializations, announcements, and course reviews."""
    for cat in build_categories():
        await session.merge(cat)

    courses, specializations = build_sample_catalog()
    for course in courses:
        await session.merge(course)
    for spec in specializations:
        await session.merge(spec)

    reviews = [
        CourseReviewModel(
            id="rev-demo-01",
            user_id="user_learner_demo",
            user_name="Nguyễn Văn A",
            course_id="course-python-ai",
            rating_stars=5,
            comment_text="Khóa học cực kỳ chất lượng! Thầy Andrew Ng giảng rất dễ hiểu và chi tiết.",
            created_at="2026-07-22T14:30:00Z",
        ),
        CourseReviewModel(
            id="rev-demo-02",
            user_id="user_learner_02",
            user_name="Trần Thị B",
            course_id="course-python-ai",
            rating_stars=5,
            comment_text="Bài tập lập trình trên Jupyter notebook chuẩn thực tế, giao diện dễ dùng.",
            created_at="2026-07-23T09:15:00Z",
        ),
        CourseReviewModel(
            id="rev-demo-03",
            user_id="user_learner_03",
            user_name="Lê Hoàng C",
            course_id="course-deep-learning",
            rating_stars=4,
            comment_text="Nội dung chuyên sâu về Deep Learning và PyTorch. Rất đáng học!",
            created_at="2026-07-23T11:45:00Z",
        ),
    ]
    for rev in reviews:
        await session.merge(rev)

    announcements = [
        CourseAnnouncementModel(
            id="ann-ml-01",
            course_id="course-python-ai",
            author_id="user_instructor_01",
            author_name="Prof. Andrew Ng",
            title="[Lịch học] Buổi thảo luận trực tuyến tuần 1 về Gradient Descent",
            content="Chào các bạn học viên, tuần này chúng ta sẽ có buổi Office Hours trực tuyến vào lúc 20:00 thứ Sáu để giải đáp thắc mắc về thuật toán Lan truyền ngược. Mời các bạn tham gia!",
            created_at="2026-07-25T08:00:00Z",
        ),
        CourseAnnouncementModel(
            id="ann-web-01",
            course_id="course-web-dev",
            author_id="user_ta_01",
            author_name="ThS. Nguyễn Hoàng Nam",
            title="[Cập nhật] Tài liệu thực hành Next.js 15 App Router & ConnectRPC",
            content="Kho tài liệu mã nguồn mẫu cho bài tập Lab đã được tải lên. Các bạn có thể clone repository để thực hành trực tiếp trên máy cục bộ.",
            created_at="2026-07-25T09:30:00Z",
        ),
    ]
    for ann in announcements:
        await session.merge(ann)
