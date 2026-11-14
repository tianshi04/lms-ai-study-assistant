import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_blackbox_identity_and_learning_flows(client: AsyncClient):
    """
    Kịch bản kiểm thử E2E (Hộp đen):
    1. Đăng ký tài khoản mới (để đảm bảo không phụ thuộc vào Seed data)
    2. Đăng nhập và lấy JWT Token
    3. Kiểm tra API GetProfile bằng Token
    4. Lấy danh sách khóa học (Catalog)
    5. Cập nhật tiến độ học tập (Learning)
    """

    import uuid

    email = f"blackbox_{uuid.uuid4().hex[:8]}@coursera.ai"
    password = "MySecurePassword123!"

    reg_payload = {
        "email": email,
        "password": password,
        "fullName": "Blackbox Test User",
        "role": 2,  # USER_ROLE_INSTRUCTOR
    }

    # Request theo chuẩn ConnectRPC (HTTP POST + JSON)
    resp = await client.post(
        "/identity.v1.IdentityService/Register",
        json=reg_payload,
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200

    # --- 2. ĐĂNG NHẬP (LOGIN) ---
    login_payload = {"email": email, "password": password}
    resp = await client.post(
        "/identity.v1.IdentityService/Login",
        json=login_payload,
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "user" in data
    assert data["user"]["email"] == email

    access_token = data.get("accessToken")
    assert access_token is not None
    assert access_token != ""

    user_id = data["user"]["id"]

    # --- 3. KIỂM TRA PROFILE (AUTH REQUIRED) ---
    resp = await client.post(
        "/identity.v1.IdentityService/GetUserProfile",
        json={"userId": user_id},
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        },
    )
    assert resp.status_code == 200, f"Error: {resp.text}"
    data = resp.json()
    assert data["user"]["email"] == email

    # --- 4. LẤY DANH SÁCH KHÓA HỌC (CATALOG) ---
    resp = await client.post(
        "/catalog.v1.CatalogService/ListCourses",
        json={"pageSize": 10},
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    data = resp.json()
    courses = data.get("courses", [])
    assert len(courses) > 0, f"Expected courses but got none. Response: {data}"

    first_course_id = courses[0]["id"]

    # --- 5. CẬP NHẬT TIẾN ĐỘ HỌC TẬP (LEARNING) ---
    # Call GetCourseProgress
    progress_req = {"courseId": first_course_id}
    resp = await client.post(
        "/learning.v1.LearningService/GetProgress",
        json=progress_req,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        },
    )
    assert resp.status_code == 200, f"Error: {resp.text}"
    data = resp.json()
    assert "progress" in data
    progress_data = data["progress"]
    # Ban đầu tiến độ có thể là 0% hoặc bị lược bỏ nếu bằng 0
    percentage = progress_data.get("percentageCompleted", 0)
    assert percentage >= 0

    # Thử gọi API cập nhật tiến độ cho một item
    # Vì mình không biết ID của lesson/item, mình chỉ test việc gọi API với ID giả
    update_req = {
        "courseId": first_course_id,
        "itemId": "item-ml-intro-video",  # Giả định ID này
    }
    resp = await client.post(
        "/learning.v1.LearningService/MarkItemComplete",
        json=update_req,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        },
    )
    assert resp.status_code == 200, f"Error: {resp.text}"


@pytest.mark.asyncio
async def test_blackbox_instructor_analytics_and_student_reminder(client: AsyncClient):
    """
    Kich ban kiem thu E2E tich hop:
    1. Dang nhap tai khoan Giang vien (instructor@coursera.ai)
    2. Goi GetInstructorAnalytics cho khoa hoc 'course-python-ai'
    3. Xac minh so hoc vien, ty le hoan thanh trung binh, danh sach students kem progressPercent va enrolledAt
    4. Gui nhac nho hoc vien qua SendStudentReminder
    5. Xac minh ket qua tra ve sentCount, success, sentStudentIds
    """
    # 1. Dang nhap Giang vien
    login_resp = await client.post(
        "/identity.v1.IdentityService/Login",
        json={"email": "instructor@coursera.ai", "password": "123456"},
        headers={"Content-Type": "application/json"},
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_data = login_resp.json()
    token = login_data["accessToken"]
    auth_headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    # 2. Goi GetInstructorAnalytics
    analytics_resp = await client.post(
        "/catalog.v1.CatalogService/GetInstructorAnalytics",
        json={"courseId": "course-python-ai"},
        headers=auth_headers,
    )
    assert analytics_resp.status_code == 200, (
        f"GetInstructorAnalytics failed: {analytics_resp.text}"
    )
    analytics_data = analytics_resp.json()
    assert "analytics" in analytics_data
    analytics = analytics_data["analytics"]
    assert analytics["courseId"] == "course-python-ai"
    assert analytics["totalEnrolledStudents"] > 0
    assert "averageCompletionRate" in analytics
    assert "students" in analytics
    students = analytics["students"]
    assert len(students) > 0

    first_student = students[0]
    assert "userId" in first_student
    assert "userName" in first_student
    assert "progressPercent" in first_student
    assert "enrolledAt" in first_student

    # 3. Gui loi nhac nho hoc vien SendStudentReminder
    target_student_id = first_student["userId"]
    reminder_resp = await client.post(
        "/catalog.v1.CatalogService/SendStudentReminder",
        json={
            "courseId": "course-python-ai",
            "studentIds": [target_student_id],
            "title": "Nhac nho tien do hoc tap tuan 2",
            "content": "Chao ban, hay sap xep thoi gian hoan thanh bai quiz tuan nay nhe!",
        },
        headers=auth_headers,
    )
    assert reminder_resp.status_code == 200, (
        f"SendStudentReminder failed: {reminder_resp.text}"
    )
    reminder_data = reminder_resp.json()
    assert reminder_data.get("success") is True
    assert reminder_data.get("sentCount") == 1
    assert target_student_id in reminder_data.get("sentStudentIds", [])
