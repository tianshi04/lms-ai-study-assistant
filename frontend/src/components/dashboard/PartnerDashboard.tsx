"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";

export function PartnerDashboard({ userName }: { userName: string }) {
  const [greeting, setGreeting] = useState("Xin chào");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Chào buổi sáng");
    else if (hour < 18) setGreeting("Chào buổi chiều");
    else setGreeting("Chào buổi tối");
  }, []);

  return (
    <div className="w-full flex-1 bg-background min-h-screen">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-warning/10 to-transparent pointer-events-none" />

      <main className="relative max-w-7xl mx-auto px-6 py-12 space-y-10">
        {/* Header Banner */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-card via-muted to-card rounded-3xl p-8 border border-border text-foreground shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-warning/10 text-warning border border-warning/30">
              <span className="w-2 h-2 rounded-full bg-warning animate-ping" />
              Bảng Điều Khiển Đối Tác Doanh Nghiệp
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-balance">
              {greeting}, <span className="text-warning">Đại diện {userName}</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Quản lý gói suất học tài trợ (Enterprise Seat Licenses), phân bổ cho nhân sự và theo
              dõi báo cáo kích hoạt.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/partner/settings"
              className="px-6 py-3 rounded-2xl bg-warning hover:opacity-90 text-warning-foreground font-bold text-sm shadow-lg shadow-warning/20 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Settings aria-hidden="true" className="w-5 h-5" />
              Cấu Hình Gói Doanh Nghiệp
            </Link>
          </div>
        </header>

        {/* Quick Shortcut Card */}
        <div className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-extrabold text-foreground">Trạng Thái Suất Học Enterprise</h2>
          <p className="text-sm text-muted-foreground">
            Truy cập trang Cấu Hình Đối Tác để gán license key cho danh sách nhân sự của đơn vị bạn.
          </p>
          <Link
            href="/partner/settings"
            className="inline-block px-6 py-3 rounded-xl bg-warning hover:opacity-90 text-warning-foreground font-bold text-sm shadow-md transition-colors"
          >
            Đến trang quản lý suất học →
          </Link>
        </div>
      </main>
    </div>
  );
}
