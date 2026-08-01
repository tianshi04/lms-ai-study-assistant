"use client";

import Link from "next/link";
import { CheckCircle2, Clock, List, Building2 } from "lucide-react";
import AdminEnterpriseDashboardPage from "@/app/admin/dashboard/page";

export function AdminDashboard({ userName: _userName }: { userName: string }) {
  return (
    <div className="w-full flex-1 bg-background min-h-screen">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <main className="relative max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Quick Admin Operations Navigation Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/applications"
            className="p-5 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-sm transition-all group flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                Duyệt Đơn Giảng Viên
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Xét duyệt đơn đăng ký tác giả/giảng viên
              </p>
            </div>
          </Link>

          <Link
            href="/admin/courses/review"
            className="p-5 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-sm transition-all group flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                Duyệt Khóa Học
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Kiểm duyệt chất lượng trước khi xuất bản
              </p>
            </div>
          </Link>

          <Link
            href="/admin/categories"
            className="p-5 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-sm transition-all group flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <List className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                Quản Lý Danh Mục
              </h3>
              <p className="text-[10px] text-muted-foreground">Cấu hình cây chủ đề và môn học</p>
            </div>
          </Link>

          <Link
            href="/admin/partners"
            className="p-5 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-sm transition-all group flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                Quản Trị Đối Tác
              </h3>
              <p className="text-[10px] text-muted-foreground">Trường đại học và doanh nghiệp</p>
            </div>
          </Link>
        </div>

        {/* Embedded Core Admin Enterprise Seat Management View */}
        <AdminEnterpriseDashboardPage />
      </main>
    </div>
  );
}
