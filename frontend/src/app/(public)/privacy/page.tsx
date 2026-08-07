"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Eye,
  Database,
  Bot,
  Award,
  CreditCard,
  UserCheck,
  Mail,
  Sparkles,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/Breadcrumb";

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
}

const SECTIONS: Section[] = [
  { id: "tong-quan", title: "1. Tổng quan & Cam kết", icon: Shield },
  { id: "du-lieu-thu-thap", title: "2. Dữ liệu cá nhân thu thập", icon: Database },
  { id: "muc-dich-su-dung", title: "3. Mục đích sử dụng thông tin", icon: Eye },
  { id: "ai-assistant", title: "4. Dữ liệu AI Study Assistant", icon: Bot },
  { id: "openbadges", title: "5. Chứng chỉ số OpenBadges 3.0", icon: Award },
  { id: "thanh-toan", title: "6. An toàn thanh toán VNPay", icon: CreditCard },
  { id: "quyen-nguoi-dung", title: "7. Quyền hạn của bạn đối với dữ liệu", icon: UserCheck },
  { id: "bao-mat-luu-tru", title: "8. Bảo mật & Thời gian lưu trữ", icon: Lock },
  { id: "lien-he", title: "9. Thông tin liên hệ DPO", icon: Mail },
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState("tong-quan");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-100px 0px -65% 0px",
        threshold: 0,
      },
    );

    SECTIONS.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Chính sách Bảo mật</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Hero Section */}
        <div className="bg-card rounded-3xl p-8 sm:p-12 border border-border relative overflow-hidden text-center sm:text-left">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
              <Shield className="w-4 h-4" aria-hidden="true" />
              <span>Bảo vệ quyền riêng tư người dùng</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground text-balance">
              Chính sách Bảo mật Thông tin
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Chúng tôi cam kết bảo vệ dữ liệu cá nhân của bạn theo chuẩn quốc tế GDPR và Nghị định
              13/2023/NĐ-CP của Chính phủ Việt Nam. Hãy đọc kỹ cách thức chúng tôi thu thập, bảo mật
              và sử dụng dữ liệu của bạn.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <FileCheck className="w-4 h-4 text-primary" aria-hidden="true" />
                Cập nhật lần cuối: 05/08/2026
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                Phiên bản chính thức v1.0.0
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Sticky Table of Contents Sidebar */}
          <aside className="lg:col-span-1 bg-card rounded-3xl p-5 border border-border lg:sticky lg:top-24 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
              Mục lục chính sách
            </h2>
            <nav className="space-y-1 text-xs">
              {SECTIONS.map((sec) => {
                const IconComponent = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    type="button"
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-left transition-colors font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate">{sec.title}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Policy Content Sections */}
          <main className="lg:col-span-3 space-y-8">
            {/* Section 1 */}
            <section
              id="tong-quan"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <Shield className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  1. Tổng quan & Cam kết Bảo mật
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nền tảng{" "}
                <strong className="font-bold text-foreground">LMS AI Study Assistant</strong> thuộc
                quyền quản lý của dự án LMS AI. Chúng tôi coi trọng việc bảo vệ dữ liệu riêng tư và
                quyền riêng tư của mọi học viên, giảng viên cũng như khách truy cập hệ thống.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chính sách bảo mật này giải thích rõ phương thức dữ liệu cá nhân được thu thập, mã
                hóa, lưu trữ và xử lý minh bạch. Bằng việc đăng ký tài khoản hoặc sử dụng bất kỳ
                dịch vụ nào trên nền tảng, bạn xác nhận đã đọc, hiểu và đồng ý với các điều khoản
                nêu dưới đây.
              </p>
            </section>

            {/* Section 2 */}
            <section
              id="du-lieu-thu-thap"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <Database className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">2. Dữ liệu cá nhân thu thập</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Để cung cấp trải nghiệm học tập cá nhân hóa và quản lý chứng chỉ chính xác, chúng
                tôi thu thập các nhóm dữ liệu sau:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5 leading-relaxed">
                <li>
                  <strong className="text-foreground">Thông tin nhận dạng cá nhân:</strong> Họ tên,
                  địa chỉ email, số điện thoại, ảnh đại diện (avatar) và thông tin xác thực tài
                  khoản Google/OAuth.
                </li>
                <li>
                  <strong className="text-foreground">
                    Thông tin hồ sơ giảng viên (nếu nộp đơn):
                  </strong>{" "}
                  Chức danh chuyên môn, bài viết tiểu sử, đường dẫn LinkedIn/Portfolio, đường dẫn
                  file CV PDF và video bài giảng demo.
                </li>
                <li>
                  <strong className="text-foreground">Dữ liệu tiến trình học tập:</strong> Điểm số
                  bài kiểm tra, lịch sử làm bài thi quiz, bài viết đánh giá tự luận (essay), phản
                  hồi thảo luận forum, và tiến độ hoàn thiện khóa học.
                </li>
                <li>
                  <strong className="text-foreground">Dữ liệu kỹ thuật & Nhật ký truy cập:</strong>{" "}
                  Địa chỉ IP, loại thiết bị, hệ điều hành, trình duyệt web, thời gian truy cập và
                  Request ID nhằm mục đích giám sát an ninh mạng.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section
              id="muc-dich-su-dung"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <Eye className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">3. Mục đích sử dụng thông tin</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-sm">
                <div className="bg-muted p-4 rounded-2xl border border-border space-y-1.5">
                  <h3 className="font-bold text-foreground">Cung cấp Dịch vụ Học tập</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Xác thực danh tính đăng nhập, lưu trữ tiến trình bài giảng, chấm điểm bài tập tự
                    động và cấp chứng chỉ số.
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-2xl border border-border space-y-1.5">
                  <h3 className="font-bold text-foreground">Trợ lý AI Coach Cá nhân</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Gợi ý lộ trình học tập tối ưu, giải đáp thắc mắc bài tập dựa trên kiến thức
                    riêng của khóa học bạn đang tham gia.
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-2xl border border-border space-y-1.5">
                  <h3 className="font-bold text-foreground">Xử lý Giao dịch & Hỗ trợ</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Xử lý thanh toán đăng ký khóa học, xét duyệt đơn hỗ trợ tài chính và giải quyết
                    phản hồi kỹ thuật.
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-2xl border border-border space-y-1.5">
                  <h3 className="font-bold text-foreground">An ninh & Tuân thủ Pháp luật</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Phát hiện và ngăn chặn gian lận, gian lận thi cử hoặc truy cập trái phép vào tài
                    nguyên bảo mật.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section
              id="ai-assistant"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <Bot className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  4. Thu thập & Xử lý dữ liệu AI Study Assistant
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hệ thống tích hợp công nghệ trợ lý học tập trí tuệ nhân tạo (AI Assistant /
                Copilot). Chúng tôi đảm bảo tính riêng tư của cuộc thoại trợ lý AI như sau:
              </p>
              <div className="p-4 rounded-2xl bg-info/10 border border-info/20 space-y-2 text-sm">
                <div className="flex items-center gap-2 font-bold text-info">
                  <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>Cam kết Không Huấn luyện Mô hình Công khai</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Các câu hỏi, đoạn hội thoại và bài nộp cá nhân của bạn với AI Assistant chỉ được
                  xử lý trong phạm vi phiên học tập trực tiếp và không bao giờ được bán hoặc chia sẻ
                  để huấn luyện các mô hình AI công khai của bên thứ ba.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section
              id="openbadges"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <Award className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  5. Mã hóa & Xác thực Chứng chỉ số OpenBadges 3.0
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chứng chỉ thành tích sau khi hoàn thành khóa học tuân thủ tiêu chuẩn quốc tế{" "}
                <strong className="font-bold text-foreground">OpenBadges 3.0</strong>. Dữ liệu chứng
                chỉ được mã hóa mật mã học (cryptographic hash) công khai tại đường dẫn tra cứu{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/verify/[certId]</code>.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chỉ các thông tin hiển thị công khai trên chứng chỉ (Họ tên người nhận, tên khóa
                học, ngày cấp, tổ chức chứng nhận) mới có thể được xác thực bởi các bên thứ ba khi
                bạn chủ động chia sẻ liên kết xác minh.
              </p>
            </section>

            {/* Section 6 */}
            <section
              id="thanh-toan"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <CreditCard className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  6. An toàn thanh toán qua VNPay & Cổng đối tác
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tất cả các giao dịch thanh toán học phí trực tuyến được xử lý trực tiếp thông qua
                cổng thanh toán bảo mật <strong className="font-bold text-foreground">VNPay</strong>{" "}
                và ngân hàng đối tác liên kết.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hệ thống LMS AI Study Assistant{" "}
                <strong className="font-bold text-foreground">tuyệt đối không lưu trữ</strong> số
                thẻ ngân hàng, mã PIN hoặc mã xác thực OTP của người dùng trên máy chủ của chúng
                tôi. Dữ liệu giao dịch được bảo vệ theo tiêu chuẩn bảo mật PCI-DSS cấp độ cao nhất.
              </p>
            </section>

            {/* Section 7 */}
            <section
              id="quyen-nguoi-dung"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <UserCheck className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  7. Quyền hạn của bạn đối với dữ liệu
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Theo quy định của Nghị định 13/2023/NĐ-CP và chuẩn GDPR, bạn sở hữu đầy đủ các quyền
                sau:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
                <div className="p-3.5 rounded-2xl bg-muted border border-border space-y-1">
                  <h3 className="font-bold text-foreground">Quyền Truy cập & Tải về</h3>
                  <p className="text-muted-foreground">
                    Yêu cầu trích xuất toàn bộ dữ liệu lịch sử học tập cá nhân.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted border border-border space-y-1">
                  <h3 className="font-bold text-foreground">Quyền Chỉnh sửa Thông tin</h3>
                  <p className="text-muted-foreground">
                    Cập nhật họ tên, ảnh đại diện và thông tin liên hệ trong trang Cài đặt.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted border border-border space-y-1">
                  <h3 className="font-bold text-foreground">Quyền Xóa tài khoản</h3>
                  <p className="text-muted-foreground">
                    Yêu cầu hủy bỏ vĩnh viễn dữ liệu tài khoản cá nhân khỏi hệ thống.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 8 */}
            <section
              id="bao-mat-luu-tru"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <Lock className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  8. Bảo mật & Thời gian lưu trữ
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Dữ liệu truyền tải giữa thiết bị của bạn và hệ thống được mã hóa chuẩn{" "}
                <strong className="font-bold text-foreground">TLS 1.3/SSL</strong>. Dữ liệu lưu trữ
                trong cơ sở dữ liệu PostgreSQL được quản lý phân quyền theo vai trò (PBAC) và kiểm
                soát truy cập nghiêm ngặt.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chúng tôi duy trì dữ liệu tài khoản trong suốt khoảng thời gian tài khoản hoạt động.
                Khi có yêu cầu xóa tài khoản, dữ liệu sẽ được thanh tẩy khỏi hệ thống trong vòng 30
                ngày làm việc.
              </p>
            </section>

            {/* Section 9 */}
            <section
              id="lien-he"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <Mail className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  9. Thông tin liên hệ Bộ phận Bảo vệ Dữ liệu (DPO)
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nếu bạn có bất kỳ câu hỏi, khiếu nại hoặc yêu cầu hỗ trợ nào liên quan đến bảo mật
                thông tin cá nhân, vui lòng liên hệ với Nhân viên Bảo vệ Dữ liệu (DPO) của chúng
                tôi:
              </p>
              <div className="bg-muted p-5 rounded-2xl border border-border text-sm space-y-2">
                <p className="font-bold text-foreground">
                  Ban Quản trị & Bảo mật Thông tin - LMS AI Study Assistant
                </p>
                <p className="text-xs text-muted-foreground">
                  Email tiếp nhận:{" "}
                  <a
                    href="mailto:privacy@lms-ai.edu.vn"
                    className="text-primary font-medium hover:underline"
                  >
                    privacy@lms-ai.edu.vn
                  </a>
                </p>
                <p className="text-xs text-muted-foreground">
                  Thời gian phản hồi tiêu chuẩn: Trong vòng 24 - 48 giờ làm việc.
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
