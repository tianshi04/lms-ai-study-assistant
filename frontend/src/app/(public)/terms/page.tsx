"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  UserCheck,
  GraduationCap,
  Award,
  CreditCard,
  Copyright,
  Bot,
  AlertTriangle,
  Gavel,
  ChevronRight,
  Sparkles,
  FileCheck,
} from "lucide-react";

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
}

const SECTIONS: Section[] = [
  { id: "tong-quan-terms", title: "1. Chấp nhận Điều khoản", icon: FileText },
  { id: "tai-khoan", title: "2. Quy định về Tài khoản", icon: UserCheck },
  { id: "hoc-vien", title: "3. Quy định đối với Học viên", icon: GraduationCap },
  { id: "giang-vien", title: "4. Quy định với Giảng viên", icon: Award },
  { id: "thanh-toan-hoan-tien", title: "5. Thanh toán & Hoàn tiền", icon: CreditCard },
  { id: "so-huu-tri-tue", title: "6. Quyền sở hữu trí tuệ", icon: Copyright },
  { id: "ai-assistant-terms", title: "7. Giới hạn đối với AI Assistant", icon: Bot },
  { id: "vi-pham-cham-dut", title: "8. Xử lý vi phạm & Chấm dứt", icon: AlertTriangle },
  { id: "luat-ap-dung", title: "9. Luật áp dụng & Tranh chấp", icon: Gavel },
];

export default function TermsOfServicePage() {
  const [activeSection, setActiveSection] = useState("tong-quan-terms");

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
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Link href="/" className="hover:text-primary transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="text-foreground font-medium">Điều khoản Dịch vụ</span>
        </nav>

        {/* Hero Section */}
        <div className="bg-card rounded-3xl p-8 sm:p-12 border border-border relative overflow-hidden text-center sm:text-left">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
              <FileText className="w-4 h-4" aria-hidden="true" />
              <span>Quy định & Thỏa thuận sử dụng</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground text-balance">
              Điều khoản Dịch vụ
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Chào mừng bạn đến với{" "}
              <strong className="font-bold text-foreground">LMS AI Study Assistant</strong>. Thỏa
              thuận này quy định các quyền, trách nhiệm và nghĩa vụ pháp lý khi bạn truy cập và sử
              dụng dịch vụ trên nền tảng của chúng tôi.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <FileCheck className="w-4 h-4 text-primary" aria-hidden="true" />
                Cập nhật lần cuối: 05/08/2026
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                Áp dụng cho mọi người dùng
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Sticky Table of Contents Sidebar */}
          <aside className="lg:col-span-1 bg-card rounded-3xl p-5 border border-border lg:sticky lg:top-24 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
              Mục lục điều khoản
            </h2>
            <nav className="space-y-1 text-xs">
              {SECTIONS.map((sec) => {
                const IconComponent = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-left transition-all font-medium ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{sec.title}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Policy Content Sections */}
          <main className="lg:col-span-3 space-y-8">
            {/* Section 1 */}
            <section
              id="tong-quan-terms"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <FileText className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  1. Chấp nhận Điều khoản Dịch vụ
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Khi đăng ký tài khoản, truy cập các khóa học hoặc tương tác với trợ lý AI trên nền
                tảng <strong className="font-bold text-foreground">LMS AI Study Assistant</strong>,
                bạn đồng ý tuân thủ toàn bộ các điều khoản và điều kiện được quy định trong văn bản
                này.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nếu bạn không đồng ý với bất kỳ phần nào của điều khoản, vui lòng ngừng truy cập và
                sử dụng dịch vụ. Chúng tôi có quyền cập nhật điều khoản bất kỳ lúc nào và sẽ thông
                báo trước trên giao diện hệ thống.
              </p>
            </section>

            {/* Section 2 */}
            <section
              id="tai-khoan"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <UserCheck className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  2. Quy định về Tạo & Quản lý Tài khoản
                </h2>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5 leading-relaxed">
                <li>
                  <strong className="text-foreground">Độ tuổi tối thiểu:</strong> Bạn phải từ đủ 13
                  tuổi trở lên để tự tạo tài khoản cá nhân. Người dùng dưới 13 tuổi cần có sự giám
                  sát của phụ huynh hoặc người giám hộ hợp pháp.
                </li>
                <li>
                  <strong className="text-foreground">Chính xác thông tin:</strong> Người dùng có
                  trách nhiệm cung cấp thông tin họ tên, email chính xác để đảm bảo hiệu lực pháp lý
                  của chứng chỉ OpenBadges 3.0 khi hoàn thành khóa học.
                </li>
                <li>
                  <strong className="text-foreground">Bảo mật tài khoản:</strong> Bạn chịu trách
                  nhiệm duy trì tính bảo mật của mật khẩu và các thông tin đăng nhập. Không chia sẻ
                  tài khoản cho bên thứ ba dùng chung.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section
              id="hoc-vien"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <GraduationCap className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">3. Quy định đối với Học viên</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Học viên được cấp quyền truy cập cá nhân không độc quyền đối với nội dung khóa học
                đã đăng ký hoặc được duyệt hỗ trợ tài chính.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-sm">
                <div className="bg-muted p-4 rounded-2xl border border-border space-y-1.5">
                  <h3 className="font-bold text-foreground">Trung thực trong Học tập</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tự thực hiện bài thi quiz, bài luận cá nhân và bài kiểm tra đánh giá mà không
                    gian lận hay sử dụng công cụ can thiệp kết quả.
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-2xl border border-border space-y-1.5">
                  <h3 className="font-bold text-foreground">Văn hóa Thảo luận Diễn đàn</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tôn trọng giảng viên và các học viên khác; không đăng tải nội dung đả kích, xúc
                    phạm, spambot hoặc nội dung vi phạm pháp luật.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section
              id="giang-vien"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <Award className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  4. Quy định đối với Giảng viên & Tác giả
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Người dùng nộp đơn xin cấp quyền Giảng viên tại{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  /become-an-instructor
                </code>{" "}
                và được Ban Quản trị phê duyệt phải cam kết:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5 leading-relaxed">
                <li>
                  Sở hữu đầy đủ bản quyền hoặc quyền sử dụng hợp pháp đối với tài liệu, video, hình
                  ảnh và slide bài giảng tải lên hệ thống.
                </li>
                <li>
                  Không đăng tải các khóa học chứa thông tin sai lệch, lừa đảo, hoặc vi phạm quy
                  định sở hữu trí tuệ của bên thứ ba.
                </li>
                <li>
                  Đảm bảo hỗ trợ học viên giải đáp thắc mắc chuyên môn trong phạm vi khóa học do
                  mình biên soạn.
                </li>
              </ul>
            </section>

            {/* Section 5 */}
            <section
              id="thanh-toan-hoan-tien"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <CreditCard className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  5. Thanh toán, Hỗ trợ tài chính & Chính sách Hoàn tiền
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Học viên đăng ký mua khóa học trả phí có thể hoàn tất thanh toán qua cổng{" "}
                <strong className="font-bold text-foreground">VNPay</strong>. Học viên có hoàn cảnh
                khó khăn có thể nộp đơn xin{" "}
                <strong className="font-bold text-foreground">
                  Hỗ trợ Tài chính (Financial Aid)
                </strong>{" "}
                tại <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/financial-aid</code>.
              </p>
              <div className="p-4 rounded-2xl bg-muted border border-border space-y-2 text-sm">
                <h3 className="font-bold text-foreground">Chính sách Hoàn tiền (Refund Policy)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Học viên có quyền yêu cầu hoàn 100% học phí trong vòng{" "}
                  <strong className="font-bold text-foreground">07 ngày</strong> kể từ ngày mua nếu
                  thời lượng học chưa vượt quá 20% tổng số bài giảng và chưa cấp chứng chỉ hoàn
                  thành.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section
              id="so-huu-tri-tue"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <Copyright className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">6. Quyền Sở hữu Trí tuệ</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tất cả logo, giao diện, mã nguồn, thuật toán AI Coach, và nội dung bài giảng trên{" "}
                <strong className="font-bold text-foreground">LMS AI Study Assistant</strong> đều
                thuộc bản quyền của hệ thống hoặc giảng viên/đối tác liên kết.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nghiêm cấm hành vi sao chép, trích xuất (crawl/scrape), ghi hình bán lại hoặc phát
                tán nội dung bài giảng trái phép khi chưa có sự đồng ý bằng văn bản từ Ban Quản trị.
              </p>
            </section>

            {/* Section 7 */}
            <section
              id="ai-assistant-terms"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <Bot className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  7. Giới hạn Trách nhiệm đối với Trợ lý AI Study Assistant
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Trợ lý AI Study Assistant được thiết kế nhằm mục đích hỗ trợ giải thích kiến thức và
                tham khảo lộ trình học. Câu trả lời của AI mang tính chất tham khảo và có thể không
                hoàn toàn chính xác trong 100% mọi ngữ cảnh chuyên sâu.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chúng tôi không chịu trách nhiệm đối với các quyết định pháp lý, tài chính hoặc y tế
                cá nhân dựa trên câu trả lời của trợ lý AI.
              </p>
            </section>

            {/* Section 8 */}
            <section
              id="vi-pham-cham-dut"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  8. Xử lý vi phạm & Chấm dứt Dịch vụ
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ban Quản trị có quyền tạm khóa hoặc khóa vĩnh viễn tài khoản của người dùng mà không
                cần báo trước trong các trường hợp:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5 leading-relaxed">
                <li>
                  Vi phạm nghiêm trọng bản quyền nội dung hoặc cố tình tấn công mã độc vào hệ thống.
                </li>
                <li>Phát tán tin rác, xúc phạm hoặc đe dọa các thành viên khác trên diễn đàn.</li>
                <li>Sử dụng các công cụ gian lận để làm giả kết quả học tập và chứng chỉ số.</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section
              id="luat-ap-dung"
              className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <Gavel className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  9. Luật áp dụng & Giải quyết Tranh chấp
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Thỏa thuận này được điều chỉnh và giải thích theo pháp luật nước Cộng hòa Xã hội Chủ
                nghĩa Việt Nam. Bất kỳ tranh chấp nào phát sinh liên quan đến việc sử dụng dịch vụ
                trước hết sẽ được ưu tiên giải quyết thông qua thương lượng hòa giải.
              </p>
              <div className="bg-muted p-5 rounded-2xl border border-border text-sm space-y-2">
                <p className="font-bold text-foreground">Liên hệ Hỗ trợ Pháp lý & Điều khoản</p>
                <p className="text-xs text-muted-foreground">
                  Email tiếp nhận:{" "}
                  <a
                    href="mailto:terms@lms-ai.edu.vn"
                    className="text-primary font-medium hover:underline"
                  >
                    terms@lms-ai.edu.vn
                  </a>
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
