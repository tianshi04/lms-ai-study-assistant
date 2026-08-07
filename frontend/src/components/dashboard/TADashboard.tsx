"use client";

import Link from "next/link";
import {
  MessageSquare,
  ClipboardList,
  MessageCircle,
  CheckCircle2,
  Users,
  MessagesSquare,
  FileText,
} from "lucide-react";

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
              className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare aria-hidden="true" className="w-5 h-5" />
              Diễn Đàn Trả Lời Q&A
            </Link>
          </div>
        </header>

        {/* Operational KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:shadow-md hover:border-primary/40 transition-colors duration-m3-short-4 ease-m3-emphasized">
            <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center text-warning shrink-0">
              <ClipboardList aria-hidden="true" className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Bài Chờ Chấm Điểm
              </p>
              <p className="text-3xl font-black text-warning font-mono">12</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:shadow-md hover:border-primary/40 transition-colors duration-m3-short-4 ease-m3-emphasized">
            <div className="w-14 h-14 rounded-2xl bg-info/10 flex items-center justify-center text-info shrink-0">
              <MessageCircle aria-hidden="true" className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Câu Hỏi Mới (Q&A)
              </p>
              <p className="text-3xl font-black text-info font-mono">5</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:shadow-md hover:border-primary/40 transition-colors duration-m3-short-4 ease-m3-emphasized">
            <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center text-success shrink-0">
              <CheckCircle2 aria-hidden="true" className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Bài Đã Chấm Tuần Này
              </p>
              <p className="text-3xl font-black text-success font-mono">48</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:shadow-md hover:border-primary/40 transition-colors duration-m3-short-4 ease-m3-emphasized">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Users aria-hidden="true" className="w-7 h-7" />
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
            className="p-6 rounded-3xl bg-card border border-border hover:border-primary/50 shadow-sm transition-colors group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MessagesSquare aria-hidden="true" className="w-6 h-6" />
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
            className="p-6 rounded-3xl bg-card border border-border hover:border-warning/50 shadow-sm transition-colors group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <FileText aria-hidden="true" className="w-6 h-6" />
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
