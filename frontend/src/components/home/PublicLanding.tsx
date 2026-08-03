import Link from "next/link";
import { ArrowRight, BookOpen, PlayCircle, CircleDollarSign, GraduationCap } from "lucide-react";

export function PublicLanding() {
  return (
    <div className="flex-1 flex flex-col justify-between w-full relative animate-in fade-in duration-300 ease-m3-emphasized">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.1),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.1),transparent_40%)] pointer-events-none" />

      {/* Hero Banner with CTA */}
      <main className="flex-1 relative z-20 max-w-7xl mx-auto px-6 pt-12 pb-12 text-center md:text-left grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Next-Gen Coursera AI LMS</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-tight text-balance">
            Nền tảng Học tập <br />
            <span className="text-primary">Thông minh & Chuẩn Quốc tế</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Trải nghiệm trình phát bài học chuẩn Coursera với phụ đề tương tác, bài tập ngắt ngang
            video và chứng chỉ xác thực công khai.
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
            <Link
              href="/courses"
              className="px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all text-sm flex items-center space-x-2"
            >
              <span>Khám phá Danh mục Khóa học</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>

            <Link
              href="/auth/register"
              className="px-6 py-3.5 rounded-xl bg-card border border-border text-foreground font-semibold hover:bg-muted transition-all text-sm"
            >
              Đăng ký Học thử Miễn phí
            </Link>
          </div>
        </div>

        {/* Feature Overview Grid */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/courses"
            className="p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-foreground mb-1">Catalog Khóa học</h3>
            <p className="text-xs text-muted-foreground">
              Khám phá danh sách khóa học phong phú & chất lượng
            </p>
          </Link>

          <Link
            href="/learn/course-python-ai"
            className="p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
              <PlayCircle className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-foreground mb-1">Trình phát Bài học</h3>
            <p className="text-xs text-muted-foreground">
              Player video phụ đề cuộn & In-Video Quiz
            </p>
          </Link>

          <Link
            href="/financial-aid?courseId=course-python-ai"
            className="p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
              <CircleDollarSign className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-foreground mb-1">Hỗ trợ Tài chính</h3>
            <p className="text-xs text-muted-foreground">
              Đơn xin học bổng 150 từ với đếm từ realtime
            </p>
          </Link>

          <Link
            href="/verify/CERT-DEMO12345"
            className="p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-foreground mb-1">Xác minh Chứng chỉ</h3>
            <p className="text-xs text-muted-foreground">
              Cổng tra cứu & xác thực chứng chỉ công khai
            </p>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Coursera LMS Platform. Nền tảng học tập trực tuyến hàng đầu.</p>
          <div className="flex space-x-4">
            <Link href="/courses" className="hover:underline">
              Khóa học
            </Link>
            <Link href="/auth/profile" className="hover:underline">
              Hồ sơ
            </Link>
            <Link href="/instructor/courses" className="hover:underline">
              Giảng Viên
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
