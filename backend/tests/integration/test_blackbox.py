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
        "role": 2 # USER_ROLE_INSTRUCTOR
    }
    
    # Request theo chuẩn ConnectRPC (HTTP POST + JSON)
    resp = await client.post(
        "/identity.v1.IdentityService/Register",
        json=reg_payload,
        headers={"Content-Type": "application/json"}
    )
    assert resp.status_code == 200
    
    # --- 2. ĐĂNG NHẬP (LOGIN) ---
    login_payload = {
        "email": email,
        "password": password
    }
    resp = await client.post(
        "/identity.v1.IdentityService/Login",
        json=login_payload,
        headers={"Content-Type": "application/json"}
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
            "Authorization": f"Bearer {access_token}"
        }
    )
    assert resp.status_code == 200, f"Error: {resp.text}"
    data = resp.json()
    assert data["user"]["email"] == email
    
 
    
    # --- 4. LẤY DANH SÁCH KHÓA HỌC (CATALOG) ---
    resp = await client.post(
        "/catalog.v1.CatalogService/ListCourses",
        json={"pageSize": 10},
        headers={"Content-Type": "application/json"}
    )
    assert resp.status_code == 200
    data = resp.json()
    courses = data.get("courses", [])
    assert len(courses) > 0, f"Expected courses but got none. Response: {data}"
    
    first_course_id = courses[0]["id"]
    
    # --- 5. CẬP NHẬT TIẾN ĐỘ HỌC TẬP (LEARNING) ---
    # Call GetCourseProgress 
    progress_req = {
        "courseId": first_course_id
    }
    resp = await client.post(
        "/learning.v1.LearningService/GetProgress",
        json=progress_req,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
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
        "itemId": "item-ml-intro-video", # Giả định ID này
        "totalCourseItems": 10
    }
    resp = await client.post(
        "/learning.v1.LearningService/MarkItemComplete",
        json=update_req,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
    )
    assert resp.status_code == 200, f"Error: {resp.text}"
