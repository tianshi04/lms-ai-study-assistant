import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.1),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.1),transparent_40%)] pointer-events-none" />

      {/* Navigation Header */}
      <Navbar />

      {/* Hero Banner with CTA */}
      <main className="flex-1 relative z-20 max-w-7xl mx-auto px-6 pt-12 pb-12 text-center md:text-left grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Next-Gen Coursera AI LMS</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Nền tảng Học tập <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 bg-clip-text text-transparent">
              Thông minh & Chuẩn Quốc tế
            </span>
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Trải nghiệm trình phát bài học chuẩn Coursera với phụ đề tương tác, bài tập ngắt ngang video, trợ lý Coursera AI Coach thông minh hỗ trợ 24/7 và chứng chỉ xác thực công khai.
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
            <Link
              href="/courses"
              className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center space-x-2"
            >
              <span>Khám phá Danh mục Khóa học</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <Link
              href="/auth/register"
              className="px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm"
            >
              Đăng ký Học thử Miễn phí
            </Link>
          </div>
        </div>

        {/* Feature Overview Grid */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/courses"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Catalog Khóa học</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Khám phá danh sách khóa học phong phú &amp; chất lượng</p>
          </Link>

          <Link
            href="/learn/course-python-ai"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Trình phát Bài học</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Player video phụ đề cuộn & In-Video Quiz</p>
          </Link>

          <Link
            href="/financial-aid?courseId=course-python-ai"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Hỗ trợ Tài chính</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Đơn xin học bổng 150 từ với đếm từ realtime</p>
          </Link>

          <Link
            href="/verify/CERT-DEMO12345"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Xác minh Chứng chỉ</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Cổng tra cứu &amp; xác thực chứng chỉ công khai</p>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Coursera AI LMS Platform. Nền tảng học tập trực tuyến hàng đầu.</p>
          <div className="flex space-x-4">
            <Link href="/courses" className="hover:underline">Catalog</Link>
            <Link href="/auth/profile" className="hover:underline">Hồ sơ</Link>
            <Link href="/instructor/courses" className="hover:underline">Giảng viên</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
