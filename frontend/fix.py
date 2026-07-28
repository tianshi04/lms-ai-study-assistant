import os
import re

files = {
    'src/app/certificates/page.tsx': {
        't("certificatesPage.errorFetch")': '"Lỗi tải chứng chỉ"',
        't("certificatesPage.title")': '"Chứng chỉ của tôi"',
        't("certificatesPage.subtitle")': '"Quản lý các chứng chỉ bạn đã đạt được"',
        't("certificatesPage.totalCertificates")': '"Tổng số chứng chỉ"',
        't("certificatesPage.searchPlaceholder")': '"Tìm kiếm chứng chỉ..."',
        't("certificatesPage.noCertificatesTitle")': '"Chưa có chứng chỉ nào"',
        't("certificatesPage.noCertificatesDesc")': '"Bạn chưa đạt được chứng chỉ nào. Hãy hoàn thành khóa học để nhận chứng chỉ."',
        't("certificatesPage.exploreCourses")': '"Khám phá khóa học"',
        't("certificatesPage.issuedOn")': '"Cấp ngày"',
        't("certificatesPage.certCode")': '"Mã chứng chỉ"',
        't("certificatesPage.viewCertificate")': '"Xem chứng chỉ"',
    },
    'src/app/instructor/courses/[courseId]/question-bank/page.tsx': {
        't("common.edit")': '"Sửa"',
        't("common.delete")': '"Xoá"',
    }
}

for file_path, replacements in files.items():
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements.items():
        content = content.replace(old, new)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
print("Done fixing remaining t() calls")
