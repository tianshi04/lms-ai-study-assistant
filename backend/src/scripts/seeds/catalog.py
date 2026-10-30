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
        foundational_course_ids=["course-python-ai"],
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

    # =========================================================================
    # Economics Courses (NEU Business School - PGS. TS. Trần Minh Tuấn)
    # =========================================================================
    neu_logo = "https://upload.wikimedia.org/wikipedia/commons/e/e8/Logo_Truong_Dai_hoc_Kinh_te_Quoc_dan.svg"
    econ_video_1 = "https://www.youtube.com/watch?v=g9aDizJpd_s"
    econ_video_2 = "https://www.youtube.com/watch?v=HHcblIxiVU0"
    econ_video_3 = "https://www.youtube.com/watch?v=4b4MUYve_U8"
    econ_video_4 = "https://www.youtube.com/watch?v=dqxQ3E1bubI"

    course4 = CourseModel(
        id="course-microeconomics-foundations",
        title="Kinh tế học Vi mô Căn bản: Nguyên lý Thị trường & Quyết định Giá cả",
        slug="kinh-te-hoc-vi-mo-can-ban",
        description="Làm chủ các quy luật nền tảng của kinh tế học thị trường: Cung - Cầu, cơ chế giá cả tự do, điểm cân bằng thị trường và đại lượng cốt lõi Độ co giãn của Cầu theo Giá (Price Elasticity of Demand).",
        partner_name="NEU Business School",
        partner_logo_url=neu_logo,
        owner_id="user_instructor_econ",
        subject="cat-subj-biz",
        level="cat-lvl-beg",
        status="PUBLISHED",
        price=790000.0,
        currency="VND",
        financial_aid_enabled=True,
        average_rating=4.9,
        review_count=48,
    )

    # =========================================================================
    # Week 1: Microeconomics
    # =========================================================================
    week1_micro = WeekModuleModel(
        id="week-1-micro",
        course_id=course4.id,
        week_number=1,
        title="Tuần 1: Cơ chế Thị trường & Điểm Cân bằng Cung - Cầu",
        summary="Khám phá bàn tay vô hình của Adam Smith, quy luật cung cầu và cách thị trường tự điều tiết về điểm cân bằng giá.",
    )

    lesson1_micro = LessonModel(
        id="lesson-micro-intro",
        week_module_id=week1_micro.id,
        title="Bài 1: Bản chất Thị trường & Quy luật Cung - Cầu",
        estimated_minutes=35,
    )

    item1_micro_v1 = LearningItemModel(
        id="item-micro-v1",
        lesson_id=lesson1_micro.id,
        title="Bài giảng: Quy luật Cung - Cầu & Cơ chế Cân bằng Thị trường",
        type=ItemType.VIDEO,
        estimated_minutes=15,
        video_url=econ_video_1,
        vtt_subtitle_url="",
    )
    raw_transcripts_micro1 = [
        (
            0,
            "Chào mừng các bạn đến với khóa học Kinh tế học Vi mô Căn bản. Tôi là PGS. TS. Trần Minh Tuấn đến từ Đại học Kinh tế Quốc dân.",
        ),
        (
            25,
            "Trong bài giảng mở đầu này, chúng ta sẽ cùng khám phá một trong những quy luật mạnh mẽ nhất chi phối xã hội loài người: Quy luật Cung và Cầu.",
        ),
        (
            55,
            "Hãy tưởng tượng bạn bước vào một khu chợ dân sinh hoặc mở ứng dụng thương mại điện tử như Shopee, Tiki hay Lazada.",
        ),
        (
            90,
            "Điều gì quyết định mức giá của một chiếc áo thun, một ly cà phê muối hay một cân thịt heo? Liệu có ai đứng sau thao túng tất cả không?",
        ),
        (
            130,
            "Năm 1776, cha đẻ của kinh tế học hiện đại Adam Smith đã giới thiệu khái niệm kinh điển: 'Bàn tay vô hình' (The Invisible Hand) trong tác phẩm The Wealth of Nations.",
        ),
        (
            175,
            "Mỗi cá nhân chỉ hành động vì tư lợi và mưu cầu cuộc sống tốt hơn cho bản thân, nhưng cơ chế thị trường tự do đã điều phối tài nguyên xã hội một cách kỳ diệu.",
        ),
        (
            220,
            "Quy luật Cầu (Law of Demand) phát biểu rằng: Khi giá của một hàng hóa tăng lên, lượng cầu về hàng hóa đó sẽ giảm xuống, trong điều kiện các yếu tố khác không đổi.",
        ),
        (
            270,
            "Nguyên nhân đến từ hai hiệu ứng kinh tế học căn bản: Hiệu ứng thay thế (Substitution Effect) và Hiệu ứng thu nhập (Income Effect).",
        ),
        (
            320,
            "Ngược lại, Quy luật Cung (Law of Supply) chỉ ra: Khi giá thị trường tăng, người sản xuất có động lực mở rộng sản lượng và tuyển thêm lao động để tối đa hóa lợi nhuận.",
        ),
        (
            370,
            "Giao điểm kỳ diệu nơi đường Cung và đường Cầu cắt nhau được gọi là Điểm Cân Bằng Thị Trường (Market Equilibrium). Tại đây, không có sự dư thừa hay thiếu hụt hàng hóa.",
        ),
        (
            420,
            "Nếu giá bị đẩy lên quá cao so với cân bằng, hiện tượng dư thừa hàng hóa (Surplus) sẽ xuất hiện, buộc người bán phải giảm giá xả kho.",
        ),
        (
            470,
            "Trong bài đọc kèm theo và bài học kế tiếp, chúng ta sẽ mổ xẻ các case study thực tế tại Việt Nam và lượng hóa độ nhạy cảm của cầu thông qua Độ co giãn!",
        ),
    ]
    for ts, txt in raw_transcripts_micro1:
        item1_micro_v1.interactive_transcripts.append(
            InteractiveTranscriptModel(timestamp_seconds=ts, text=txt)
        )

    item1_micro_v1.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=150,
            question="Theo Adam Smith trong tác phẩm 'The Wealth of Nations', 'Bàn tay vô hình' (The Invisible Hand) vận hành thông qua cơ chế nào?",
            options=[
                "Cơ chế giá cả tự do và lợi ích cá nhân của người tham gia thị trường",
                "Mệnh lệnh hành chính và kế hoạch hóa tập trung của chính phủ",
                "Lòng từ thiện hảo tâm của các chủ xí nghiệp và doanh nhân",
                "Sự thỏa thuận chia sẻ thị phần ngầm của các tập đoàn độc quyền",
            ],
            correct_option_index=0,
            explanation="Adam Smith chứng minh rằng khi mỗi cá nhân tự do theo đuổi lợi ích cá nhân chính đáng của mình trong khuôn khổ luật pháp, cơ chế giá cả thị trường tự do đóng vai trò 'bàn tay vô hình' phân bổ nguồn lực xã hội đến nơi hiệu quả nhất.",
        )
    )
    item1_micro_v1.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=390,
            question="Nếu mức giá hiện hành trên thị trường cao hơn mức giá cân bằng (P > P*), thị trường sẽ rơi vào trạng thái nào và xu hướng giá tiếp theo là gì?",
            options=[
                "Thị trường dư thừa hàng hóa (Surplus), giá có xu hướng giảm về điểm cân bằng",
                "Thị trường khan hiếm hàng hóa (Shortage), giá có xu hướng tiếp tục tăng",
                "Thị trường cân bằng hoàn hảo, giá giữ nguyên vĩnh viễn",
                "Thị trường sụp đổ, cung và cầu đều triệt tiêu",
            ],
            correct_option_index=0,
            explanation="Khi P > P*, lượng cung vượt quá lượng cầu (Qs > Qd) dẫn đến hàng tồn kho tăng vọt (dư thừa hàng hóa). Để giải phóng hàng tồn, các nhà sản xuất buộc phải cạnh tranh hạ giá bán về mức cân bằng.",
        )
    )

    item2_micro_r1 = LearningItemModel(
        id="item-micro-r1",
        lesson_id=lesson1_micro.id,
        title="Tài liệu chuyên sâu: Bàn tay Vô hình, Tín hiệu Giá cả & Bài toán Phân bổ Nguồn lực Hiệu quả",
        type=ItemType.READING,
        estimated_minutes=25,
        reading_markdown=r"""# Bản chất Thị trường, Tín hiệu Giá cả và Bàn tay Vô hình

> *"Không phải từ lòng hảo tâm của người làm bánh mì, người nấu bia hay người mổ thịt mà chúng ta có bữa tối, mà là từ sự quan tâm của họ tới lợi ích chính bản thân họ."*  
> — **Adam Smith**, *The Wealth of Nations (1776)*

Kinh tế học Vi mô nghiên cứu cách thức các chủ thể kinh tế (người tiêu dùng, hộ gia đình và doanh nghiệp) đưa ra các quyết định lựa chọn trong điều kiện **nguồn lực khan hiếm (Resource Scarcity)**.

---

## 1. Ba Câu hỏi Lớn của Mọi Nền Kinh Tế

Mọi xã hội văn minh, từ các bộ lạc nguyên thủy cho đến các siêu đô thị tài chính hiện đại, đều phải đối mặt với thực tế: **Nhu cầu của con người là vô hạn, nhưng tài nguyên thiên nhiên, vốn và sức lao động lại hữu hạn.** Do đó, mọi hệ thống kinh tế bắt buộc phải giải quyết ba câu hỏi nền tảng:

1. **Sản xuất cái gì? (What to produce)**: Mặt hàng nào xã hội đang có nhu cầu bức thiết nhất? Nên dành đất đai để trồng lúa, trồng cà phê hay xây dựng khu công nghệ cao?
2. **Sản xuất như thế nào? (How to produce)**: Sử dụng tổ hợp công nghệ, máy móc và lao động nào để đạt chi phí sản xuất thấp nhất mà vẫn đảm bảo tiêu chuẩn chất lượng?
3. **Sản xuất cho ai? (For whom to produce)**: Ai sẽ là người thụ hưởng cuối cùng các sản phẩm và dịch vụ được tạo ra? Phân phối thu nhập trong xã hội được thực hiện theo cơ chế thị trường hay trợ cấp?

Trong nền kinh tế kế hoạch hóa tập trung, cơ quan nhà nước cố gắng quyết định cả ba câu hỏi trên bằng các bảng chỉ tiêu pháp lệnh. Tuy nhiên, lịch sử đã chứng minh rằng một cơ quan trung ương không thể có đủ thông tin để định đoạt hàng triệu nhu cầu vi tế biến đổi từng giây của người dân. Nền kinh tế thị trường giải quyết triệt để bài toán này thông qua **Cơ chế Giá cả Tự do (Free Price Mechanism)**.

---

## 2. Tín hiệu Giá cả (Price Signals) - Hệ Thần kinh của Nền Kinh tế

Trong một thị trường cạnh tranh lành mạnh, giá cả không đơn thuần là một con số in trên nhãn sản phẩm; nó hoạt động như một **tín hiệu phát thanh tổng hợp (Information Aggregator)** mang theo 3 chức năng sống còn:

- **Chức năng truyền tải thông tin (Information Transmission)**: Khi một mặt hàng trở nên khan hiếm (ví dụ cà phê bị mất mùa tại Tây Nguyên), giá cà phê tăng vọt. Mức giá cao lập tức truyền đi thông điệp tới hàng triệu người tiêu dùng rằng: "Cà phê đang rất khan hiếm, hãy sử dụng tiết kiệm!" mà không cần bất kỳ chỉ thị hành chính nào.
- **Chức năng tạo động lực (Incentive Provision)**: Mức giá cao hứa hẹn tỷ suất lợi nhuận hấp dẫn, thúc đẩy người nông dân mở rộng diện tích canh tác, áp dụng công nghệ tưới nhỏ giọt, và khuyến khích các nhà khoa học lai tạo giống cà phê chịu hạn năng suất cao.
- **Chức năng phân bổ khẩu phần (Rationing Device)**: Giá cả tự động sàng lọc những người thực sự trân trọng và sẵn sàng chi trả cao nhất cho sản phẩm, loại bỏ tình trạng xếp hàng chầu chực, lãng phí thời gian và cơ chế xin - cho.

---

## 3. Case Study Thực tế tại Việt Nam: Phân tích Cơ chế Thị trường & Can thiệp Giá cả

### Case 1: Khủng hoảng Giá Khẩu trang Y tế Đầu Năm 2020
Vào tháng 02/2020, khi đại dịch Covid-19 bùng phát, nhu cầu khẩu trang y tế tại Việt Nam tăng đột biến gấp 50 đến 100 lần chỉ trong vài ngày.
- **Phản ứng ban đầu**: Giá một hộp khẩu trang từ 35.000 VNĐ nhảy vọt lên 150.000 VNĐ – 200.000 VNĐ. Một số cơ quan địa phương lập tức áp đặt thanh tra, xử phạt hành vi "tăng giá quá mức" và yêu cầu bán đúng giá cũ 35.000 VNĐ (Price Ceiling).
- **Hệ quả của lệnh trần giá**: Các nhà thuốc lập tức treo biển "Hết hàng". Lượng khẩu trang biến mất khỏi kênh bán lẻ chính thống và chuyển dịch sang thị trường chợ đen với giá 250.000 VNĐ, người dân phải xếp hàng từ 4 giờ sáng tại các nhà máy dệt may. Các xưởng sản xuất không có động lực chạy máy hết công suất vì giá bán trần không bù đắp nổi chi phí nguyên liệu vải kháng khuẩn nhập khẩu tăng giá phi mã.
- **Khi thị trường tự do lên tiếng**: Khi cơ chế giá được thả nổi theo quy luật thị trường, mức lợi nhuận biên hấp dẫn đã kích thích hàng trăm doanh nghiệp dệt may tư nhân (như May 10, Garment 10, Dệt Kim Đông Xuân) đầu tư hàng chục triệu USD mua dây chuyền tự động, nhập khẩu hạt nhựa PP và vải không dệt. Chỉ sau 4 tháng, Việt Nam từ nước thiếu khẩu trang đã trở thành cường quốc xuất khẩu hàng tỷ chiếc khẩu trang ra toàn thế giới. Giá khẩu trang rơi thẳng đứng xuống còn 25.000 VNĐ/hộp – thậm chí rẻ hơn thời điểm trước đại dịch!

### Case 2: Dịch tả Lợn Châu Phi (ASF) 2019 và Bài toán Tái đàn
Cuối năm 2019, dịch tả lợn châu Phi đã càn quét làm sụt giảm gần 25% tổng đàn lợn của Việt Nam. 
- Giá lợn hơi tăng kỷ lục từ 45.000 VNĐ/kg lên trên 90.000 VNĐ/kg, đẩy chỉ số CPI tăng cao.
- Thay vì cưỡng chế giá trần, chính phủ đã tôn trọng quy luật cung cầu: Khuyến khích các tập đoàn chăn nuôi lớn (CP Group, Dabaco, Masan MEATLife) áp dụng chăn nuôi khép kín an toàn sinh học để tái đàn; đồng thời hạ thuế nhập khẩu thịt heo đông lạnh từ Nga, Brazil, Mỹ.
- Tín hiệu giá cao đã giúp các trang trại phục hồi nguồn cung chỉ sau 18 tháng, đưa giá thịt heo trở lại vùng ổn định 55.000 – 60.000 VNĐ/kg.

---

## 4. Tóm tắt Mô hình Cân bằng Cung - Cầu Toàn cảnh

| Trạng thái Thị trường | Quan hệ Cung - Cầu ($Q_s$ vs $Q_d$) | Biểu hiện Thực tế | Xu hướng Giá cả |
| :--- | :--- | :--- | :--- |
| **Dư thừa (Surplus)** | $Q_s > Q_d$ (Giá hiện hành $P > P^*$) | Ứ đọng kho bãi, người bán tranh nhau giảm giá xả lỗ | Giá giảm dần về $P^*$ |
| **Thiếu hụt (Shortage)** | $Q_d > Q_s$ (Giá hiện hành $P < P^*$) | Hàng hóa khan hiếm, người mua trả thêm tiền chênh lệch | Giá tăng dần về $P^*$ |
| **Cân bằng (Equilibrium)** | $Q_s = Q_d = Q^*$ (Tại giá $P = P^*$) | Thị trường thông suốt, tối đa hóa thặng dư xã hội | Giá ổn định |

Nhưng một câu hỏi sống còn đặt ra cho mọi nhà quản trị kinh doanh: **Khi tăng hay giảm giá một mặt hàng, lượng cầu sẽ sụt giảm chính xác bao nhiêu phần trăm?** Câu trả lời nằm ở khái niệm **Độ co giãn của Cầu theo Giá (PED)** trong Bài 2!
""",
    )
    lesson1_micro.items = [item1_micro_v1, item2_micro_r1]

    # =========================================================================
    # Lesson 2: Elasticity of Demand
    # =========================================================================
    lesson2_micro = LessonModel(
        id="lesson-micro-elasticity",
        week_module_id=week1_micro.id,
        title="Bài 2: Độ co giãn của Cầu theo Giá (Price Elasticity of Demand)",
        estimated_minutes=45,
    )

    item3_micro_v2 = LearningItemModel(
        id="item-micro-v2",
        lesson_id=lesson2_micro.id,
        title="Bài giảng: Công thức & Ý nghĩa Kinh tế của Độ co giãn (PED)",
        type=ItemType.VIDEO,
        estimated_minutes=15,
        video_url=econ_video_2,
        vtt_subtitle_url="",
    )
    raw_transcripts_micro2 = [
        (
            0,
            "Chào các bạn học viên. Hôm nay chúng ta sẽ tiếp cận một trong những công cụ định lượng quyền lực nhất của kinh tế học ứng dụng: Độ co giãn của Cầu theo Giá (PED).",
        ),
        (
            25,
            "Biết được quy luật tổng quát rằng khi giá tăng thì lượng mua giảm là chưa đủ đối với một Giám đốc Tài chính hay Nhà sáng lập doanh nghiệp.",
        ),
        (
            60,
            "Nhà quản trị cần biết con số chính xác: Nếu ngày mai chúng ta tăng giá sản phẩm thêm 5%, liệu lượng bán ra sẽ giảm 2%, 5%, hay tụt dốc tới 20%?",
        ),
        (
            100,
            "Độ co giãn của Cầu theo Giá đo lường phần trăm thay đổi của lượng cầu khi giá bán biến động một phần trăm, trong điều kiện các yếu tố khác không đổi.",
        ),
        (
            145,
            "Theo quy ước toán học, vì giá và lượng cầu biến thiên nghịch chiều, hệ số PED luôn mang giá trị âm. Tuy nhiên, các nhà kinh tế thường xét giá trị tuyệt đối |PED| để thuận tiện so sánh.",
        ),
        (
            190,
            "Nếu trị tuyệt đối |PED| lớn hơn 1, ta gọi cầu là co giãn nhiều (Elastic Demand). Nghĩa là khách hàng cực kỳ nhạy cảm với sự thay đổi của giá cả.",
        ),
        (
            235,
            "Ví dụ như vé máy bay du lịch khứ hồi, trà sữa hay các món ăn vặt. Nếu một quán trà sữa tăng giá thêm 10%, lượng khách hàng có thể bốc hơi tới 25% ngay lập tức!",
        ),
        (
            280,
            "Ngược lại, nếu trị tuyệt đối |PED| nhỏ hơn 1, ta gọi cầu là kém co giãn hay ít co giãn (Inelastic Demand).",
        ),
        (
            330,
            "Ví dụ kinh điển là xăng dầu, điện sinh hoạt, thuốc tim mạch hay sách giáo khoa bắt buộc. Dù giá có tăng 15%, người dân vẫn bắt buộc phải mua.",
        ),
        (
            380,
            "Điều kỳ diệu nằm ở mối quan hệ giữa PED và Tổng Doanh Thu (Total Revenue - TR = P nhân Q).",
        ),
        (
            430,
            "Khi cầu ít co giãn, tăng giá bán sẽ làm tăng tổng doanh thu! Nhưng khi cầu co giãn nhiều, việc tăng giá lại là một bản án tử hình kéo tụt doanh thu xuống vực thẳm.",
        ),
        (
            480,
            "Hãy cùng tôi đi vào phần tài liệu chuyên sâu để chứng minh bằng vi tích phân mối quan hệ tuyệt đẹp này!",
        ),
    ]
    for ts, txt in raw_transcripts_micro2:
        item3_micro_v2.interactive_transcripts.append(
            InteractiveTranscriptModel(timestamp_seconds=ts, text=txt)
        )

    item3_micro_v2.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=140,
            question="Nếu chuỗi cà phê Highlands tăng giá thức uống thêm 10% và ghi nhận lượng đơn hàng sụt giảm 25%, hệ số co giãn của cầu theo giá (|PED|) là bao nhiêu và thuộc nhóm nào?",
            options=[
                "|PED| = 2.5 (Cầu co giãn nhiều)",
                "|PED| = 0.4 (Cầu kém co giãn)",
                "|PED| = 1.0 (Cầu co giãn đơn vị)",
                "|PED| = 25.0 (Cầu hoàn toàn co giãn)",
            ],
            correct_option_index=0,
            explanation="|PED| = |% delta Q / % delta P| = |-25% / +10%| = 2.5. Vì 2.5 > 1, sản phẩm có cầu co giãn nhiều. Khách hàng rất nhạy cảm với việc tăng giá vì có nhiều thương hiệu thay thế như Phúc Long, The Coffee House.",
        )
    )
    item3_micro_v2.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=330,
            question="Đối với một mặt hàng có cầu kém co giãn (|PED| = 0.45 như xăng dầu), chiến lược giá nào sau đây giúp nhà kinh doanh gia tăng Tổng Doanh Thu (Total Revenue)?",
            options=[
                "Tăng giá bán (vì tỷ lệ giảm sản lượng nhỏ hơn tỷ lệ tăng giá)",
                "Giảm giá bán thật sâu để kích cầu số lượng lớn",
                "Giữ nguyên giá bán và ngừng nhận thêm đơn hàng",
                "Chuyển sang tặng miễn phí sản phẩm để tìm kiếm tài trợ",
            ],
            correct_option_index=0,
            explanation="Khi cầu ít co giãn (|PED| < 1), người tiêu dùng bắt buộc phải mua và khó tìm mặt hàng thay thế. Tỷ lệ tăng giá sẽ lớn hơn tỷ lệ sụt giảm sản lượng, do đó tích P * Q (Tổng Doanh Thu) sẽ tăng lên.",
        )
    )

    item4_micro_r2 = LearningItemModel(
        id="item-micro-r2",
        lesson_id=lesson2_micro.id,
        title="Tài liệu chuyên sâu: Đại số & Vi tích phân của Độ co giãn Cầu (PED) và Chiến lược Doanh thu",
        type=ItemType.READING,
        estimated_minutes=30,
        reading_markdown=r"""# Độ co giãn của Cầu theo Giá (Price Elasticity of Demand - PED)

Độ co giãn của Cầu theo Giá là đại lượng đo lường độ nhạy cảm của người tiêu dùng trước các quyết định điều chỉnh giá bán của doanh nghiệp.

---

## 1. Công thức Toán học Nền tảng

### 1.1. Độ co giãn Điểm (Point Elasticity)
Khi xét sự biến thiên vô cùng nhỏ của giá và lượng trên một đường cầu khả vi $Q = f(P)$:

$$\varepsilon_d = \lim_{\Delta P \to 0} \frac{\Delta Q / Q}{\Delta P / P} = \frac{dQ}{dP} \times \frac{P}{Q}$$

Trong đó $\frac{dQ}{dP}$ là đạo hàm bậc nhất của hàm cầu theo giá (đại diện cho độ dốc nghịch đảo của tiếp tuyến đường cầu).

### 1.2. Phương pháp Trung điểm (Midpoint Formula / Arc Elasticity)
Khi tính toán độ co giãn giữa hai điểm rời rạc $(P_1, Q_1)$ và $(P_2, Q_2)$, nhằm loại bỏ nghịch lý tính từ $A \to B$ khác từ $B \to A$, các nhà kinh tế học sử dụng giá trị trung bình làm mẫu số:

$$\varepsilon_d = \frac{(Q_2 - Q_1) / \left(\frac{Q_1 + Q_2}{2}\right)}{(P_2 - P_1) / \left(\frac{P_1 + P_2}{2}\right)} = \frac{Q_2 - Q_1}{P_2 - P_1} \times \frac{P_1 + P_2}{Q_1 + Q_2}$$

---

## 2. Bảng Phân loại 5 Trạng thái của Độ co giãn

| Trị tuyệt đối $|\varepsilon_d|$ | Tên gọi Chuyên môn | Đặc điểm Phản ứng | Ý nghĩa Kinh tế Thực tế |
| :--- | :--- | :--- | :--- |
| **$|\varepsilon_d| = 0$** | **Hoàn toàn không co giãn** | Đường cầu thẳng đứng song song trục tung | Giá tăng bao nhiêu lượng cầu cũng không đổi (Thuốc đặc trị ung thư, insulin) |
| **$0 < |\varepsilon_d| < 1$** | **Ít co giãn / Kém co giãn** | Đường cầu dốc đứng | Lượng cầu giảm ít hơn tỷ lệ tăng giá (Xăng dầu, điện, nước sinh hoạt, gạo) |
| **$|\varepsilon_d| = 1$** | **Co giãn đơn vị (Unitary)** | Đường cầu hypebol cong đều | Lượng cầu giảm đúng bằng tỷ lệ tăng giá. Điểm doanh thu đạt cực đại! |
| **$1 < |\varepsilon_d| < \infty$** | **Co giãn nhiều (Elastic)** | Đường cầu dốc thoai thoải | Lượng cầu giảm mạnh hơn nhiều tỷ lệ tăng giá (Hàng thời trang, trà sữa, du lịch) |
| **$|\varepsilon_d| = \infty$** | **Hoàn toàn co giãn** | Đường cầu nằm ngang song song trục hoành | Tăng giá 1 đồng lượng cầu rơi về 0 (Thị trường cạnh tranh hoàn hảo, nông sản thô) |

---

## 3. Dữ liệu Thực nghiệm: Độ co giãn Cầu của 10 Nhóm Mặt hàng tại Việt Nam

Dựa trên các nghiên cứu thực nghiệm của Viện Nghiên cứu Kinh tế & Chính sách (VEPR) và dữ liệu bán lẻ tổng hợp:

| STT | Mặt hàng / Dịch vụ | Ước lượng $|\varepsilon_d|$ | Phân loại | Khuyến nghị Chiến lược Giá |
| :---: | :--- | :---: | :--- | :--- |
| 1 | **Điện sinh hoạt bậc thang** | **0.25** | Rất ít co giãn | Tăng giá điện bảo toàn nguồn vốn EVN, ít lo mất khách |
| 2 | **Xăng sinh học E5 RON92** | **0.38** | Rất ít co giãn | Thuế bảo vệ môi trường chuyển phần lớn sang người tiêu dùng |
| 3 | **Gạo tẻ ST25 thơm ngon** | **0.52** | Kém co giãn | Hàng thiết yếu, ít bị ảnh hưởng bởi biến động giá |
| 4 | **Thuốc kháng sinh theo đơn** | **0.18** | Rất ít co giãn | Giá cao không làm giảm nhu cầu cứu chữa người bệnh |
| 5 | **Cà phê Robusta rang xay** | **0.85** | Kém co giãn | Khách hàng có thói quen nghiện cà phê sáng |
| 6 | **Trà sữa trân châu thương hiệu** | **2.40** | Co giãn rất mạnh | Giảm giá và phát voucher kích thích tăng vọt doanh số |
| 7 | **Vé máy bay khứ hồi du lịch Phú Quốc**| **1.85** | Co giãn mạnh | Nhạy cảm cao, Vietjet áp dụng vé 0 đồng để kéo khách |
| 8 | **Smartphone phân khúc cao cấp (iPhone 16 Pro Max)** | **1.35** | Co giãn vừa phải | Mức độ trung thành cao giữ cho độ co giãn không quá cao |
| 9 | **Dịch vụ xem phim trực tuyến (Netflix/VieON)** | **1.65** | Co giãn mạnh | Khách hàng sẵn sàng chia sẻ tài khoản hoặc hủy gói |
| 10 | **Khóa học Ngoại ngữ & Kỹ năng Trực tuyến** | **1.72** | Co giãn mạnh | Cung cấp học bổng, ưu đãi combo sẽ bùng nổ đơn đăng ký |

---

## 4. Chứng minh Toán học: Mối quan hệ giữa Độ co giãn & Tổng Doanh thu

Tổng doanh thu của doanh nghiệp là tích số giữa giá bán và sản lượng:
$$TR(P) = P \times Q(P)$$

Lấy đạo hàm của Tổng doanh thu $TR$ theo giá $P$ sử dụng quy tắc tích:
$$\frac{d(TR)}{dP} = 1 \times Q + P \times \frac{dQ}{dP}$$

Đặt $Q$ làm nhân tử chung:
$$\frac{d(TR)}{dP} = Q \left[ 1 + \frac{P}{Q} \frac{dQ}{dP} \right]$$

Nhận thấy rằng theo định nghĩa, $\varepsilon_d = \frac{dQ}{dP} \times \frac{P}{Q}$. Do đó, ta có đẳng thức toán học cốt lõi:
$$\frac{d(TR)}{dP} = Q (1 + \varepsilon_d)$$

### Hệ quả Logic đối với Nhà Quản trị Doanh nghiệp:
Vì sản lượng $Q > 0$, dấu của đạo hàm $\frac{d(TR)}{dP}$ hoàn toàn phụ thuộc vào biểu thức $(1 + \varepsilon_d)$:

1. **Trường hợp Cầu Co giãn nhiều ($|\varepsilon_d| > 1 \implies \varepsilon_d < -1$):**  
   Ta có $1 + \varepsilon_d < 0 \implies \frac{d(TR)}{dP} < 0$.  
   Đạo hàm âm nghĩa là $TR$ nghịch biến với $P$: **Tăng giá làm GIẢM doanh thu; Muốn TĂNG doanh thu thì phải GIẢM giá!**
   
2. **Trường hợp Cầu Ít co giãn ($|\varepsilon_d| < 1 \implies -1 < \varepsilon_d \le 0$):**  
   Ta có $1 + \varepsilon_d > 0 \implies \frac{d(TR)}{dP} > 0$.  
   Đạo hàm dương nghĩa là $TR$ đồng biến với $P$: **Tăng giá sẽ làm TĂNG tổng doanh thu!**

3. **Trường hợp Cầu Co giãn đơn vị ($|\varepsilon_d| = 1 \implies \varepsilon_d = -1$):**  
   Ta có $1 + \varepsilon_d = 0 \implies \frac{d(TR)}{dP} = 0$.  
   Đây là điểm dừng (Stationary Point) nơi **Tổng Doanh Thu đạt Cực Đại ($TR_{\max}$)!**
""",
    )

    item5_micro_q1 = LearningItemModel(
        id="item-micro-q1",
        lesson_id=lesson2_micro.id,
        title="Bài kiểm tra Đánh giá: Độ co giãn & Cân bằng Thị trường",
        type=ItemType.GRADED_QUIZ,
        estimated_minutes=25,
        quiz_matrix_id="qb-micro-01",
    )
    lesson2_micro.items = [item3_micro_v2, item4_micro_r2, item5_micro_q1]
    week1_micro.lessons = [lesson1_micro, lesson2_micro]

    # =========================================================================
    # Week 2: Consumer Behavior & Market Efficiency
    # =========================================================================
    week2_micro = WeekModuleModel(
        id="week-2-micro",
        course_id=course4.id,
        week_number=2,
        title="Tuần 2: Hành vi Người tiêu dùng & Thặng dư Xã hội",
        summary="Tìm hiểu cách người tiêu dùng tối đa hóa lợi ích và cách đo lường phúc lợi xã hội thông qua thặng dư người mua và người bán.",
    )

    lesson3_micro = LessonModel(
        id="lesson-micro-surplus",
        week_module_id=week2_micro.id,
        title="Bài 3: Thặng dư Người tiêu dùng & Tối ưu hóa Lợi ích",
        estimated_minutes=35,
    )

    item6_micro_v3 = LearningItemModel(
        id="item-micro-v3",
        lesson_id=lesson3_micro.id,
        title="Bài giảng: Thặng dư Tiêu dùng (Consumer Surplus) & Phúc lợi Xã hội",
        type=ItemType.VIDEO,
        estimated_minutes=15,
        video_url=econ_video_2,
        vtt_subtitle_url="",
    )
    raw_transcripts_micro3 = [
        (
            0,
            "Chào các bạn. Trong bài giảng này, chúng ta sẽ bước sang thước đo quan trọng nhất để đánh giá tính nhân văn và hiệu quả của thị trường: Thặng dư và Phúc lợi Xã hội.",
        ),
        (
            30,
            "Mỗi khi bạn bỏ ra 45.000 đồng mua một ly cà phê, bạn cảm thấy hời hay lỗ?",
        ),
        (
            65,
            "Nếu bạn đang cực kỳ khát và sẵn sàng trả tới 70.000 đồng cho ly cà phê đó, nhưng quán chỉ tính bạn 45.000 đồng, bạn đã nhận được một khoản lợi ích vô hình trị giá 25.000 đồng!",
        ),
        (
            110,
            "Khoản chênh lệch giữa mức giá cao nhất bạn sẵn lòng chi trả và mức giá thực tế bạn phải trả được gọi là Thặng Dư Người Tiêu Dùng (Consumer Surplus - CS).",
        ),
        (
            155,
            "Tương tự, về phía người bán, nếu chi phí biên để làm ra ly cà phê chỉ là 20.000 đồng nhưng bán được 45.000 đồng, người bán nhận được Thặng Dư Nhà Sản Xuất (Producer Surplus - PS) là 25.000 đồng.",
        ),
        (
            205,
            "Tổng Thặng Dư Xã hội (Total Social Welfare) bằng tổng CS cộng PS. Khi thị trường tự do đạt điểm cân bằng, tổng thặng dư này đạt giá trị lớn nhất tuyệt đối!",
        ),
        (
            255,
            "Tuy nhiên, điều gì xảy ra nếu chính phủ can thiệp bằng cách áp đặt mức giá trần hoặc đánh thuế quá cao?",
        ),
        (
            305,
            "Sản lượng giao dịch sẽ sụt giảm so với mức tối ưu. Một phần lợi ích của cả người mua và người bán bị bốc hơi hoàn toàn vào không khí!",
        ),
        (
            355,
            "Phần phúc lợi xã hội bị mất trắng mà không ai được thụ hưởng đó được gọi là Tổn Thất Vô Ích (Deadweight Loss - DWL).",
        ),
        (
            405,
            "Chúng ta sẽ cùng nghiên cứu chính sách giá trần vé máy bay nội địa của Việt Nam để xem DWL tác động cụ thể ra sao trong thực tiễn!",
        ),
        (
            450,
            "Nắm vững thặng dư tiêu dùng là chìa khóa để các bạn tiếp tục học cách trích xuất thặng dư trong Khóa học Chiến lược Định giá sau này!",
        ),
    ]
    for ts, txt in raw_transcripts_micro3:
        item6_micro_v3.interactive_transcripts.append(
            InteractiveTranscriptModel(timestamp_seconds=ts, text=txt)
        )

    item6_micro_v3.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=150,
            question="Thặng dư Người Tiêu dùng (Consumer Surplus - CS) được định nghĩa chính xác là gì?",
            options=[
                "Chênh lệch giữa mức giá cao nhất người mua sẵn sàng trả (WTP) và mức giá thực tế họ phải trả",
                "Tổng số tiền tiết kiệm được người tiêu dùng gửi vào ngân hàng thương mại",
                "Khoản tiền hoàn thuế giá trị gia tăng mà người tiêu dùng nhận lại từ nhà nước",
                "Chênh lệch giữa doanh thu của doanh nghiệp và chi phí sản xuất biên",
            ],
            correct_option_index=0,
            explanation="Consumer Surplus đo lường lợi ích ròng mà người mua nhận được từ việc tham gia thị trường, bằng Willingness-to-Pay (WTP) trừ đi mức giá thị trường thực tế (P*).",
        )
    )
    item6_micro_v3.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=345,
            question="Hiện tượng Tổn thất Vô ích (Deadweight Loss - DWL) xảy ra trong trường hợp nào sau đây?",
            options=[
                "Khi thị trường bị bóp méo do giá trần, giá sàn hoặc thuế khiến sản lượng lệch khỏi điểm cân bằng tối ưu",
                "Khi thị trường tự do đạt trạng thái cân bằng hoàn hảo giữa cung và cầu",
                "Khi tất cả các doanh nghiệp trên thị trường đều đạt mức siêu lợi nhuận",
                "Khi người tiêu dùng mua hàng được giảm giá sâu vào dịp Black Friday",
            ],
            correct_option_index=0,
            explanation="Deadweight Loss là phần phúc lợi kinh tế của xã hội bị mất trắng (không thuộc về người tiêu dùng, người sản xuất, hay chính phủ) khi các rào cản can thiệp ngăn cản các giao dịch cùng có lợi diễn ra.",
        )
    )

    item7_micro_r3 = LearningItemModel(
        id="item-micro-r3",
        lesson_id=lesson3_micro.id,
        title="Tài liệu chuyên sâu: Thặng dư Người Tiêu dùng, Hiệu quả Phúc lợi Xã hội & Tổn thất Vô ích (DWL)",
        type=ItemType.READING,
        estimated_minutes=30,
        reading_markdown=r"""# Thặng dư Người Tiêu dùng, Phúc lợi Xã hội & Tổn thất Vô ích (Deadweight Loss)

Mục tiêu cao nhất của nền kinh tế thị trường là phân bổ các nguồn lực khan hiếm để tối đa hóa tổng phúc lợi của toàn xã hội.

---

## 1. Thặng dư Người Tiêu dùng (Consumer Surplus - CS)

Mỗi người tiêu dùng có một mức định giá tâm lý tối đa cho hàng hóa gọi là **Mức giá Sẵn sàng Trả (Willingness to Pay - WTP)**.  
Nếu đường cầu nghịch đảo của thị trường là $P = P_d(Q)$, thặng dư người tiêu dùng tại mức giá cân bằng $P^*$ và sản lượng $Q^*$ là phần diện tích hình học nằm dưới đường cầu và phía trên đường giá thị trường:

$$CS = \int_{0}^{Q^*} [P_d(Q) - P^*] \, dQ$$

Nếu đường cầu là một đường tuyến tính $P_d(Q) = a - bQ$, diện tích này tạo thành một hình tam giác vuông:
$$CS = \frac{1}{2} \times (a - P^*) \times Q^*$$

---

## 2. Thặng dư Nhà Sản xuất (Producer Surplus - PS)

Về phía cung, các doanh nghiệp có mức chi phí biên khác nhau $MC(Q) = P_s(Q)$. Chênh lệch giữa giá bán thực tế trên thị trường $P^*$ và chi phí biên để sản xuất từng đơn vị hàng hóa là **Thặng dư Nhà Sản xuất (PS)**:

$$PS = \int_{0}^{Q^*} [P^* - P_s(Q)] \, dQ$$

---

## 3. Tổng Phúc lợi Xã hội (Social Welfare) & Định lý Thứ nhất của Kinh tế học Phúc lợi

Tổng phúc lợi xã hội (Social Welfare - $SW$) là tổng thặng dư của cả hai phía tham gia thị trường:
$$SW = CS + PS = \int_{0}^{Q^*} [P_d(Q) - P_s(Q)] \, dQ$$

**Định lý Cốt lõi (First Fundamental Theorem of Welfare Economics):**  
Trong điều kiện thị trường cạnh tranh hoàn hảo, không có ngoại ứng tiêu cực (Externalities) và thông tin hoàn hảo, cơ chế giá cả tự do luôn dẫn dắt thị trường tới điểm cân bằng $Q^*$ nơi **Tổng Phúc lợi Xã hội $SW$ đạt Giá trị Cực đại Tuyệt đối (Hiệu quả Pareto)!**

---

## 4. Tổn thất Vô ích của Xã hội (Deadweight Loss - DWL)

Khi chính phủ can thiệp vào thị trường bằng các công cụ:
- **Giá trần (Price Ceiling $P_c < P^*$)**: Gây thiếu hụt hàng hóa ($Q_s < Q_d$), người mua phải xếp hàng hoặc mua chợ đen.
- **Giá sàn (Price Floor $P_f > P^*$)**: Gây dư thừa hàng hóa ($Q_s > Q_d$), nhà nước phải chi tiền giải cứu hoặc tiêu hủy.
- **Thuế đánh trên đơn vị sản phẩm ($T$)**: Tạo ra khoảng cách chêm giữa giá người mua trả $P_b$ và giá người bán nhận $P_s$.

Sản lượng giao dịch thực tế sẽ bị kéo sụt giảm từ $Q^*$ xuống $Q_1$. Phần phúc lợi bị mất trắng chính là diện tích tam giác Harberger:

$$DWL = \frac{1}{2} \times |P_b - P_s| \times (Q^* - Q_1)$$

---

## 5. Case Study Toàn diện: Chính sách Trần Giá Vé Máy Bay Nội Địa tại Việt Nam

Tại Việt Nam, Bộ Giao thông Vận tải quy định khung giá trần vé máy bay nội địa theo từng cự ly bay (Thông tư số 34/2023/TT-BGTVT).
- **Mục tiêu chính sách**: Bảo vệ người tiêu dùng khỏi nguy cơ bị các hãng hàng không chèn ép tăng giá vào các dịp lễ cao điểm.
- **Phân tích Kinh tế lượng & Tổn thất Thực tế**:
  1. **Thiếu hụt cung dịp Tết Nguyên đán**: Vào dịp Tết, nhu cầu bay từ TP. Hồ Chí Minh ra Hà Nội/Đà Nẵng tăng đột biến ($D \to D'$). Nếu giá được thả nổi, giá vé có thể đạt 5 – 6 triệu VNĐ để bù đắp chi phí "bay rỗng một chiều" (chiều về Hà Nội - Sài Gòn hoàn toàn không có khách). Do bị khống chế trần vé ECO ở mức khoảng 3.5 triệu VNĐ, các hãng hàng không bị lỗ nặng chiều bay rỗng, dẫn tới việc họ hạn chế thuê thêm máy bay ướt (wet-lease) để tăng chuyến.
  2. **Chi phí tìm kiếm phi sản xuất (Search Costs)**: Hàng triệu người dân phải thức đêm canh giờ mở cổng bán vé, trả thêm phí "hoa hồng giữ chỗ" cho các đại lý bán vé vé lậu chợ đen. Khoản tiền chênh lệch này rơi vào tay đầu cơ mà hãng bay không thu được vốn để tái đầu tư đội tàu bay an toàn hơn.
  3. **Tổn thất Vô ích (DWL)**: Hàng trăm nghìn chuyến bay tiềm năng không thể diễn ra, dòng người bị dồn ứ sang đường bộ gây ùn tắc giao thông và tai nạn, tạo ra một tổn thất vô ích khổng lồ cho nền kinh tế Việt Nam.

> 🎓 **Cầu nối Chuyên môn tới Khóa 2 & Khóa 3:**  
> Làm sao để đo lường chính xác các đường cầu này từ dữ liệu giao dịch thực tế thay vì vẽ hình học trừu tượng? Chúng ta sẽ giải quyết bài toán đó ngay trong **Khóa học Kinh tế lượng Ứng dụng**!
""",
    )
    lesson3_micro.items = [item6_micro_v3, item7_micro_r3]

    lesson4_micro = LessonModel(
        id="lesson-micro-exam",
        week_module_id=week2_micro.id,
        title="Bài 4: Tổng kết Khóa học & Đề thi Hoàn thành Khóa",
        estimated_minutes=30,
    )
    item8_micro_q2 = LearningItemModel(
        id="item-micro-q2",
        lesson_id=lesson4_micro.id,
        title="Đề thi Hoàn thành: Nguyên lý Kinh tế học Vi mô Toàn diện",
        type=ItemType.GRADED_QUIZ,
        estimated_minutes=30,
        quiz_matrix_id="qb-micro-02",
    )
    lesson4_micro.items = [item8_micro_q2]
    week2_micro.lessons = [lesson3_micro, lesson4_micro]

    course4.week_modules = [week1_micro, week2_micro]

    # =========================================================================
    # Course 5: Applied Econometrics & Business Data Analytics (Intermediate)
    # =========================================================================
    course5 = CourseModel(
        id="course-applied-econometrics",
        title="Kinh tế lượng Ứng dụng & Phân tích Dữ liệu Kinh doanh",
        slug="kinh-te-luong-va-phan-tich-du-lieu-kinh-doanh",
        description="Ứng dụng phương pháp hồi quy tuyến tính OLS, kiểm định giả thuyết thống kê và mô hình Log-Log để ước lượng hàm cầu và đo lường độ co giãn từ tập dữ liệu bán lẻ 100.000 giao dịch thực tế.",
        partner_name="Viện Dữ liệu Kinh tế Việt Nam",
        partner_logo_url=neu_logo,
        owner_id="user_instructor_econ",
        subject="cat-subj-biz",
        level="cat-lvl-int",
        status="PUBLISHED",
        price=1290000.0,
        currency="VND",
        financial_aid_enabled=True,
        average_rating=4.85,
        review_count=36,
        foundational_course_ids=["course-microeconomics-foundations"],
    )

    # =========================================================================
    # Week 1: Econometrics
    # =========================================================================
    week1_econ = WeekModuleModel(
        id="week-1-econ",
        course_id=course5.id,
        week_number=1,
        title="Tuần 1: Hồi quy Tuyến tính OLS & Ước lượng Hàm Cầu Thực nghiệm",
        summary="Học phương pháp bình phương bé nhất (OLS) và cách xây dựng mô hình hồi quy Log-Log để ước lượng hệ số co giãn thực tế từ dữ liệu kinh doanh.",
    )

    lesson1_econ = LessonModel(
        id="lesson-econ-intro",
        week_module_id=week1_econ.id,
        title="Bài 1: Nhập môn Kinh tế lượng & Khám phá Dữ liệu Giao dịch",
        estimated_minutes=35,
    )

    item1_econ_v1 = LearningItemModel(
        id="item-econ-v1",
        lesson_id=lesson1_econ.id,
        title="Bài giảng: Dữ liệu Lớn trong Kinh tế học & Mô hình Hồi quy Tuyến tính",
        type=ItemType.VIDEO,
        estimated_minutes=15,
        video_url=econ_video_3,
        vtt_subtitle_url="",
    )
    raw_transcripts_econ1 = [
        (
            0,
            "Chào mừng các bạn đến với khóa học Kinh tế lượng Ứng dụng và Phân tích Dữ liệu Kinh doanh. Tôi rất vui mừng được đồng hành cùng các bạn.",
        ),
        (
            25,
            "Ở Khóa học Vi mô Căn bản, các bạn đã hiểu bản chất của Độ co giãn Cầu theo Giá (PED).",
        ),
        (
            60,
            "Nhưng câu hỏi thực tế trong doanh nghiệp là: Con số PED âm 1.4 hay âm 0.8 đó lấy từ đâu ra? Có phải do ai đó ngồi đoán mò?",
        ),
        (
            105,
            "Tuyệt đối không! Trong kỷ nguyên Big Data, chúng ta không hỏi ý kiến khách hàng bằng khảo sát giấy, mà chúng ta lắng nghe dữ liệu hành vi của 100.000 giao dịch bán lẻ.",
        ),
        (
            150,
            "Phương pháp Hồi quy Bình phương Tối thiểu (Ordinary Least Squares - OLS) là vũ khí sắc bén nhất của nhà kinh tế lượng học.",
        ),
        (
            195,
            "Nguyên lý cốt lõi của OLS vô cùng thanh lịch: Nó tìm ra đường thẳng hồi quy sao cho Tổng Bình Phương Sai Số giữa giá trị dự báo và số liệu thực tế đạt mức nhỏ nhất.",
        ),
        (
            245,
            "Một mô hình hồi quy OLS đáng tin cậy phải thỏa mãn định lý Gauss-Markov: Sai số có kỳ vọng bằng 0, phương sai không đổi và không có tự tương quan.",
        ),
        (
            295,
            "Tuy nhiên, dữ liệu thực tế từ các máy POS siêu thị luôn chứa đầy 'rác': Đơn hàng bị lỗi hủy, khách trả hàng, hoặc các ngoại lai cực đoan.",
        ),
        (
            345,
            "Nhiệm vụ đầu tiên của chúng ta là học cách tiền xử lý dữ liệu chuẩn chỉnh, kiểm định phân phối và đối phó với hiện tượng phương sai thay đổi bằng Sai số chuẩn White!",
        ),
        (
            395,
            "Trong bài học sau, chúng ta sẽ thực hành trực tiếp với mô hình Log-Log để trích xuất hệ số co giãn co dãn đàn hồi tuyệt đối!",
        ),
        (
            440,
            "Hãy mở file tài liệu đọc để nắm rõ cấu trúc tập dữ liệu 100.000 dòng mà chúng ta sẽ phân tích suốt khóa học này!",
        ),
    ]
    for ts, txt in raw_transcripts_econ1:
        item1_econ_v1.interactive_transcripts.append(
            InteractiveTranscriptModel(timestamp_seconds=ts, text=txt)
        )

    item1_econ_v1.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=140,
            question="Nguyên lý tối ưu hóa toán học của phương pháp Hồi quy Tuyến tính Bình phương Tối thiểu (OLS) là gì?",
            options=[
                "Tối thiểu hóa Tổng bình phương phần dư (Residual Sum of Squares - RSS)",
                "Tối đa hóa khoảng cách giữa các điểm dữ liệu và trục hoành",
                "Tối thiểu hóa số lượng biến độc lập có trong mô hình hồi quy",
                "Tối đa hóa giá trị trung bình của biến phụ thuộc Y",
            ],
            correct_option_index=0,
            explanation="OLS tìm kiếm vector hệ số beta sao cho hàm mục tiêu RSS = sum(y_i - y_hat_i)^2 đạt giá trị nhỏ nhất, đảm bảo đường hồi quy bám sát dữ liệu thực tế nhất.",
        )
    )
    item1_econ_v1.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=340,
            question="Giả định nào sau đây là điều kiện tiên quyết theo Định lý Gauss-Markov để ước lượng OLS trở thành ước lượng tuyến tính không chệch tốt nhất (BLUE)?",
            options=[
                "Ngoại sinh nghiêm ngặt: Kỳ vọng có điều kiện của phần dư theo các biến độc lập bằng 0: E[epsilon | X] = 0",
                "Tất cả các biến độc lập phải tuân theo phân phối nhị thức đồng nhất",
                "Hệ số R-squared của mô hình bắt buộc phải đạt trên 99.9%",
                "Số lượng quan sát mẫu phải đúng bằng 100 giao dịch",
            ],
            correct_option_index=0,
            explanation="Giả định E[epsilon | X] = 0 (tính ngoại sinh) đảm bảo không có hiện tượng nội sinh (Endogeneity), giúp hệ số ước lượng OLS không bị chệch (Unbiased).",
        )
    )

    item2_econ_r1 = LearningItemModel(
        id="item-econ-r1",
        lesson_id=lesson1_econ.id,
        title="Tài liệu chuyên sâu: Thiết kế Dữ liệu Bán lẻ 100.000 Giao dịch & Quy trình Tiền xử lý Kinh tế lượng",
        type=ItemType.READING,
        estimated_minutes=30,
        reading_markdown=r"""# Dữ liệu Bán lẻ Thực tế & Quy trình Tiền xử lý Kinh tế lượng Chuẩn mực

Trong kinh tế học ứng dụng hiện đại, không có mô hình kinh tế lượng nào có thể đưa ra kết luận chuẩn xác nếu dữ liệu đầu vào là "dữ liệu rác" (*Garbage in, Garbage out*).

---

## 1. Kiến trúc Tập Dữ liệu Bán lẻ POS (Point of Sale) 100.000 Giao dịch

Chúng ta sử dụng tập dữ liệu giao dịch thực tế trích xuất từ hệ thống máy tính tiền POS của chuỗi siêu thị bán lẻ tiêu dùng nhanh (FMCG) tại Việt Nam gồm **100.000 quan sát** trong giai đoạn 2024 - 2026.

### Schema Bảng Dữ liệu:
| Tên Cột | Kiểu Dữ liệu | Mô tả Chi tiết | Ví dụ Giá trị |
| :--- | :--- | :--- | :--- |
| `transaction_id` | String (UUID) | Khóa chính duy nhất của mỗi hóa đơn bán lẻ | `tx-2026-89412` |
| `timestamp` | Datetime ISO | Thời điểm giao dịch diễn ra | `2026-03-15T18:24:00Z` |
| `sku_id` | String | Mã định danh sản phẩm (SKU) | `sku-milk-fresh-1l` |
| `unit_price_vnd` | Float (VNĐ) | Giá niêm yết của sản phẩm tại thời điểm mua | `38000.0` |
| `quantity_sold` | Integer | Số lượng sản phẩm khách hàng mua trong đơn | `4` |
| `discount_percent` | Float (%) | Tỷ lệ chiết khấu khuyến mãi được áp dụng | `0.15` (15%) |
| `customer_income_mil` | Float (Triệu VNĐ)| Thu nhập ước lượng theo tháng của khu vực khách hàng | `18.5` |
| `is_weekend` | Integer (0/1) | Biến giả: 1 nếu giao dịch vào T7/CN, 0 nếu ngày thường | `1` |
| `store_location` | String | Chi nhánh siêu thị (Hà Nội, TP.HCM, Đà Nẵng) | `Hanoi_CauGiay` |

---

## 2. Bảng Thống kê Mô tả Tổng hợp (Descriptive Statistics)

Trước khi chạy bất kỳ mô hình hồi quy nào, nhà nghiên cứu kinh tế lượng bắt buộc phải kiểm tra bảng thống kê mô tả để nắm bắt phân phối của các biến số:

| Biến số | Số lượng mẫu (N) | Giá trị Trung bình (Mean) | Độ lệch chuẩn (Std Dev) | Giá trị Nhỏ nhất (Min) | Phân vị 25% | Phân vị 50% (Median) | Phân vị 75% | Giá trị Lớn nhất (Max) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Giá bán ($P$)** | 100,000 | 42,500 VNĐ | 12,300 | 15,000 | 32,000 | 40,000 | 52,000 | 120,000 |
| **Sản lượng ($Q$)** | 100,000 | 5.4 đơn vị | 4.8 | 1 | 2 | 4 | 7 | 85 |
| **Giảm giá ($Disc$)** | 100,000 | 8.2% | 11.5% | 0.0% | 0.0% | 5.0% | 15.0% | 50.0% |
| **Thu nhập ($Income$)**| 100,000 | 22.4 triệu VNĐ| 8.1 | 5.0 | 16.0 | 21.0 | 28.0 | 65.0 |

---

## 3. Quy trình 4 Bước Làm sạch & Kiểm định Dữ liệu Nghiêm ngặt

### Bước 1: Phát hiện và Loại bỏ Ngoại lai (Outlier Detection)
Trong dữ liệu bán lẻ, các giao dịch mua buôn sỉ bất thường (ví dụ: mua 85 hộp sữa một lúc) hoặc các đơn hàng hoàn trả có thể làm lệch nghiêm trọng độ dốc hồi quy OLS.  
- **Tiêu chuẩn Khoảng Tứ Phân Vị (Interquartile Range - IQR):**
  $$IQR = Q_3 - Q_1 = 7 - 2 = 5$$
  Khoảng giá trị hợp lệ: $[Q_1 - 1.5 \times IQR, Q_3 + 1.5 \times IQR] = [2 - 7.5, 7 + 7.5] = [0, 14.5]$.  
  Các đơn hàng có số lượng vượt quá 15 đơn vị được tách riêng sang nhóm khách hàng bán buôn B2B để không làm sai lệch hành vi tiêu dùng cá nhân B2C.

### Bước 2: Kiểm tra Phân phối Lệch (Skewness) & Biến đổi Logarit
Dữ liệu giá cả và sản lượng trong kinh tế học luôn có phân phối lệch phải (Right-skewed) với đuôi dài hướng về các giá trị lớn. Việc áp dụng biến đổi $\ln(P)$ và $\ln(Q)$ giúp dữ liệu tiệm cận phân phối chuẩn Gauss, ổn định phương sai và cho phép diễn giải hệ số dưới dạng tỷ lệ phần trăm (độ co giãn).

### Bước 3: Kiểm định Hiện tượng Phương sai Thay đổi (Heteroskedasticity)
Một trong những lỗi nghiêm trọng nhất khi chạy OLS là giả định phương sai sai số $\sigma^2$ không đổi bị vi phạm.  
Chúng ta chạy kiểm định **Breusch-Pagan Test**:
- Giả thuyết $H_0$: Phương sai sai số là đồng nhất (Homoskedasticity).
- Giả thuyết $H_1$: Phương sai sai số thay đổi theo quy mô giá bán (Heteroskedasticity).
- Kết quả kiểm định trên tập dữ liệu: Thống kê $LM = 412.8$ với $p\text{-value} < 0.0001 \implies$ Bác bỏ $H_0$!

### Bước 4: Khắc phục bằng Sai số Chuẩn Vững White (White Robust Standard Errors / HC1)
Để đảm bảo các kiểm định thống kê ($t$-statistic, $p$-value, khoảng tin cậy) không bị sai lệch do hiện tượng phương sai thay đổi, chúng ta sử dụng ma trận hiệp phương sai vững White:

$$\widehat{\text{Var}}(\hat{\beta}) = (X'X)^{-1} \left( \sum_{i=1}^{n} e_i^2 x_i x_i' \right) (X'X)^{-1}$$

Nhờ kỹ thuật này, hệ số hồi quy vẫn giữ nguyên giá trị không chệch, nhưng sai số chuẩn được hiệu chỉnh hoàn toàn chuẩn xác!
""",
    )
    lesson1_econ.items = [item1_econ_v1, item2_econ_r1]

    # =========================================================================
    # Lesson 2: Log-Log Demand Estimation
    # =========================================================================
    lesson2_econ = LessonModel(
        id="lesson-econ-demand-model",
        week_module_id=week1_econ.id,
        title="Bài 2: Hồi quy Log-Log & Ước lượng Hàm Cầu Thực tế (Kế thừa Khóa Vi mô)",
        estimated_minutes=45,
    )

    item3_econ_v2 = LearningItemModel(
        id="item-econ-v2",
        lesson_id=lesson2_econ.id,
        title="Bài giảng: Xây dựng Mô hình Log-Log để Ước lượng Độ co giãn",
        type=ItemType.VIDEO,
        estimated_minutes=15,
        video_url=econ_video_3,
        vtt_subtitle_url="",
    )
    raw_transcripts_econ2 = [
        (
            0,
            "Chào các bạn. Đây chính là bài học hội tụ giữa lý thuyết kinh tế vi mô và kỹ thuật phân tích dữ liệu thực chiến.",
        ),
        (
            30,
            "Các bạn còn nhớ công thức Độ co giãn Cầu theo Giá ở Bài 2 của Khóa Vi mô chứ? PED bằng phần trăm thay đổi của Q chia cho phần trăm thay đổi của P.",
        ),
        (
            75,
            "Hôm nay, chúng ta sẽ chứng minh một điều kỳ diệu của toán học: Chỉ cần chạy hồi quy logarit tự nhiên của Q theo P, hệ số hồi quy beta 1 thu được CHÍNH LÀ hệ số co giãn PED!",
        ),
        (
            120,
            "Mô hình này được gọi là Mô hình Log-Log hay Mô hình Độ co giãn Hằng số (Constant Elasticity Model).",
        ),
        (
            170,
            "Khi lấy logarit tự nhiên hai vế của hàm cầu lũy thừa Q bằng A nhân P mũ beta 1, phương trình cong phi tuyến lập tức biến thành một đường thẳng tuyến tính hoàn hảo.",
        ),
        (
            225,
            "Đạo hàm của ln Q theo ln P theo quy tắc chuỗi giải tích vi phân chính bằng dQ chia Q trên dP chia P.",
        ),
        (
            280,
            "Chúng ta đã chạy mô hình này trên 100.000 dòng dữ liệu bán lẻ siêu thị bằng thư viện Python statsmodels.",
        ),
        (
            335,
            "Kết quả trả về hệ số beta 1 là âm 1.642 với giá trị p-value cực nhỏ, xấp xỉ bằng 0.000.",
        ),
        (
            390,
            "Điều này có nghĩa là gì? Nó khẳng định với độ tin cậy 99.9% rằng sản phẩm sữa chua men sống này có cầu co giãn rất mạnh: Cứ mỗi 1% tăng giá, sản lượng sẽ rơi rụng 1.642%!",
        ),
        (
            445,
            "Ngay sau bài đọc chứng minh toán học, tôi đã chuẩn bị sẵn một bài tập Lab lập trình Python tự động chấm điểm để các bạn tự tay viết thuật toán hồi quy này!",
        ),
    ]
    for ts, txt in raw_transcripts_econ2:
        item3_econ_v2.interactive_transcripts.append(
            InteractiveTranscriptModel(timestamp_seconds=ts, text=txt)
        )

    item3_econ_v2.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=150,
            question="Trong mô hình hồi quy Log-Log ln(Q) = beta0 + beta1 * ln(P) + epsilon, ý nghĩa kinh tế trực tiếp của hệ số beta1 là gì?",
            options=[
                "Độ co giãn của Cầu theo Giá (Price Elasticity of Demand - PED)",
                "Chi phí cận biên để sản xuất thêm một đơn vị sản phẩm",
                "Mức giá khởi điểm khi khách hàng bắt đầu mua sản phẩm",
                "Hệ số tương quan tuyến tính Pearson giữa giá và thu nhập",
            ],
            correct_option_index=0,
            explanation="Do d(ln Q) / d(ln P) = (dQ/Q) / (dP/P) = % delta Q / % delta P, hệ số beta1 trong mô hình Log-Log chính là định nghĩa toán học của Độ co giãn của Cầu theo Giá (PED).",
        )
    )
    item3_econ_v2.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=340,
            question="Nếu kết quả hồi quy hàm cầu cho ra beta1 = -1.642 với p-value = 0.0001 (mức ý nghĩa alpha = 0.05), phát biểu nào sau đây là chuẩn xác nhất?",
            options=[
                "Hệ số beta1 có ý nghĩa thống kê; khi giá tăng 10%, lượng cầu dự kiến sẽ giảm 16.42%",
                "Hệ số beta1 không có ý nghĩa thống kê vì mang dấu âm",
                "Mô hình hoàn toàn sai lệch vì hệ số co giãn không thể lớn hơn 1",
                "Khi giá tăng 1 VNĐ, sản lượng bán ra sẽ giảm 1.642 đơn vị",
            ],
            correct_option_index=0,
            explanation="P-value < 0.05 bác bỏ giả thuyết vô hiệu H0: beta1 = 0, chứng minh mối quan hệ có ý nghĩa thống kê vững chắc. Trong mô hình Log-Log, giá tăng 10% sẽ làm lượng tiêu thụ giảm 10% * 1.642 = 16.42%.",
        )
    )

    item4_econ_r2 = LearningItemModel(
        id="item-econ-r2",
        lesson_id=lesson2_econ.id,
        title="Tài liệu chuyên sâu: Chứng minh Toán học Mô hình Hồi quy Log-Log & Đọc hiểu Bảng Thống kê OLS",
        type=ItemType.READING,
        estimated_minutes=35,
        reading_markdown=r"""# Mô hình Hồi quy Log-Log & Ước lượng Hàm Cầu Thực nghiệm

> 💡 **Khuyến nghị Kiến thức Nền tảng:**  
> Bài học này vận dụng trực tiếp định nghĩa **Độ co giãn của Cầu theo Giá ($\varepsilon_d = \frac{\% \Delta Q}{\% \Delta P}$)** được giảng dạy tại **Bài 2 - Khóa học Kinh tế Vi mô Căn bản**. Nếu bạn chưa nắm vững bản chất hình học của $PED$, bạn có thể xem lại bài học đó.

---

## 1. Thiết lập Hàm Cầu Dạng Hàm Lũy Thừa (Cobb-Douglas Form)

Trong kinh tế học thực nghiệm, hàm cầu không tuyến tính theo dạng đường thẳng thông thường, mà biểu diễn dưới dạng hàm lũy thừa liên tục nhằm phản ánh quy luật lợi ích biên giảm dần:

$$Q_i = A \cdot P_i^{\beta_1} \cdot \text{Income}_i^{\beta_2} \cdot e^{\epsilon_i}$$

Trong đó:
- $Q_i$: Lượng cầu của người tiêu dùng thứ $i$.
- $P_i$: Mức giá bán của sản phẩm.
- $\text{Income}_i$: Mức thu nhập hàng tháng của người tiêu dùng.
- $A$: Hằng số công nghệ và thị hiếu thị trường.
- $\epsilon_i$: Sai số ngẫu nhiên không quan sát được.

---

## 2. Phép Biến đổi Logarit Tự nhiên (Log-Log Transformation)

Lấy logarit tự nhiên ($\ln$) ở cả hai vế của phương trình:
$$\ln(Q_i) = \ln(A) + \beta_1 \ln(P_i) + \beta_2 \ln(\text{Income}_i) + \epsilon_i$$

Đặt hằng số $\beta_0 = \ln(A)$, ta thu được phương trình hồi quy tuyến tính cổ điển:
$$\ln(Q_i) = \beta_0 + \beta_1 \ln(P_i) + \beta_2 \ln(\text{Income}_i) + \epsilon_i$$

---

## 3. Chứng minh Toán học Tường minh: $\beta_1 \equiv \varepsilon_d$

Lấy vi phân toàn phần ở hai vế phương trình đối với biến giá $P$:
Theo quy tắc giải tích vi phân cho hàm logarit tự nhiên:
$$d(\ln Q) = \frac{dQ}{Q} \quad \text{và} \quad d(\ln P) = \frac{dP}{P}$$

Do đó, đạo hàm riêng của $\ln(Q)$ theo $\ln(P)$ chính là:
$$\beta_1 = \frac{\partial \ln(Q)}{\partial \ln(P)} = \frac{\frac{\partial Q}{Q}}{\frac{\partial P}{P}} = \frac{\% \Delta Q}{\% \Delta P} \equiv \varepsilon_d$$

**Kết luận Toán học Vững chắc:**  
Trong mô hình hồi quy Log-Log, hệ số góc $\beta_1$ chính là thước đo độ co giãn đàn hồi không đổi của cầu theo giá ($PED$). Nó hoàn toàn độc lập với đơn vị tiền tệ (VNĐ hay USD) và đơn vị đo khối lượng (kg hay tấn).

---

## 4. Đọc hiểu Bảng Kết quả Hồi quy Chuẩn OLS (Python statsmodels / STATA)

Sau khi khớp mô hình trên tập dữ liệu 100.000 giao dịch bán lẻ bằng phương pháp bình phương tối thiểu vững White:

```text
==============================================================================
                            OLS Regression Results                            
==============================================================================
Dep. Variable:                ln_quantity   R-squared:                   0.784
Model:                                OLS   Adj. R-squared:              0.783
Method:                     Least Squares   F-statistic:                 452.3
Date:                    Sun, 15 Mar 2026   Prob (F-statistic):          0.000
No. Observations:                  100000   Covariance Type:               HC1
==================================================================================
                 coef    std err          t      P>|t|      [0.025      0.975]
----------------------------------------------------------------------------------
const           4.821      0.082     58.793      0.000       4.660       4.982
ln_price       -1.642      0.038    -43.210      0.000      -1.716      -1.568
ln_income       0.450      0.025     18.000      0.000       0.401       0.499
promo_dummy     0.285      0.015     19.000      0.000       0.256       0.314
==================================================================================
```

### Diễn giải Chi tiết Từng Thông số Kỹ thuật:
1. **Hệ số $\beta_1 (\text{ln\_price}) = -1.642$**:  
   - Dấu âm chứng minh quy luật cầu được thỏa mãn hoàn toàn (giá tăng, lượng cầu giảm).
   - Vì $|-1.642| > 1$, mặt hàng này có **Cầu Co giãn Nhiều (Elastic Demand)**. Cứ tăng giá 1%, lượng bán sẽ sụt giảm 1.642%.
2. **Sai số chuẩn (Std Err = 0.038) & Trị số thống kê $t = -43.210$**:  
   - Trị tuyệt đối của $t$-statistic cực lớn ($|-43.21| \gg 1.96$), bác bỏ hoàn toàn giả thuyết vô hiệu $H_0: \beta_1 = 0$.
3. **Giá trị $p$-value ($P > |t| = 0.000$)**:  
   - Thống kê có ý nghĩa ở mức ý nghĩa $99.99\%$, đảm bảo kết quả không phải do ngẫu nhiên rơi vào mẫu.
4. **Khoảng tin cậy 95% Confidence Interval $[-1.716, -1.568]$**:  
   - Ta có thể tự tin khẳng định với ban điều hành doanh nghiệp rằng hệ số co giãn thực tế của thị trường nằm trong dải từ $-1.568$ đến $-1.716$.
5. **Hệ số Xác định $R^2 = 0.784$**:  
   - $78.4\%$ sự biến thiên trong sản lượng mua của khách hàng được giải thích trọn vẹn bởi giá bán, thu nhập và chương trình khuyến mãi.
""",
    )

    sample_ols_lab_code = """import math

def estimate_ols_elasticity(prices: list[float], quantities: list[float]) -> float:
    \"\"\"
    Tính toán hệ số co giãn của cầu theo giá (beta_1) sử dụng mô hình hồi quy tuyến tính Log-Log:
    ln(Q) = beta_0 + beta_1 * ln(P)
    
    Công thức OLS cho beta_1:
    beta_1 = sum((ln(P_i) - mean(ln(P))) * (ln(Q_i) - mean(ln(Q)))) / sum((ln(P_i) - mean(ln(P)))^2)
    
    Trả về giá trị beta_1 làm tròn 3 chữ số thập phân (round(beta_1, 3)).
    \"\"\"
    # TODO: Học viên triển khai thuật toán tính toán hồi quy Log-Log tại đây
    pass
"""

    sample_ols_lab_test_cases = [
        {
            "input": "[10.0, 12.0, 15.0, 20.0, 25.0], [100.0, 85.0, 70.0, 52.0, 40.0]",
            "expected_output": "-1.012",
            "is_hidden": False,
        },
        {
            "input": "[50.0, 55.0, 60.0, 65.0, 70.0], [500.0, 490.0, 480.0, 475.0, 465.0]",
            "expected_output": "-0.211",
            "is_hidden": False,
        },
        {
            "input": "[100.0, 110.0, 120.0, 130.0, 140.0], [1000.0, 810.0, 650.0, 510.0, 400.0]",
            "expected_output": "-2.715",
            "is_hidden": True,
        },
    ]

    item_econ_lab_1 = LearningItemModel(
        id="item-econ-lab-1",
        lesson_id=lesson2_econ.id,
        title="Thực hành Lập trình: Ước lượng Hệ số Co giãn Cầu (OLS Log-Log) bằng Python",
        type=ItemType.AUTO_GRADED_LAB,
        estimated_minutes=35,
        language="python",
        starter_code=sample_ols_lab_code,
        test_cases_json=json.dumps(sample_ols_lab_test_cases),
    )

    item5_econ_q1 = LearningItemModel(
        id="item-econ-q1",
        lesson_id=lesson2_econ.id,
        title="Bài kiểm tra Đánh giá: Mô hình Hồi quy Ước lượng Hàm Cầu",
        type=ItemType.GRADED_QUIZ,
        estimated_minutes=25,
        quiz_matrix_id="qb-econ-01",
    )
    lesson2_econ.items = [item3_econ_v2, item4_econ_r2, item_econ_lab_1, item5_econ_q1]
    week1_econ.lessons = [lesson1_econ, lesson2_econ]

    # =========================================================================
    # Week 2: Econometrics
    # =========================================================================
    week2_econ = WeekModuleModel(
        id="week-2-econ",
        course_id=course5.id,
        week_number=2,
        title="Tuần 2: Kiểm định Thống kê & Đánh giá Tác động Khuyến mãi",
        summary="Sử dụng biến giả (Dummy Variables) và phân tích sai biệt kép (Diff-in-Diff) để đo lường hiệu quả thực sự của chiến dịch giảm giá.",
    )

    lesson3_econ = LessonModel(
        id="lesson-econ-dummy-eval",
        week_module_id=week2_econ.id,
        title="Bài 3: Biến giả & Đo lường Tác động của Ngày Mega-Sale",
        estimated_minutes=35,
    )
    item6_econ_v3 = LearningItemModel(
        id="item-econ-v3",
        lesson_id=lesson3_econ.id,
        title="Bài giảng: Sử dụng Biến giả (Dummy Variables) Đánh giá Khuyến mãi Ngày 11/11",
        type=ItemType.VIDEO,
        estimated_minutes=15,
        video_url=econ_video_3,
        vtt_subtitle_url="",
    )
    raw_transcripts_econ3 = [
        (
            0,
            "Chào các bạn. Trong bài giảng này, chúng ta sẽ bước vào thế giới của phân tích chính sách và đánh giá tác động nhân quả (Causal Inference).",
        ),
        (
            30,
            "Khi một sàn thương mại điện tử như Shopee hay Lazada tổ chức ngày hội siêu mua sắm 11/11 hoặc Black Friday, doanh số bán hàng thường tăng vọt gấp 3 lần.",
        ),
        (
            75,
            "Nhưng Giám đốc Điều hành (CEO) hỏi bạn: Doanh số tăng đó thực sự là do chúng ta bỏ tiền giảm giá 30%, hay đơn giản là vì người tiêu dùng luôn mua sắm nhiều hơn vào dịp cuối năm?",
        ),
        (
            125,
            "Nếu chỉ so sánh số liệu trước và sau ngày 11/11, bạn sẽ phạm phải sai lầm ngụy biện kinh điển: Post hoc ergo propter hoc (Sau sự việc không có nghĩa là Do sự việc).",
        ),
        (
            175,
            "Phương pháp Sai Biệt Kép (Difference-in-Differences - DiD) ra đời để giải quyết triệt để vấn đề này!",
        ),
        (
            225,
            "DiD so sánh sự thay đổi của Nhóm Can thiệp (Treatment Group - các gian hàng giảm giá sâu) với Nhóm Đối chứng (Control Group - các gian hàng cùng ngành hàng giữ nguyên giá).",
        ),
        (
            275,
            "Bằng cách lấy sai biệt của hai mức chênh lệch, chúng ta triệt tiêu được hoàn toàn yếu tố xu hướng thị trường tự nhiên theo mùa vụ!",
        ),
        (
            330,
            "Hệ số tương tác beta 3 trong mô hình hồi quy chính là Tác động Nhân quả Thuần túy (Causal Treatment Effect) của chương trình giảm giá.",
        ),
        (
            390,
            "Hãy cùng tôi khám phá chi tiết ma trận 2 nhân 2 và giả định xu hướng song song trong tài liệu đọc chuyên sâu!",
        ),
        (
            440,
            "Kỹ thuật này sẽ là nền tảng để bạn bước vào Khóa 3 về Định giá Động và Tâm lý học Hành vi!",
        ),
    ]
    for ts, txt in raw_transcripts_econ3:
        item6_econ_v3.interactive_transcripts.append(
            InteractiveTranscriptModel(timestamp_seconds=ts, text=txt)
        )

    item6_econ_v3.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=150,
            question="Biến giả (Dummy Variable) trong kinh tế lượng là gì và thường nhận những giá trị nào?",
            options=[
                "Biến định tính nhị phân chỉ nhận giá trị 0 hoặc 1 để đại diện cho sự hiện diện của một thuộc tính hoặc chính sách",
                "Biến số có giá trị ngẫu nhiên do máy tính tự tạo ra để kiểm tra lỗi",
                "Biến liên tục đo lường thời gian trôi qua giữa hai giao dịch",
                "Biến đại diện cho tỷ lệ lạm phát hàng năm của nền kinh tế",
            ],
            correct_option_index=0,
            explanation="Dummy Variable là biến số nhị phân nhận giá trị 1 nếu đối tượng mang đặc điểm (ví dụ: ngày Mega-Sale, khách hàng VIP) và nhận giá trị 0 nếu ngược lại.",
        )
    )
    item6_econ_v3.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=350,
            question="Trong mô hình Sai biệt kép (DiD) Y = beta0 + beta1*Treat + beta2*Post + beta3*(Treat*Post) + e, hệ số nào đo lường hiệu ứng nhân quả thực sự của chiến dịch?",
            options=[
                "Hệ số tương tác beta3 (Interaction term giữa Treat và Post)",
                "Hệ số beta1 (Hiệu ứng khác biệt ban đầu của nhóm Treat)",
                "Hệ số beta2 (Xu hướng tăng trưởng tự nhiên theo thời gian Post)",
                "Hệ số chặn beta0",
            ],
            correct_option_index=0,
            explanation="Beta3 chính là đại lượng đo lường chênh lệch kép: [Y(Treat, Post) - Y(Treat, Pre)] - [Y(Control, Post) - Y(Control, Pre)], bóc tách trọn vẹn tác động nhân quả thuần túy.",
        )
    )

    item7_econ_r3 = LearningItemModel(
        id="item-econ-r3",
        lesson_id=lesson3_econ.id,
        title="Tài liệu chuyên sâu: Phương pháp Sai biệt kép (Difference-in-Differences) trong Đánh giá Giá bán",
        type=ItemType.READING,
        estimated_minutes=30,
        reading_markdown=r"""# Đánh giá Hiệu quả Khuyến mãi bằng Phương pháp Sai biệt kép (Difference-in-Differences - DiD)

Một trong những bài toán hóc búa nhất của Giám đốc Tiếp thị (CMO) là chứng minh hiệu quả đầu tư (ROI) của các đợt hạ giá khuyến mãi trên sàn thương mại điện tử.

---

## 1. Thách thức Xác định Mối quan hệ Nhân quả (Causality vs Correlation)

Khi sàn thương mại điện tử triển khai ngày hội Siêu Sale 11/11:
- Doanh thu trung bình mỗi gian hàng tăng từ 100 triệu VNĐ lên 250 triệu VNĐ (+150 triệu VNĐ).
- Ban lãnh đạo kết luận ngay: "Giảm giá 30% giúp tăng 150 triệu doanh thu".
- **Sai lầm chết người:** Quý 4 luôn là mùa mua sắm cao điểm Tết và lễ hội cuối năm. Ngay cả khi không giảm giá, doanh số tự nhiên của thị trường vẫn sẽ tăng trưởng mạnh mẽ!

Để đo lường chính xác tác động nhân quả, chúng ta phải trả lời câu hỏi phản thực nghiệm (Counterfactual Question): **Nếu không giảm giá, nhóm gian hàng này sẽ đạt doanh số bao nhiêu?**

---

## 2. Thiết lập Mô hình Hồi quy Sai biệt kép (DiD Regression Model)

Chúng ta chọn hai nhóm quan sát:
1. **Nhóm Can thiệp (Treatment Group - $T=1$):** 500 gian hàng tham gia chương trình Flash Sale giảm giá sâu 30%.
2. **Nhóm Đối chứng (Control Group - $C=0$):** 500 gian hàng cùng ngành hàng nhưng không tham gia giảm giá, giữ nguyên giá niêm yết.

Phương trình hồi quy kinh tế lượng:
$$\ln(Q_{it}) = \beta_0 + \beta_1 \cdot \text{Treated}_i + \beta_2 \cdot \text{Post}_t + \beta_3 \cdot (\text{Treated}_i \times \text{Post}_t) + \epsilon_{it}$$

Trong đó:
- $\text{Treated}_i = 1$ nếu gian hàng thuộc nhóm giảm giá, $0$ nếu thuộc nhóm đối chứng.
- $\text{Post}_t = 1$ cho giai đoạn sau ngày 11/11, $0$ cho giai đoạn trước đó.
- Biến tương tác $(\text{Treated}_i \times \text{Post}_t) = 1$ CHỈ KHI gian hàng thuộc nhóm giảm giá VÀ đang trong đợt sale.

---

## 3. Ma trận Sai biệt Kép 2x2 (2x2 DiD Matrix)

| Nhóm Đối tượng | Trước Chiến dịch ($\text{Post}=0$) | Sau Chiến dịch ($\text{Post}=1$) | Sai biệt Thời gian ($\Delta$) |
| :--- | :---: | :---: | :---: |
| **Nhóm Can thiệp (Treated)** | $\beta_0 + \beta_1$ | $\beta_0 + \beta_1 + \beta_2 + \beta_3$ | $\beta_2 + \beta_3$ |
| **Nhóm Đối chứng (Control)** | $\beta_0$ | $\beta_0 + \beta_2$ | $\beta_2$ |
| **Sai biệt Kép (Difference-in-Differences)** | — | — | **$\beta_3$** |

Đại lượng sai biệt kép được tính bằng:
$$\text{DiD} = \left( \bar{Y}_{\text{Treated, Post}} - \bar{Y}_{\text{Treated, Pre}} \right) - \left( \bar{Y}_{\text{Control, Post}} - \bar{Y}_{\text{Control, Pre}} \right) \equiv \beta_3$$

- Phần $\beta_2$ đại diện cho mức tăng trưởng mùa vụ tự nhiên của toàn thị trường.
- Phần $\beta_3$ bóc tách chính xác tác động gia tăng thuần túy do chính sách giảm giá mang lại!

---

## 4. Case Study Số liệu Thực tế: Chiến dịch Siêu Sale Shopee 11/11

Phân tích số liệu từ 1.000 gian hàng ngành hàng Phụ kiện Công nghệ:
- Nhóm Giảm giá ($T=1$): Doanh số tăng từ 120 đơn/ngày lên 310 đơn/ngày ($\Delta_T = +190$ đơn).
- Nhóm Giữ giá ($C=0$): Doanh số tăng từ 115 đơn/ngày lên 175 đơn/ngày ($\Delta_C = +60$ đơn do mùa mua sắm).
- **Tác động Nhân quả Thực sự của Giảm giá:**
  $$\beta_3 = \Delta_T - \Delta_C = 190 - 60 = 130 \text{ đơn/ngày!}$$

Nếu không có nhóm đối chứng DiD, doanh nghiệp đã ngộ nhận rằng chiến dịch mang lại 190 đơn, đánh giá quá cao hiệu quả tới 46%!

---

## 5. Giả định Xu hướng Song song (Parallel Trends Assumption)

DiD chỉ có giá trị khoa học khi thỏa mãn giả định sinh tử: **Trước khi can thiệp xảy ra, nhóm Treatment và nhóm Control phải có xu hướng tăng trưởng song song với nhau theo thời gian.**  
Chúng ta kiểm định giả định này bằng đồ thị Event Study qua các tuần $t-4, t-3, t-2, t-1$. Nếu các hệ số tương tác thời kỳ trước can thiệp không có ý nghĩa thống kê ($p > 0.1$), giả định xu hướng song song được công nhận hoàn toàn!
""",
    )
    lesson3_econ.items = [item6_econ_v3, item7_econ_r3]

    lesson4_econ = LessonModel(
        id="lesson-econ-exam",
        week_module_id=week2_econ.id,
        title="Bài 4: Tổng kết & Đọc hiểu Bảng Thống kê Kinh tế lượng",
        estimated_minutes=30,
    )
    item8_econ_q2 = LearningItemModel(
        id="item-econ-q2",
        lesson_id=lesson4_econ.id,
        title="Đề thi Hoàn thành: Kinh tế lượng Ứng dụng & Dữ liệu Lớn",
        type=ItemType.GRADED_QUIZ,
        estimated_minutes=30,
        quiz_matrix_id="qb-econ-02",
    )
    lesson4_econ.items = [item8_econ_q2]
    week2_econ.lessons = [lesson3_econ, lesson4_econ]

    course5.week_modules = [week1_econ, week2_econ]

    # =========================================================================
    # Course 6: Behavioral Economics & Dynamic Pricing (Advanced)
    # =========================================================================
    course6 = CourseModel(
        id="course-behavioral-pricing-strategy",
        title="Kinh tế học Hành vi & Chiến lược Định giá Doanh nghiệp",
        slug="kinh-te-hoc-hanh-vi-va-chien-luoc-dinh-gia",
        description="Làm chủ tâm lý học hành vi người tiêu dùng (Hiệu ứng Mỏ neo, Chim mồi, Đóng gói giá trị) và thiết kế thuật toán Định giá Động (Dynamic Pricing) dựa trên độ co giãn dữ liệu lớn.",
        partner_name="Học viện Quản trị & Chiến lược Doanh nghiệp",
        partner_logo_url=neu_logo,
        owner_id="user_instructor_econ",
        subject="cat-subj-biz",
        level="cat-lvl-adv",
        status="PUBLISHED",
        price=1890000.0,
        currency="VND",
        financial_aid_enabled=True,
        average_rating=5.0,
        review_count=52,
        foundational_course_ids=[
            "course-microeconomics-foundations",
            "course-applied-econometrics",
        ],
    )

    # =========================================================================
    # Week 1: Behavioral Pricing
    # =========================================================================
    week1_pricing = WeekModuleModel(
        id="week-1-pricing",
        course_id=course6.id,
        week_number=1,
        title="Tuần 1: Tâm lý Học Hành vi & Nghệ thuật Cài cắm Giá (Psychological Pricing)",
        summary="Tìm hiểu Lý thuyết Triển vọng của Daniel Kahneman, giải mã hiệu ứng mỏ neo và cách thiết kế cấu trúc giá định hướng quyết định mua.",
    )

    lesson1_pricing = LessonModel(
        id="lesson-pricing-anchoring",
        week_module_id=week1_pricing.id,
        title="Bài 1: Phá vỡ Giả định Duy lý: Hiệu ứng Mỏ neo & Nỗi sợ Mất mát",
        estimated_minutes=35,
    )

    item1_pricing_v1 = LearningItemModel(
        id="item-pricing-v1",
        lesson_id=lesson1_pricing.id,
        title="Bài giảng: Lý thuyết Triển vọng của Daniel Kahneman & Hiệu ứng Mỏ neo",
        type=ItemType.VIDEO,
        estimated_minutes=16,
        video_url=econ_video_4,
        vtt_subtitle_url="",
    )
    raw_transcripts_pricing1 = [
        (
            0,
            "Chào mừng các bạn đến với khóa học cấp cao nhất trong chuyên ngành: Kinh tế học Hành vi và Chiến lược Định giá Doanh nghiệp.",
        ),
        (
            25,
            "Trong hai khóa học trước, chúng ta dựa trên giả định rằng người tiêu dùng là những cỗ máy tính toán duy lý (Homo Economicus).",
        ),
        (
            65,
            "Họ cân nhắc độ co giãn, so sánh giá cả và tối đa hóa lợi ích một cách hoàn hảo. Nhưng trong thế giới thực, con người có thực sự như vậy?",
        ),
        (
            110,
            "Hai nhà tâm lý học đoạt giải Nobel Kinh tế Daniel Kahneman và Amos Tversky đã chứng minh điều ngược lại: Con người đưa ra quyết định dựa trên cảm xúc và thiên kiến nhận thức!",
        ),
        (
            160,
            "Một trong những phát hiện chấn động nhất là Ác Cảm Mất Mát (Loss Aversion): Nỗi đau khi đánh mất 100.000 đồng đau đớn gấp 2 đến 2.5 lần niềm vui khi nhặt được 100.000 đồng!",
        ),
        (
            215,
            "Tiếp theo là Hiệu Ứng Mỏ Neo (Anchoring Effect): Con số đầu tiên xuất hiện trong mắt khách hàng sẽ trở thành điểm tham chiếu tuyệt đối cho mọi phán xét sau đó.",
        ),
        (
            275,
            "Khi một nhãn hàng thời trang niêm yết: 'Giá niêm yết 1.200.000 VNĐ, Giá ưu đãi hôm nay 590.000 VNĐ', con số 1.2 triệu đóng vai trò là mỏ neo.",
        ),
        (
            335,
            "Khách hàng không còn đánh giá chiếc áo có đáng giá 590k hay không, họ chỉ cảm thấy mình vừa kiếm được món hời tiết kiệm tới 610.000 đồng!",
        ),
        (
            395,
            "Chúng ta cũng sẽ mổ xẻ Hiệu ứng Sở hữu (Endowment Effect) và lý do các dịch vụ như Netflix hay Spotify sẵn sàng cho bạn dùng thử miễn phí 30 ngày.",
        ),
        (
            450,
            "Hãy cùng tôi đi vào tài liệu đọc chuyên sâu để phân tích đường cong S-Curve kỳ diệu của Lý thuyết Triển vọng!",
        ),
    ]
    for ts, txt in raw_transcripts_pricing1:
        item1_pricing_v1.interactive_transcripts.append(
            InteractiveTranscriptModel(timestamp_seconds=ts, text=txt)
        )

    item1_pricing_v1.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=145,
            question="Theo Lý thuyết Triển vọng (Prospect Theory), hệ số Ác cảm Mất mát (Loss Aversion lambda) có giá trị xấp xỉ bao nhiêu?",
            options=[
                "lambda xấp xỉ 2.0 đến 2.5 (Nỗi đau mất mát gấp đôi niềm vui nhận được)",
                "lambda = 1.0 (Niềm vui và nỗi đau hoàn toàn cân bằng đối xứng)",
                "lambda = 0.5 (Niềm vui nhận được lớn gấp đôi nỗi đau mất mát)",
                "lambda = 0.0 (Con người hoàn toàn vô cảm trước được mất tiền bạc)",
            ],
            correct_option_index=0,
            explanation="Các nghiên cứu thực nghiệm đo lường hàm giá trị của Kahneman & Tversky cho thấy hệ số lambda dao động từ 2.0 đến 2.5, khẳng định con người e ngại thua lỗ hơn nhiều so với việc kiếm lời.",
        )
    )
    item1_pricing_v1.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=340,
            question="Khi một cửa hàng điện máy để nhãn 'Giá gốc: 25.000.000đ - Giá khuyến mãi: 18.990.000đ', kỹ thuật tâm lý nào đang được kích hoạt?",
            options=[
                "Hiệu ứng Mỏ neo (Anchoring Effect) kết hợp Định giá Số quyến rũ (Charm Pricing)",
                "Quy luật Cung cầu Cạnh tranh hoàn hảo của Adam Smith",
                "Phương pháp Sai biệt kép Difference-in-Differences",
                "Định giá dựa trên chi phí cận biên MC",
            ],
            correct_option_index=0,
            explanation="Mức giá gốc 25 triệu thiết lập một 'mỏ neo' nhận thức về giá trị cao, khiến mức giá 18.990.000đ trông như một món hời lớn; đồng thời đuôi 990k tận dụng hiệu ứng đọc từ trái sang phải.",
        )
    )

    item2_pricing_r1 = LearningItemModel(
        id="item-pricing-r1",
        lesson_id=lesson1_pricing.id,
        title="Tài liệu chuyên sâu: Lý thuyết Triển vọng của Kahneman & Tversky và Nghệ thuật Neo Giá",
        type=ItemType.READING,
        estimated_minutes=30,
        reading_markdown=r"""# Lý thuyết Triển vọng (Prospect Theory) & Nghệ thuật Neo Giá trong Kinh doanh

Giải Nobel Kinh tế năm 2002 được trao cho Daniel Kahneman đã chính thức hợp nhất tâm lý học nhận thức vào khoa học kinh tế, đặt dấu chấm hết cho huyền thoại về "con người duy lý tuyệt đối".

---

## 1. Hàm Giá trị Hình chữ S (S-Shaped Value Function)

Kahneman & Tversky đề xuất hàm giá trị $v(x)$ với $x$ là sự thay đổi tài sản so với **Điểm Tham Chiếu (Reference Point)**:

$$v(x) = \begin{cases} x^\alpha & \text{với } x \ge 0 \text{ (Vùng Lợi nhuận / Gains)} \\ -\lambda (-x)^\beta & \text{với } x < 0 \text{ (Vùng Tổn thất / Losses)} \end{cases}$$

Trong các nghiên cứu thực nghiệm, các thông số chuẩn được ước lượng là $\alpha \approx \beta \approx 0.88$ và hệ số ác cảm mất mát **$\lambda \approx 2.25$**.

### Ba Đặc tính Tâm lý Cốt lõi của Hàm Giá trị:
1. **Phụ thuộc vào Điểm tham chiếu (Reference Dependence):** Con người không đánh giá giá trị tài sản tuyệt đối, họ đánh giá sự **thay đổi tương đối** (được thêm hay mất đi) so với kỳ vọng ban đầu.
2. **Lợi ích biên giảm dần trong vùng lời (Diminishing Sensitivity for Gains):** Cảm giác sướng khi trúng 20 triệu không lớn gấp đôi khi trúng 10 triệu (đường cong lồi nhẹ).
3. **Ác cảm mất mát dốc đứng trong vùng lỗ (Loss Aversion):** Mất 1 triệu mang lại cảm xúc tiêu cực mãnh liệt gấp 2.25 lần cảm giác hạnh phúc khi nhận được 1 triệu (đường cong dốc đứng gấp đôi).

---

## 2. Ứng dụng Thực chiến 1: Kỹ thuật Neo Giá (Price Anchoring) & Giá Gạch Ngang

Trong thương mại điện tử và bán lẻ, não bộ con người luôn tìm kiếm một điểm tựa thông tin để đánh giá:
- Nếu bạn thấy một chiếc đồng hồ giá 5 triệu VNĐ đứng một mình: Bạn sẽ băn khoăn "Liệu có đắt quá không?".
- Nếu cửa hàng đặt chiếc đồng hồ 5 triệu bên cạnh một chiếc đồng hồ Thụy Sĩ giá 50 triệu: Mỏ neo 50 triệu lập tức định vị chiếc đồng hồ 5 triệu thành một lựa chọn "cực kỳ vừa túi tiền và thông minh"!

### Quy tắc Triển khai Giá Gạch Ngang (Strike-through Pricing):
- Luôn hiển thị mức giá gốc ban đầu bằng phông chữ mờ hơn và có đường gạch ngang `Giá cũ: ~~1.500.000 VNĐ~~`.
- Nêu rõ số tiền tuyệt đối tiết kiệm được: `Tiết kiệm ngay 600.000 VNĐ (40%)`. Con số 600k kích hoạt vùng nhận thưởng của não bộ!

---

## 3. Ứng dụng Thực chiến 2: Hiệu ứng Sở hữu (Endowment Effect) & Chiến lược Dùng thử 30 Ngày

Nhà kinh tế học đoạt giải Nobel Richard Thaler phát hiện ra **Hiệu ứng Sở hữu (Endowment Effect)**: Khi con người đã sở hữu một vật phẩm, họ định giá nó cao hơn gấp nhiều lần so với khi chưa từng sở hữu.

### Cơ chế Chiến lược Dùng thử Miễn phí (Free Trial) của SaaS / Netflix / Spotify:
1. **Ngày 1 đến ngày 29:** Người dùng trải nghiệm dịch vụ miễn phí 100%. Họ tạo playlist nhạc yêu thích, lưu trữ tài liệu lên cloud, hình thành thói quen sinh hoạt gắn liền với sản phẩm. Lúc này, sản phẩm đã trở thành "tài sản cá nhân" của họ.
2. **Ngày thứ 30:** Khi gói dùng thử kết thúc, việc hủy bỏ dịch vụ không còn là "từ chối mua", mà bị não bộ nhìn nhận là **"bị cướp mất một tiện ích quen thuộc"**.
3. **Phản ứng tâm lý:** Dưới tác động của Ác cảm mất mát ($\lambda \approx 2.25$), nỗi sợ mất đi tài khoản và sự tiện lợi lớn gấp đôi khoản phí thuê bao 99.000 VNĐ/tháng. Kết quả là trên 75% người dùng tự nguyện chuyển đổi sang gói trả phí đều đặn!

---

## 4. Hiệu ứng Định vị Số quyến rũ (Charm Pricing - Đuôi .99 / 99.000 VNĐ)

Tại sao các siêu thị từ Walmart cho đến WinMart đều yết giá 199.000 VNĐ thay vì 200.000 VNĐ?
- **Hiệu ứng số bên trái (Left-Digit Effect):** Não bộ người xử lý chữ số từ trái sang phải. Khi nhìn số 199.000đ, mắt nhận diện số "1" đầu tiên và não bộ xếp món hàng vào nhóm "hơn một trăm nghìn", thay vì nhóm "hai trăm nghìn".
- Nghiên cứu của Đại học Chicago và MIT chỉ ra rằng việc đổi giá từ 34 USD thành 39 USD thậm chí còn làm tăng lượng bán thêm 24% so với giá 34 USD vì đuôi số 9 mang tín hiệu tiềm thức về một mặt hàng "đang được xả hàng giảm giá"!
""",
    )
    lesson1_pricing.items = [item1_pricing_v1, item2_pricing_r1]

    # =========================================================================
    # Lesson 2: Decoy Effect & Price Bundling
    # =========================================================================
    lesson2_pricing = LessonModel(
        id="lesson-pricing-decoy-bundling",
        week_module_id=week1_pricing.id,
        title="Bài 2: Hiệu ứng Chim mồi (Decoy Effect) & Đóng gói Giá trị (Price Bundling)",
        estimated_minutes=35,
    )

    item3_pricing_v2 = LearningItemModel(
        id="item-pricing-v2",
        lesson_id=lesson2_pricing.id,
        title="Bài giảng: Thiết kế Gói cước Chim mồi (Decoy Effect) Thúc đẩy Gói Cao cấp",
        type=ItemType.VIDEO,
        estimated_minutes=15,
        video_url=econ_video_4,
        vtt_subtitle_url="",
    )
    raw_transcripts_pricing2 = [
        (
            0,
            "Chào các bạn. Hôm nay chúng ta sẽ giải mã một trong những tuyệt chiêu định giá kinh điển nhất trong giới công nghệ và truyền thông: Hiệu ứng Chim mồi (Decoy Effect).",
        ),
        (30, "Bạn có bao giờ bước vào rạp chiếu phim để mua bắp rang bơ?"),
        (
            65,
            "Hộp nhỏ giá 30.000 đồng, hộp vừa giá 55.000 đồng, và hộp khổng lồ giá 60.000 đồng.",
        ),
        (
            105,
            "Hầu hết mọi người đều chọn ngay hộp khổng lồ 60k và tự nhủ: 'Chỉ thêm 5 ngàn mà được hộp to gấp rưỡi, quá hời!'",
        ),
        (
            150,
            "Nhưng bạn có biết rằng hộp vừa 55k sinh ra trên đời hoàn toàn KHÔNG PHẢI để bán?",
        ),
        (
            195,
            "Nó là một 'Chú Chim Mồi' (Decoy Option) được cấy vào để làm cho hộp 60k trở nên hấp dẫn vượt trội!",
        ),
        (
            245,
            "Hiện tượng này được khoa học gọi là Sự Thống Trị Bất Đối Xứng (Asymmetric Dominance).",
        ),
        (
            300,
            "Giáo sư Dan Ariely đã làm thí nghiệm lừng danh với tạp chí The Economist và chứng minh chim mồi giúp tăng doanh thu thêm 43% một cách ngoạn mục.",
        ),
        (
            355,
            "Chúng ta cũng sẽ tìm hiểu Chiến lược Đóng gói Giá trị (Price Bundling) của McDonald's, KFC và bộ phần mềm Microsoft 365.",
        ),
        (
            410,
            "Bằng cách đóng gói nhiều sản phẩm vào một combo, doanh nghiệp triệt tiêu toàn bộ thặng dư tiêu dùng và tối đa hóa biên lợi nhuận ròng!",
        ),
        (
            460,
            "Hãy cùng tôi khám phá chi tiết số liệu trong bài đọc tình huống kế tiếp!",
        ),
    ]
    for ts, txt in raw_transcripts_pricing2:
        item3_pricing_v2.interactive_transcripts.append(
            InteractiveTranscriptModel(timestamp_seconds=ts, text=txt)
        )

    item3_pricing_v2.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=150,
            question="Bản chất thực sự của gói 'Chim Mồi' (Decoy Option) trong cấu trúc bảng giá 3 tầng là gì?",
            options=[
                "Là lựa chọn bất đối xứng kém hấp dẫn, tồn tại chỉ để tôn vinh và thúc đẩy khách hàng chọn gói mục tiêu cao cấp hơn",
                "Là sản phẩm bán chạy nhất mang lại 90% doanh thu cho doanh nghiệp",
                "Là sản phẩm giá rẻ nhất dành cho đối tượng học sinh, sinh viên",
                "Là gói cước thử nghiệm kỹ thuật trước khi tung ra thị trường chính thức",
            ],
            correct_option_index=0,
            explanation="Gói chim mồi được thiết kế có mức giá gần bằng gói cao cấp nhưng tính năng kém hơn rõ rệt (Asymmetric Dominance), tạo đòn bẩy tâm lý hướng người dùng chọn gói cao cấp mà không hề đắn đo.",
        )
    )
    item3_pricing_v2.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=345,
            question="Chiến lược Đóng gói Giá trị (Price Bundling) như Combo thức ăn nhanh hoặc bộ Microsoft Office mang lại lợi ích kinh tế cốt lõi nào cho doanh nghiệp?",
            options=[
                "Khai thác và triệt tiêu thặng dư người tiêu dùng (Consumer Surplus) bằng cách kết hợp các sản phẩm có độ co giãn khác nhau",
                "Giúp giảm chi phí đóng gói bao bì giấy xuống mức tối thiểu",
                "Giảm bớt nghĩa vụ kê khai thuế giá trị gia tăng đối với từng món ăn lẻ",
                "Bắt buộc người tiêu dùng phải ăn nhiều calo hơn nhu cầu thực tế",
            ],
            correct_option_index=0,
            explanation="Khi đóng gói (Bundling), doanh nghiệp gom nhóm các sản phẩm có mức sẵn lòng trả (WTP) phân tán giữa các khách hàng, giúp doanh nghiệp trích xuất tối đa thặng dư tiêu dùng thành doanh thu bán hàng.",
        )
    )

    item4_pricing_r2 = LearningItemModel(
        id="item-pricing-r2",
        lesson_id=lesson2_pricing.id,
        title="Case Study: Phân tích Gói Cước 3 Tầng của The Economist & Apple iCloud",
        type=ItemType.READING,
        estimated_minutes=35,
        reading_markdown=r"""# Hiệu ứng Chim Mồi (Decoy Effect) & Chiến lược Đóng gói Giá trị

Hiệu ứng Chim Mồi, hay nguyên lý **Thống trị Bất đối xứng (Asymmetric Dominance Effect)**, là công cụ định giáทรง sức mạnh nhất từng được phát hiện trong kinh tế học hành vi.

---

## 1. Thí nghiệm Kinh điển của Dan Ariely với Tạp chí The Economist

Giáo sư Dan Ariely (tác giả cuốn sách bán chạy *Predictably Irrational*) đã phát hiện bảng giá đặt mua báo của *The Economist* với 3 sự lựa chọn kỳ lạ:

### Kịch bản A: Bảng giá Có Chim Mồi (Thực tế của The Economist)
1. **Gói Báo Điện tử (Web Subscription):** $59/năm
2. **Gói Báo In (Print Subscription):** $125/năm *(Chú Chim Mồi!)*
3. **Gói Cả Báo In + Điện tử (Print & Web):** $125/năm

Dan Ariely thử nghiệm trên 100 sinh viên trường Kinh doanh MIT Sloan:
- Chọn gói 1 ($59): **16 sinh viên**
- Chọn gói 2 ($125): **0 sinh viên** (Không ai ngốc đến mức bỏ $125 chỉ để lấy mỗi báo in)
- Chọn gói 3 ($125 combo): **84 sinh viên**
- **Tổng doanh thu thu được:** $16 \times 59 + 84 \times 125 = \$11,444$ (Trung bình **$114.44/khách hàng**).

### Kịch bản B: Bỏ đi Gói Chim Mồi Số 2
Ariely tự hỏi: "Nếu không ai chọn gói số 2, tại sao không vứt nó đi cho bảng giá gọn gàng?". Ông xóa bỏ gói số 2 và đưa bảng giá chỉ còn 2 lựa chọn cho 100 sinh viên khác:
1. **Gói Báo Điện tử:** $59/năm
2. **Gói Cả Báo In + Điện tử:** $125/năm

Kết quả đảo chiều hoàn toàn chấn động:
- Chọn gói 1 ($59): **68 sinh viên** (Tăng từ 16% lên 68%!)
- Chọn gói 2 ($125): **32 sinh viên** (Sụt giảm thảm hại từ 84% xuống 32%!)
- **Tổng doanh thu thu được:** $68 \times 59 + 32 \times 125 = \$8,012$ (Trung bình **$80.12/khách hàng**).

### Kết luận Đột phá:
Gói số 2 hoàn toàn vô dụng về mặt doanh số trực tiếp, nhưng sự hiện diện của nó đã **làm tăng doanh thu thêm 42.8%**! Gói số 2 đóng vai trò thước đo so sánh khiến gói số 3 trông như một món quà được tặng không bản báo điện tử trị giá $59!

---

## 2. Case Study Hiện đại: Bảng Giá Dung Lượng Apple iCloud+

Apple là bậc thầy thế giới trong việc áp dụng bảng giá 3 tầng (Tiered Pricing Matrix):

| Gói Dung lượng | Giá cước hàng tháng (VNĐ) | Đơn giá / GB | Vai trò Chiến lược trong Bảng giá |
| :--- | :---: | :---: | :--- |
| **Gói 50 GB** | 19.000 VNĐ | 380 đ/GB | **Mồi nhử gia nhập (Entry Tier):** Giá quá rẻ để vượt qua rào cản tâm lý |
| **Gói 200 GB** | 59.000 VNĐ | 295 đ/GB | **Chim mồi cận trên (Decoy Tier):** Kích thích người dùng gia đình |
| **Gói 2 TB (2,000 GB)** | 199.000 VNĐ | 99.5 đ/GB | **Gói Mục tiêu Siêu Lợi nhuận (Star Tier):** Đơn giá rẻ gấp 4 lần gói 50GB! |

- Người dùng ban đầu mua gói 50GB (19k/tháng). Sau 6 tháng chụp ảnh, dung lượng đầy.
- Khi vào bảng nâng cấp: Gói 200GB (59k) trông khá tốt, nhưng gói 2TB (199k) có dung lượng gấp 10 lần mà giá chỉ gấp 3.3 lần! Hàng chục triệu người dùng đã nâng thẳng lên gói 2TB, mang lại dòng tiền đăng ký (ARR) định kỳ khổng lồ cho Apple Services.

---

## 3. Chiến lược Đóng gói Giá trị (Price Bundling)

Đóng gói giá trị là nghệ thuật bán hai hoặc nhiều sản phẩm riêng biệt trong một gói combo duy nhất với mức giá chiết khấu.

### Hai Mô hình Đóng gói Chính:
1. **Đóng gói Thuần túy (Pure Bundling):** Khách hàng bắt buộc phải mua trọn gói, không bán lẻ (ví dụ: Kênh truyền hình cáp trọn gói 100 kênh).
2. **Đóng gói Hỗn hợp (Mixed Bundling):** Khách hàng có thể mua lẻ từng món hoặc mua combo (ví dụ: Combo Burger + Khoai + Nước của McDonald's).

### Tại sao Price Bundling lại Tối ưu hóa Doanh thu?
Giả sử có 2 khách hàng A và B với Mức sẵn lòng chi trả (WTP):
- Khách hàng A (Thích Word hơn): WTP Word = 1.000.000đ; WTP Excel = 600.000đ.
- Khách hàng B (Dân kế toán thích Excel hơn): WTP Word = 500.000đ; WTP Excel = 1.100.000đ.

- **Nếu bán lẻ riêng từng phần mềm:**
  - Định giá Word 1 triệu: Chỉ bán cho A $\implies$ Doanh thu = 1 triệu. Định giá 500k: Bán cho cả A và B $\implies$ Doanh thu = 1 triệu.
  - Tương tự với Excel: Doanh thu tối đa từ Excel = 1.2 triệu.
  - **Tổng doanh thu bán lẻ tối đa:** 1.0 tr + 1.2 tr = **2.2 triệu VNĐ**.

- **Nếu Microsoft áp dụng Đóng gói Combo (Word + Excel):**
  - Tổng WTP của Khách hàng A = 1.0tr + 0.6tr = **1.6 triệu VNĐ**.
  - Tổng WTP của Khách hàng B = 0.5tr + 1.1tr = **1.6 triệu VNĐ**.
  - Microsoft định giá gói Combo Office đúng bằng **1.6 triệu VNĐ**: Cả hai khách hàng A và B đều vui vẻ mua ngay!
  - **Tổng doanh thu thu được:** $1.6 \text{ tr} \times 2 = \mathbf{3.2\text{ triệu VNĐ}}$!

Bằng phương pháp Đóng gói Hỗn hợp, Microsoft đã **gia tăng 45% doanh thu** mà không tốn thêm một đồng chi phí sản xuất phần mềm nào!
""",
    )

    item5_pricing_q1 = LearningItemModel(
        id="item-pricing-q1",
        lesson_id=lesson2_pricing.id,
        title="Bài kiểm tra: Tâm lý Học Hành vi trong Định giá",
        type=ItemType.GRADED_QUIZ,
        estimated_minutes=25,
        quiz_matrix_id="qb-pricing-01",
    )
    lesson2_pricing.items = [item3_pricing_v2, item4_pricing_r2, item5_pricing_q1]
    week1_pricing.lessons = [lesson1_pricing, lesson2_pricing]

    # =========================================================================
    # Week 2: Dynamic Pricing Algorithms
    # =========================================================================
    week2_pricing = WeekModuleModel(
        id="week-2-pricing",
        course_id=course6.id,
        week_number=2,
        title="Tuần 2: Thuật toán Định giá Động & Tối ưu hóa Doanh thu Đa kênh",
        summary="Ứng dụng chỉ số Lerner và độ co giãn từ dữ liệu thực tế để xây dựng cơ chế định giá động theo thời gian thực cho nền tảng số.",
    )

    lesson3_pricing = LessonModel(
        id="lesson-pricing-dynamic",
        week_module_id=week2_pricing.id,
        title="Bài 3: Thuật toán Định giá Động (Dynamic Pricing Algorithm) & Chỉ số Lerner",
        estimated_minutes=45,
    )

    item6_pricing_v3 = LearningItemModel(
        id="item-pricing-v3",
        lesson_id=lesson3_pricing.id,
        title="Bài giảng: Cơ chế Định giá Động Thời gian thực (Surge Pricing) của Grab & Hàng không",
        type=ItemType.VIDEO,
        estimated_minutes=16,
        video_url=econ_video_4,
        vtt_subtitle_url="",
    )
    raw_transcripts_pricing3 = [
        (
            0,
            "Chào mừng các bạn đến với đỉnh cao của chuyên ngành: Thuật toán Định giá Động (Dynamic Pricing).",
        ),
        (
            30,
            "Các bạn đã đi một hành trình rất dài: Từ công thức Độ co giãn PED ở Khóa 1, đến mô hình hồi quy OLS Log-Log ước lượng từ dữ liệu lớn ở Khóa 2.",
        ),
        (
            75,
            "Giờ đây, chúng ta sẽ kết hợp cả hai để giải bài toán định giá tối ưu bằng thuật toán thời gian thực!",
        ),
        (
            120,
            "Nhà kinh tế học Abba Lerner đã đưa ra một thước đo bất hủ gọi là Chỉ Số Lerner: L bằng P trừ MC chia cho P, và nó đúng bằng âm 1 trên PED!",
        ),
        (
            175,
            "Từ phương trình vi tích phân này, ta rút ra công thức định giá vàng: Mức giá tối ưu P sao bằng Chi phí biên MC nhân với hệ số Markup phụ thuộc vào độ co giãn.",
        ),
        (
            230,
            "Khi thị trường co giãn kém, hệ số nhân giá có thể tăng vọt mà khách hàng vẫn chấp nhận chi trả.",
        ),
        (
            285,
            "Hãy nhìn vào thuật toán Surge Pricing của Grab, Gojek hay Uber vào lúc 17:30 chiều trời mưa to giông bão tại ngã tư Cầu Giấy.",
        ),
        (
            340,
            "Số lượng người mở app gọi xe tăng gấp 5 lần (Cầu bùng nổ), trong khi tài xế tấp vào lề trú mưa (Cung thu hẹp).",
        ),
        (
            395,
            "Nhu cầu về nhà tránh mưa trở nên cực kỳ cấp bách, khiến độ co giãn của khách hàng tụt giảm mạnh, họ trở nên kém nhạy cảm với giá!",
        ),
        (
            450,
            "Thuật toán tự động kích hoạt hệ số nhân giá Surge Multiplier 2.2x. Mức giá cao này vừa sàng lọc những người thực sự cần đi gấp, vừa thúc đẩy tài xế mặc áo mưa hòa vào dòng xe phục vụ thị trường!",
        ),
        (
            505,
            "Hãy đọc tài liệu chuyên sâu để nắm vững công thức tối ưu hóa lợi nhuận và chuẩn bị làm Đồ án cuối khóa!",
        ),
    ]
    for ts, txt in raw_transcripts_pricing3:
        item6_pricing_v3.interactive_transcripts.append(
            InteractiveTranscriptModel(timestamp_seconds=ts, text=txt)
        )

    item6_pricing_v3.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=155,
            question="Theo quy tắc định giá tối ưu hóa lợi nhuận dựa trên Chỉ số Lerner (Lerner Index), mức giá P* liên hệ với chi phí biên MC và độ co giãn PED như thế nào?",
            options=[
                "P* = MC * [PED / (PED + 1)]",
                "P* = MC + PED",
                "P* = MC / PED^2",
                "P* = MC * (1 - PED)",
            ],
            correct_option_index=0,
            explanation="Từ điều kiện đạo hàm lợi nhuận bằng 0: (P - MC)/P = -1/PED, ta biến đổi đại số: 1 - MC/P = -1/PED <=> MC/P = 1 + 1/PED = (PED + 1)/PED => P* = MC * [PED / (PED + 1)].",
        )
    )
    item6_pricing_v3.in_video_quizzes.append(
        InVideoQuizModel(
            timestamp_seconds=355,
            question="Mục đích kinh tế quan trọng nhất của thuật toán tăng giá giờ cao điểm (Surge Pricing) của Grab và Uber là gì?",
            options=[
                "Tái lập trạng thái cân bằng thị trường: Vừa hạ nhiệt nhu cầu dư thừa, vừa kích thích thêm tài xế mở app nhận cuốc xe",
                "Để tối đa hóa sự trừng phạt đối với những hành khách không đặt xe sớm",
                "Để thu thêm tiền nộp phạt vi phạm trật tự giao thông đô thị",
                "Tạo ra rào cản độc quyền ngăn chặn các hãng taxi truyền thống",
            ],
            correct_option_index=0,
            explanation="Surge Pricing là cơ chế giá cả thị trường tự do linh hoạt: Giá cao điều tiết bớt những hành khách có thể chờ đợi, đồng thời tạo động lực tài chính mạnh mẽ để lôi kéo tài xế ra đường phục vụ.",
        )
    )

    item7_pricing_r3 = LearningItemModel(
        id="item-pricing-r3",
        lesson_id=lesson3_pricing.id,
        title="Tài liệu chuyên sâu: Thuật toán Định giá Động (Dynamic Pricing Algorithm), Chỉ số Lerner & Cân bằng Thị trường",
        type=ItemType.READING,
        estimated_minutes=35,
        reading_markdown=r"""# Thuật toán Định giá Động (Dynamic Pricing) & Công thức Tối ưu hóa Lerner

> 💡 **Khuyến nghị Kiến thức Tích hợp Toàn khóa:**  
> Bài học này là điểm hội tụ của toàn bộ chương trình đào tạo:
> - Sử dụng khái niệm **Độ co giãn của Cầu theo Giá ($\varepsilon_d$)** từ **Khóa 1 (Bài 2)**.
> - Sử dụng mô hình **Hồi quy OLS Log-Log ước lượng $\beta_1$** từ **Khóa 2 (Bài 2)**.  
> *Học viên có thể kích hoạt Trợ lý AI ở thanh bên phải để tra cứu lại công thức toán học mà không làm gián đoạn bài học.*

---

## 1. Bài toán Tối ưu hóa Lợi nhuận của Doanh nghiệp

Xét một doanh nghiệp có sức mạnh thị trường nhất định (Monopolistic Competition hoặc Oligopoly) đối mặt với đường cầu nghịch đảo $P(Q)$.  
Hàm tổng lợi nhuận của doanh nghiệp:
$$\pi(Q) = TR(Q) - TC(Q) = P(Q) \times Q - TC(Q)$$

Lấy đạo hàm bậc nhất của lợi nhuận theo sản lượng $Q$ và cho bằng $0$ (First-Order Condition - FOC):
$$\frac{d\pi}{dQ} = \frac{d(TR)}{dQ} - \frac{d(TC)}{dQ} = MR - MC = 0 \iff MR = MC$$

Phân tích doanh thu biên $MR$:
$$MR = \frac{d[P(Q) \times Q]}{dQ} = P + Q \frac{dP}{dQ} = P \left[ 1 + \frac{Q}{P} \frac{dP}{dQ} \right] = P \left[ 1 + \frac{1}{\varepsilon_d} \right]$$

---

## 2. Thiết lập Chỉ số Lerner & Công thức Định giá Vàng (Optimal Markup)

Cân bằng điều kiện $MR = MC$:
$$P \left[ 1 + \frac{1}{\varepsilon_d} \right] = MC$$

Biến đổi đại số:
$$\frac{P - MC}{P} = -\frac{1}{\varepsilon_d} \equiv L \quad \text{(Chỉ số Lerner)}$$

Rút ra công thức định giá tối ưu $P^*$ cho thuật toán máy tính:

$$P^* = MC \times \left( \frac{\varepsilon_d}{\varepsilon_d + 1} \right) = MC \times \text{Markup Factor}$$

### Bảng Phân tích Độ nhạy của Hệ số Markup theo Độ co giãn $|\varepsilon_d|$:

| Hệ số Co giãn $|\varepsilon_d|$ | Trạng thái Thị trường | Tỷ lệ Markup $\left(\frac{\varepsilon_d}{\varepsilon_d - 1}\right)$ | Mức giá Tối ưu ($P^*$ với $MC=100k$) | Chiến lược Kinh doanh Phù hợp |
| :---: | :--- | :---: | :---: | :--- |
| **1.1** | Cực kỳ kém nhạy cảm | **11.00x** | 1,100,000 VNĐ | Hàng độc quyền, thuốc cấp cứu, giờ bão lụt |
| **1.5** | Ít nhạy cảm với giá | **3.00x** | 300,000 VNĐ | Giờ cao điểm tan tầm, sản phẩm thương hiệu mạnh |
| **2.0** | Nhạy cảm trung bình | **2.00x** | 200,000 VNĐ | Bán lẻ tiêu dùng thông thường |
| **3.0** | Rất nhạy cảm với giá | **1.50x** | 150,000 VNĐ | Cạnh tranh gay gắt, nhiều hàng thay thế |
| **10.0** | Cực kỳ co giãn | **1.11x** | 111,000 VNĐ | Sát cạnh tranh hoàn hảo, chỉ lấy công làm lãi |

---

## 3. Kiến trúc Thuật toán Định giá Động Thực chiến của Grab & Uber

Các siêu ứng dụng gọi xe không sử dụng bảng giá cố định theo km, mà vận hành một hệ thống phân tích dữ liệu không gian thời gian (Spatial-Temporal Dynamic Pricing Engine):

### 3.1. Phân mảnh Không gian theo Lưới H3 Geohash
Bản đồ thành phố (như Hà Nội hoặc TP.HCM) được chia thành hàng triệu ô lục giác theo thuật toán **Uber H3 Spatial Index Resolution 8** (mỗi ô có diện tích xấp xỉ $0.737 \text{ km}^2$, đường kính $\sim 460\text{m}$).

### 3.2. Chu kỳ Tính toán Đo lường Cung - Cầu 15 Giây/Lần
Cứ mỗi 15 giây, thuật toán đo lường hai vector trạng thái trong từng ô lục giác $h$:
- **Lực Cầu ($D_h$):** Số lượng người dùng đang mở màn hình đặt xe (App Ping Requests).
- **Lực Cung ($S_h$):** Số lượng tài xế rảnh đang bật ứng dụng sẵn sàng nhận cuốc trong bán kính $2\text{ km}$.
- **Tỷ lệ Mất cân bằng Cung Cầu:** $R_h = \frac{D_h}{S_h + \epsilon}$.

### 3.3. Cập nhật Hệ số Nhân Giá Surge Multiplier $k_h(t)$
Hệ số nhân giá được cập nhật theo hàm sigmoid mượt mà nhằm tránh giật sốc:

$$k_h(t) = \min \left( k_{\max}, 1.0 + \gamma \cdot \ln \left( \max(1.0, R_h) \right) \times \frac{1}{|\hat{\varepsilon}_{d, h}(t)|} \right)$$

- Trong đó $\hat{\varepsilon}_{d, h}(t)$ là hệ số co giãn được ước lượng thời gian thực từ mô hình OLS Log-Log của chính ô địa lý đó trong điều kiện thời tiết hiện tại.
- Khi trời mưa to, $|\hat{\varepsilon}_d|$ giảm mạnh, cho phép hệ số $k_h$ nhảy từ $1.0\times$ lên $2.2\times$.

---

## 4. Rủi ro Đạo đức, Phản ứng Tiêu cực (Algorithmic Backlash) & Giải pháp

- **Nguy cơ:** Việc giá xe tăng vọt gấp 3 lần trong đợt ngập lụt hay khủng hoảng có thể làm tổn hại nghiêm trọng danh tiếng thương hiệu, khiến khách hàng giận dữ tẩy chay vì cho rằng doanh nghiệp "trục lợi trên nỗi đau đồng bào".
- **Giải pháp Công nghệ & Quản trị:**
  1. **Đặt Trần Giá Tối đa (Surge Cap):** Quy định hệ số $k \le 2.5$ trong mọi trường hợp thiên tai.
  2. **Minh bạch hóa Biểu phí (Transparent Breakdown):** Hiển thị rõ: "Giá cước cơ bản: 50.000đ + Phụ phí giờ cao điểm thời tiết xấu: 35.000đ (100% chuyển cho tài xế)".
  3. **Tặng Lựa chọn Trì hoãn (Wait & Save):** Cho phép người dùng chọn: "Đi ngay: 85k" hoặc "Chờ 15 phút sau giá hạ: 50k".
""",
    )
    lesson3_pricing.items = [item6_pricing_v3, item7_pricing_r3]

    # Lesson 4: Capstone Peer Review & Final Exam
    lesson4_pricing = LessonModel(
        id="lesson-pricing-exam",
        week_module_id=week2_pricing.id,
        title="Bài 4: Đồ án Cuối khóa & Thiết kế Ma trận Giá 3 Tầng",
        estimated_minutes=60,
    )

    sample_pricing_rubric = [
        {
            "criterion": "1. Customer Segmentation & Willingness-to-Pay (WTP) Analysis",
            "max_points": 25,
            "description": "Xác định rõ ràng ít nhất 3 chân dung khách hàng mục tiêu, phân tích độ nhạy cảm về giá và ước lượng khoảng sẵn sàng chi trả (WTP).",
        },
        {
            "criterion": "2. Behavioral Architecture & Decoy Effect Design",
            "max_points": 25,
            "description": "Thiết kế gói Chim mồi (Decoy Option) chuẩn mực theo nguyên lý Thống trị bất đối xứng; ứng dụng kỹ thuật neo giá và định khung tâm lý.",
        },
        {
            "criterion": "3. Quantitative Pricing Model & Markup Margin Justification",
            "max_points": 25,
            "description": "Áp dụng công thức Lerner và độ co giãn OLS để tính toán mức giá tối ưu và chứng minh biên lợi nhuận ròng của gói mục tiêu.",
        },
        {
            "criterion": "4. Go-To-Market Execution & A/B Testing Validation Plan",
            "max_points": 25,
            "description": "Xây dựng kế hoạch thử nghiệm A/B Testing trên tập người dùng thực tế và phương án xử lý rủi ro tâm lý người dùng khi điều chỉnh giá.",
        },
    ]

    item_pricing_peer_1 = LearningItemModel(
        id="item-pricing-peer-1",
        lesson_id=lesson4_pricing.id,
        title="Đồ án Đánh giá Chéo: Thiết kế Chiến lược Bảng giá 3 Tầng Toàn diện cho Doanh nghiệp SaaS",
        type=ItemType.PEER_REVIEW,
        estimated_minutes=60,
        rubric_criteria_json=json.dumps(sample_pricing_rubric),
    )

    item8_pricing_q2 = LearningItemModel(
        id="item-pricing-q2",
        lesson_id=lesson4_pricing.id,
        title="Đề thi Hoàn thành: Chiến lược Định giá Doanh nghiệp Toàn diện",
        type=ItemType.GRADED_QUIZ,
        estimated_minutes=30,
        quiz_matrix_id="qb-pricing-02",
    )
    lesson4_pricing.items = [item_pricing_peer_1, item8_pricing_q2]
    week2_pricing.lessons = [lesson3_pricing, lesson4_pricing]

    course6.week_modules = [week1_pricing, week2_pricing]

    # Specializations are created on-demand by instructors via the Instructor Portal
    # rather than hardcoded in seed data, ensuring zero drift between course owners and bundles.
    return [course1, course2, course3, course4, course5, course6], []


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
        CourseReviewModel(
            id="rev-micro-01",
            user_id="user_learner_demo",
            user_name="Nguyễn Văn A",
            course_id="course-microeconomics-foundations",
            rating_stars=5,
            comment_text="Khóa học đặt nền móng cực kỳ vững chắc về kinh tế học vi mô! Bài giảng về Độ co giãn Cầu rất trực quan và dễ hiểu.",
            created_at="2026-07-24T18:30:00Z",
            is_verified_completer=True,
        ),
        CourseReviewModel(
            id="rev-micro-02",
            user_id="user_learner_02",
            user_name="Trần Thị B",
            course_id="course-microeconomics-foundations",
            rating_stars=5,
            comment_text="Thầy Tuấn giảng xuất sắc! Các ví dụ thực tế về giá xăng và trà sữa giúp mình hiểu rõ bản chất công thức PED.",
            created_at="2026-07-24T19:00:00Z",
            is_verified_completer=True,
        ),
        CourseReviewModel(
            id="rev-micro-03",
            user_id="user_learner_03",
            user_name="Lê Hoàng C",
            course_id="course-microeconomics-foundations",
            rating_stars=5,
            comment_text="Tài liệu đọc chất lượng cao, bài kiểm tra trắc nghiệm thiết kế rất sát thực tế.",
            created_at="2026-07-24T20:15:00Z",
            is_verified_completer=True,
        ),
        CourseReviewModel(
            id="rev-econ-01",
            user_id="user_learner_demo",
            user_name="Nguyễn Văn A",
            course_id="course-applied-econometrics",
            rating_stars=5,
            comment_text="Một khóa học kinh tế lượng hiếm hoi tập trung vào dữ liệu bán lẻ thực chiến thay vì lý thuyết suông. Khuyên mọi người nên học khóa Vi mô trước.",
            created_at="2026-07-25T10:00:00Z",
            is_verified_completer=False,
        ),
        CourseReviewModel(
            id="rev-econ-02",
            user_id="user_learner_02",
            user_name="Trần Thị B",
            course_id="course-applied-econometrics",
            rating_stars=5,
            comment_text="Mô hình hồi quy Log-Log được giải thích cực kỳ sáng tỏ, kết nối trực tiếp với độ co giãn đã học ở khóa trước.",
            created_at="2026-07-25T11:30:00Z",
            is_verified_completer=False,
        ),
        CourseReviewModel(
            id="rev-pricing-01",
            user_id="user_learner_02",
            user_name="Trần Thị B",
            course_id="course-behavioral-pricing-strategy",
            rating_stars=5,
            comment_text="Khóa học đỉnh cao cho bất kỳ ai làm Product Manager hoặc Giám đốc Kinh doanh! Phân tích cơ chế giá Grab và Apple quá thuyết phục.",
            created_at="2026-07-25T14:00:00Z",
            is_verified_completer=True,
        ),
        CourseReviewModel(
            id="rev-pricing-02",
            user_id="user_learner_03",
            user_name="Lê Hoàng C",
            course_id="course-behavioral-pricing-strategy",
            rating_stars=5,
            comment_text="Hiệu ứng chim mồi và mỏ neo giá giúp tối ưu hóa doanh thu ngay trong dự án startup của tôi. Rất đáng đồng tiền!",
            created_at="2026-07-25T15:30:00Z",
            is_verified_completer=True,
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
        CourseAnnouncementModel(
            id="ann-micro-01",
            course_id="course-microeconomics-foundations",
            author_id="user_instructor_econ",
            author_name="PGS. TS. Trần Minh Tuấn",
            title="[Thông báo] Chào mừng học viên khóa Kinh tế Vi mô & Lịch giải đáp bài tập",
            content="Chào mừng các bạn đến với khóa học Kinh tế Vi mô! Các bạn vui lòng ôn tập kỹ khái niệm Đường Cầu và Hệ số Co giãn trước khi làm bài tập Graded Quiz Tuần 1. Chúc các bạn học tốt!",
            created_at="2026-07-24T18:00:00Z",
        ),
        CourseAnnouncementModel(
            id="ann-econ-01",
            course_id="course-applied-econometrics",
            author_id="user_instructor_econ",
            author_name="TS. Lê Hoàng Nam",
            title="[Tài nguyên] Bộ dữ liệu 100.000 giao dịch bán lẻ mẫu & Code Python hồi quy",
            content="Tài liệu thực hành Tuần 1 đã được cập nhật. Các bạn hãy tải file dữ liệu CSV và thực hành chạy mô hình hàm cầu Log-Log để đối chiếu với hệ số độ co giãn lý thuyết.",
            created_at="2026-07-25T10:00:00Z",
        ),
        CourseAnnouncementModel(
            id="ann-pricing-01",
            course_id="course-behavioral-pricing-strategy",
            author_id="user_instructor_econ",
            author_name="ThS. Nguyễn Đình Khôi",
            title="[Case Study] Khám phá thuật toán Surge Pricing thực tế của Grab",
            content="Chúc mừng các bạn đã bước vào khóa học nâng cao! Trong Tuần 2, chúng ta sẽ mổ xẻ trực tiếp công thức định giá động của các hãng gọi xe công nghệ. Chúc các bạn học tập hiệu quả!",
            created_at="2026-07-25T11:00:00Z",
        ),
    ]
    for ann in announcements:
        await session.merge(ann)
