# 08. Hướng Dẫn Nghiệp Vụ Mô Hình Đa Tổ Chức & Phân Quyền (Organization & Roles Guide)

Tài liệu này được thiết kế dành cho người mới (Product Owner, BA, Developer, QA/Tester) **chưa có context về hệ thống** có thể nhanh chóng nắm bắt 100% mô hình nghiệp vụ Quản lý Đa Tổ chức và Phân quyền của Nền tảng.

---

## 1. Mô Hình Đa Tổ Chức (Multi-Organization) Là Gì?

Hệ thống hoạt động theo mô hình **Sàn đào tạo dùng chung (Multi-Tenant Platform)**. 
* Hệ thống hỗ trợ nhiều **Tổ chức (Organization)** khác nhau (ví dụ: *Đại học Bách Khoa*, *Đại học FPT*, *Tập đoàn Viettel*...).
* Mỗi Tổ chức tự quản lý danh mục khóa học, thành viên và suất học (Enterprise Seats) của riêng mình.
* Một người dùng duy nhất chỉ cần **01 Tài khoản cá nhân (Email/Password)** nhưng có thể tham gia vào nhiều Tổ chức khác nhau với các vai trò hoàn toàn khác nhau.

---

## 2. Hệ Thống Phân Cấp 3 Tầng Vai Trò (Role Hierarchy)

Để tránh nhầm lẫn giữa "Quyền toàn sàn" và "Quyền trong từng trường học", hệ thống chia làm **3 tầng vai trò riêng biệt**:

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │ TẦNG 1: SYSTEM ROLE (Tầng Nền tảng toàn sàn)                           │
 │ • SUPER_ADMIN : Admin tối cao toàn sàn LMS (toàn quyền trên mọi org)   │
 │ • USER        : Người dùng bình thường trên nền tảng                   │
 └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ TẦNG 2: USER ROLE (Tầng Định danh Cá nhân)                             │
 │ • LEARNER    : Người học cá nhân                                       │
 │ • INSTRUCTOR : Giảng viên tự do (được duyệt nộp đơn giảng dạy cá nhân) │
 └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ TẦNG 3: ORGANIZATION ROLE (Tầng Chức vụ trong 1 Tổ chức cụ thể)       │
 │ • Organization Admin      : Quản trị viên / Chủ sở hữu Tổ chức X       │
 │ • Organization Instructor : Giảng viên thuộc Tổ chức X                │
 │ • Teaching Assistant (TA) : Trợ giảng thuộc Tổ chức X                  │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Chi Tiết Nhiệm Vụ 3 Vai Trò Trong 1 Tổ Chức

Trong **mỗi Tổ chức cụ thể**, người dùng sẽ đảm nhận 1 trong 3 vai trò nghiệp vụ sau:

| Vai trò | Tên Tiếng Việt | Trách nhiệm Nghiệp vụ Chính |
| :--- | :--- | :--- |
| **Organization Admin** | Quản trị viên Tổ chức | • Quản lý thành viên, mời/xóa và phân quyền trong Tổ chức.<br>• Mua, phân bổ và thu hồi Suất học Enterprise Seat cho sinh viên/nhân viên.<br>• Quản lý thông tin thương hiệu (Logo, Banner), chữ ký bảo chứng đại diện cho Tổ chức.<br>• Phê duyệt và quản lý danh mục khóa học của Tổ chức. |
| **Organization Instructor** | Giảng viên Tổ chức | • Biên soạn cấu trúc bài giảng, phụ đề VTT, bài đọc và ma trận đề thi Quiz.<br>• Thiết lập tiêu chí chấm điểm tự luận / bài tập dự án (Rubric Criteria).<br>• Phân công giảng viên đồng phụ trách (`co_instructors`) và xuất bản khóa học.<br>• Xem thống kê tiến độ, điểm số của sinh viên thuộc các khóa học mình dạy. |
| **Teaching Assistant (TA)** | Trợ giảng | • Chấm bài tự luận, giải quyết các đơn phúc khảo bài tập của sinh viên (`TA Regrade Override`).<br>• Quản lý và trả lời thắc mắc trên Diễn đàn thảo luận (Discussion Forum).<br>• Gán cờ câu trả lời chính thức (`is_staff_answer`) để đính lên đầu bài thảo luận. |

---

## 4. Phân Biệt: Thành Viên Tổ Chức (Member) vs Người Được Cấp Suất Học (Enterprise Seat Holder)

Đây là 2 khía cạnh độc lập dễ gây nhầm lẫn nhất:

| Khía cạnh | Thành viên Tổ chức (Organization Member) | Người được cấp Suất học (Enterprise Seat Holder) |
| :--- | :--- | :--- |
| **Bản chất** | **Phân quyền Hành chính (AuthZ)**: "Bạn đóng vai trò/chức vụ gì trong Tổ chức?" | **Tài trợ Bản quyền Học tập (Paid License)**: "Ai trả tiền học cho bạn?" |
| **Vai trò tương ứng** | `Organization Admin`, `Organization Instructor`, `Teaching Assistant`. | Hầu hết là **`Learner`** (Sinh viên / Nhân viên). |
| **Quyền lợi** | Được cấp quyền quản trị, tạo bài giảng hoặc trợ giảng. | Được Tổ chức tài trợ nâng cấp từ **Audit Mode (Miễn phí)** lên **Paid Mode (Trả phí)**: Được làm bài thi tính điểm Graded Quiz, nộp Lab, chấm bài Peer Review và nhận Bằng Verified Certificate mà không cần tự bỏ tiền túi. |

---

## 5. Ví Dụ Luồng Sử Dụng Thực Tế (User Journey)

### 💡 Kịch bản: Anh Nam là một Giảng viên đa năng
1. **Tại Trường Đại học Bách Khoa (`active_org_id = org_bach_khoa`)**:
   * Anh Nam là **Organization Admin**. Anh Nam vào trang quản trị của trường Bách Khoa để tải Logo trường, mời các giảng viên khác vào trường và cấp Suất học cho 500 sinh viên Bách Khoa.
2. **Khi chuyển sang Trường Đại học FPT (`active_org_id = org_fpt`)**:
   * Anh Nam là **Organization Instructor**. Anh Nam chỉ có quyền soạn thảo bài giảng và xem bảng điểm của lớp lập trình mà anh Nam phụ trách tại FPT.
3. **Khi đóng vai trò Cá nhân học tập (`active_org_id = null`)**:
   * Anh Nam là một **Learner** đăng ký học một khóa học Thiết kế đồ họa do Google phát hành. Anh Nam tự bỏ tiền mua khóa học hoặc học ở chế độ Audit Mode miễn phí như bao người dùng khác.
