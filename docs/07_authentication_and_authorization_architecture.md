# 07. Kiến Trúc Xác Thực (AuthN) & Phân Quyền Hỗ Trợ Đa Tổ Chức (AuthZ & Entity Method)

Tài liệu này mô tả chi tiết kiến trúc kỹ thuật Xác thực (Authentication) Stateless và Phân quyền theo mô hình **Siêu Tối Giản (Direct Role & Entity Method Check)**.

---

## 1. Tổng quan Kiến trúc Siêu Tối Giản

Hệ thống loại bỏ hoàn toàn các lớp trung gian (Permission Strings, các file Policy rườm rà), đưa phân quyền về đúng **2 Khái niệm Tự nhiên & Trực tiếp nhất**:

1. **System Role (Vai trò Hệ thống)**:
   * `USER_ROLE_ADMIN`: Quản trị viên hệ thống (Cho phép toàn quyền vận hành).
   * `USER_ROLE_INSTRUCTOR`: Giảng viên.
   * `USER_ROLE_LEARNER`: Học viên cá nhân.
2. **Resource Relationship (Quan hệ với Tài nguyên)**:
   * Được đóng gói trực tiếp vào **Entity Method** của Domain Model (ví dụ: `course.can_edit(user)`).

---

## 2. Thẩm định Quyền Hạn Tự nhiên trên Domain Entity (`Course.can_edit`)

Mọi logic thẩm định quyền sở hữu và trạng thái chỉnh sửa khóa học được đóng gói trực tiếp bên trong Domain Entity `Course` (`backend/src/modules/catalog/domain/entities.py`):

```python
class Course(Entity):
    def can_edit(
        self,
        user: Any,
        allow_read_only_pending: bool = False,
    ) -> bool:
        if not user or not getattr(user, "id", None):
            return False
        role = getattr(user, "role", "").upper()
        if "ADMIN" in role or role in ("USER_ROLE_ADMIN", "3"):
            return True
        if not allow_read_only_pending and self.status == CourseStatus.PENDING_REVIEW:
            return False
        return bool(
            (self.owner_id and user.id == self.owner_id)
            or (self.co_instructor_ids and user.id in self.co_instructor_ids)
        )
```

---

## 3. Cấu trúc Đối tượng Security Context (`CurrentUserContext`)

Thông tin định danh của User khi đăng nhập thành công được lưu trong `CurrentUserContext` (`backend/src/shared/auth.py`) thông qua `contextvars` per-request:

```python
@dataclass
class CurrentUserContext:
    id: str                 # User ID (sub)
    email: str = ""         # User Email
    full_name: str = ""     # User Full Name
    role: str = ""          # System Role (e.g. USER_ROLE_ADMIN, USER_ROLE_INSTRUCTOR, USER_ROLE_LEARNER)
```

---

## 4. SQL Scope Pushdown (Phân quyền Tầng Database)

Đối với các API lấy Danh sách / Lọc / Tìm kiếm (ví dụ: `ListCourses`), hàm `apply_organization_scope()` (`backend/src/shared/infrastructure/scopes.py`) tự động đẩy điều kiện lọc xuống câu SQL:

```python
def apply_organization_scope(stmt: Select, model_cls: Any, ctx: Optional[CurrentUserContext]) -> Select:
    if ctx and (ctx.role in ("USER_ROLE_ADMIN", "UserRole.ADMIN", "3") or "ADMIN" in ctx.role.upper()):
        return stmt

    org_id_col = getattr(model_cls, "organization_id", None)
    if org_id_col is None:
        return stmt

    return stmt.where(org_id_col == INTERNAL_SYSTEM_ORG_ID)
```

---

## 5. Quy Tắc Thẩm Định Nghiệp Vụ Theo Đối Tượng

| Đối Tượng Nghiệp Vụ | Cơ Chế Thẩm Định | Chi Tiết Quy Tắc |
| :--- | :--- | :--- |
| **Chỉnh sửa / Quản lý Khóa học** | `course.can_edit(user)` | Admin hệ thống HOẶC (Chủ sở hữu `owner_id` / Giảng viên phụ trách `co_instructor_ids`). Khóa học ở trạng thái `PENDING_REVIEW` sẽ ở chế độ Chỉ đọc với Giảng viên. |
| **Phê duyệt / Từ chối Khóa học** | `_is_admin(user)` | Chỉ Quản trị viên hệ thống (`USER_ROLE_ADMIN`). |
| **Quản lý Enterprise Seats** | `_is_admin(user)` | Chỉ Quản trị viên hệ thống (`USER_ROLE_ADMIN`). |
| **Duyệt Đơn Giảng viên** | `_is_admin(user)` | Chỉ Quản trị viên hệ thống (`USER_ROLE_ADMIN`). |
| **Duyệt Hỗ trợ Tài chính / Thu hồi Chứng chỉ** | `_is_admin(user)` | Chỉ Quản trị viên hệ thống (`USER_ROLE_ADMIN`). |
| **Kiểm duyệt Diễn đàn** | `_can_moderate(user)` | Quản trị viên hệ thống HOẶC Giảng viên phụ trách khóa học. |

