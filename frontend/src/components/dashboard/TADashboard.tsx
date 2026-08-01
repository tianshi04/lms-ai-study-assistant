"use client";

import Link from "next/link";

export function TADashboard({ userName }: { userName: string }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  return (
    <div className="w-full flex-1 bg-background min-h-screen">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

      <main className="relative max-w-7xl mx-auto px-6 py-12 space-y-10">
        {/* Header Banner */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-card via-muted to-card rounded-3xl p-8 border border-border text-foreground shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/30">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              Bảng Điều Khiển Trợ Giảng (TA)
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-balance">
              {getGreeting()}, <span className="text-primary">Trợ Giảng {userName}</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Hỗ trợ chấm điểm bài tập tự luận, giải đáp thắc mắc chuyên môn trên diễn đàn khóa học
              và theo dõi tiến độ của học viên.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/forum"
              className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Diễn Đàn Trả Lời Q&A
            </Link>
          </div>
        </header>

        {/* Operational KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center text-warning shrink-0">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Bài Chờ Chấm Điểm
              </p>
              <p className="text-3xl font-black text-warning font-mono">12</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-info/10 flex items-center justify-center text-info shrink-0">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Câu Hỏi Mới (Q&A)
              </p>
              <p className="text-3xl font-black text-info font-mono">5</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center text-success shrink-0">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Bài Đã Chấm Tuần Này
              </p>
              <p className="text-3xl font-black text-success font-mono">48</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Học Viên Hỗ Trợ
              </p>
              <p className="text-3xl font-black text-primary font-mono">140</p>
            </div>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/forum"
            className="p-6 rounded-3xl bg-card border border-border hover:border-primary/50 shadow-sm transition-all group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                Diễn Đàn Thắc Mắc & Trả Lời Q&A
              </h3>
              <p className="text-xs text-muted-foreground">
                Phản hồi câu hỏi chuyên môn của học viên trong các chuyên mục khóa học được phân
                công.
              </p>
            </div>
          </Link>

          <Link
            href="/ta/grading"
            className="p-6 rounded-3xl bg-card border border-border hover:border-warning/50 shadow-sm transition-all group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-warning/10 text-warning flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-foreground group-hover:text-warning transition-colors">
                Hàng Chờ Chấm Bài Tự Luận
              </h3>
              <p className="text-xs text-muted-foreground">
                Xem danh sách bài tập Essay, bài kiểm tra của học viên cần trợ giảng chấm và cho
                nhận xét.
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
