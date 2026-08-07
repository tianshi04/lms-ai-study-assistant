import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  PlayCircle,
  CircleDollarSign,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { ParticleBackground } from "@/components/home/ParticleBackground";

export function PublicLanding() {
  return (
    <div className="flex-1 flex flex-col justify-between w-full relative bg-surface text-on-surface animate-in fade-in duration-m3-medium-2 ease-m3-emphasized overflow-hidden">
      {/* Dynamic Interactive Particle Canvas Background */}
      <ParticleBackground />

      {/* High-Tech Geometric Grid Matrix (Subtle Tech Texture away from Navbar) */}
      <svg
        className="absolute inset-0 w-full h-full stroke-outline-variant/20 [mask-image:radial-gradient(ellipse_60%_50%_at_80%_50%,black_30%,transparent_100%)] pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <pattern id="tech-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" strokeWidth="0" fill="url(#tech-grid)" />
      </svg>

      {/* Hero Banner with CTA */}
      <main className="flex-1 relative z-20 max-w-7xl mx-auto px-6 pt-12 pb-16 text-center md:text-left grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-primary-container border border-primary/20 text-on-primary-container text-xs font-bold uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>Next-Gen Coursera AI LMS</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-on-surface leading-[1.1] text-balance">
            Nền tảng Học tập <br />
            <span className="text-primary">Thông minh & Chuẩn Quốc tế</span>
          </h1>

          <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
            Trải nghiệm trình phát bài học chuẩn Coursera với phụ đề tương tác, bài tập ngắt ngang
            video và chứng chỉ xác thực công khai.
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
            <Link
              href="/courses"
              className="px-8 py-3.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-bold shadow-xs hover:shadow-md transition-colors text-sm flex items-center space-x-2"
            >
              <span>Khám phá Danh mục Khóa học</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>

            <Link
              href="/auth/register"
              className="px-8 py-3.5 rounded-full bg-surface-container-high border border-outline-variant text-on-surface font-bold hover:bg-surface-container-highest transition-colors text-sm"
            >
              Đăng ký Học thử Miễn phí
            </Link>
          </div>

          {/* Trust Metrics Bar */}
          <div className="pt-6 border-t border-outline-variant/60 grid grid-cols-3 gap-4 max-w-lg">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-container/80 flex items-center justify-center text-primary shrink-0">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-on-surface">100+</p>
                <p className="text-[11px] text-on-surface-variant font-medium">Khóa học uy tín</p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-tertiary-container/80 flex items-center justify-center text-tertiary shrink-0">
                <Zap className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-on-surface">AI 24/7</p>
                <p className="text-[11px] text-on-surface-variant font-medium">Trợ lý học tập</p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-secondary-container/80 flex items-center justify-center text-on-secondary-container shrink-0">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-on-surface">Công khai</p>
                <p className="text-[11px] text-on-surface-variant font-medium">
                  Xác minh chứng chỉ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Overview Grid */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/courses"
            className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant hover:border-primary/50 hover:bg-surface-container transition-colors duration-m3-medium-2 ease-m3-emphasized text-left group shadow-xs hover:shadow-md"
          >
            <div className="w-11 h-11 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center font-bold mb-3">
              <BookOpen className="w-5.5 h-5.5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">
              Catalog Khóa học
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Khám phá danh sách khóa học phong phú & chất lượng
            </p>
          </Link>

          <Link
            href="/learn/course-python-ai"
            className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant hover:border-primary/50 hover:bg-surface-container transition-colors duration-m3-medium-2 ease-m3-emphasized text-left group shadow-xs hover:shadow-md"
          >
            <div className="w-11 h-11 rounded-2xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold mb-3">
              <PlayCircle className="w-5.5 h-5.5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">
              Trình phát Bài học
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Player video phụ đề cuộn & In-Video Quiz
            </p>
          </Link>

          <Link
            href="/financial-aid?courseId=course-python-ai"
            className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant hover:border-primary/50 hover:bg-surface-container transition-colors duration-m3-medium-2 ease-m3-emphasized text-left group shadow-xs hover:shadow-md"
          >
            <div className="w-11 h-11 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold mb-3">
              <CircleDollarSign className="w-5.5 h-5.5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">
              Hỗ trợ Tài chính
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Đơn xin học bổng 150 từ với đếm từ realtime
            </p>
          </Link>

          <Link
            href="/verify/CERT-DEMO12345"
            className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant hover:border-primary/50 hover:bg-surface-container transition-colors duration-m3-medium-2 ease-m3-emphasized text-left group shadow-xs hover:shadow-md"
          >
            <div className="w-11 h-11 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center font-bold mb-3">
              <GraduationCap className="w-5.5 h-5.5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">
              Xác minh Chứng chỉ
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Cổng tra cứu & xác thực chứng chỉ công khai
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
