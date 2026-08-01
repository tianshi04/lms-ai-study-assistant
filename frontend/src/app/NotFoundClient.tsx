"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function NotFoundClient() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col justify-between w-full relative z-10">
      {/* Background radial decorations */}

      {/* Main 404 Container */}
      <main className="flex-1 relative z-10 flex items-center justify-center max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="space-y-8 w-full">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-info/10 border border-info/20 text-info text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-info animate-pulse" />
            <span>{"Lỗi 404 - Không tìm thấy trang"}</span>
          </div>

          {/* Graphical 404 Hero Illustration */}
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="relative">
              <span className="text-8xl sm:text-9xl font-black tracking-tighter bg-gradient-to-r from-primary via-info to-primary bg-clip-text text-transparent select-none drop-shadow-sm">
                404
              </span>
              {/* Floating Compass / Search SVG overlay */}
              <div className="absolute -top-3 -right-4 sm:-top-4 sm:-right-6 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-card border border-border shadow-xl flex items-center justify-center rotate-12 transform hover:rotate-0 transition-transform duration-300">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Headings */}
          <div className="space-y-3 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground text-balance">
              {"Rất tiếc! Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển."}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {
                "Địa chỉ đường dẫn (URL) có thể đã bị thay đổi, bị xoá hoặc không khả dụng tạm thời. Hãy kiểm tra lại hoặc quay về trang chính."
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                id="btn-notfound-home"
                href="/"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                <span>{"Về trang chủ"}</span>
              </Link>

              <Link
                id="btn-notfound-catalog"
                href="/courses"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-card border border-border text-foreground font-semibold shadow-sm hover:bg-muted hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <span>{"Khám phá khóa học"}</span>
              </Link>
            </div>

            <div className="flex justify-center pt-2">
              <button
                id="btn-notfound-goback"
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary font-semibold transition-colors duration-200 cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span>{"Quay lại"}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="relative z-10 py-6 border-t border-border text-center text-xs text-muted-foreground">
        <p>{"© 2026 Coursera LMS Platform. Nền tảng học tập trực tuyến hàng đầu."}</p>
      </footer>
    </div>
  );
}
