"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCoursesQuery } from "@/lib/query_hooks";
import { CourseStatus, type Course } from "@/gen/catalog/v1/catalog_pb";
import { OrganizationMembersModal } from "@/components/identity/OrganizationMembersModal";
import { Button } from "@/components/ui/Button";
import {
  Plus,
  Users,
  BadgeCheck,
  Clock,
  FileEdit,
  Layers,
  UserCheck,
  CircleDollarSign,
  UserPlus,
} from "lucide-react";

export function InstructorDashboard({ userName }: { userName: string }) {
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const { data: courses = [], isLoading: loading } = useCoursesQuery();

  const publishedCourses = courses.filter((c: Course) => c.status === CourseStatus.PUBLISHED);
  const draftCourses = courses.filter((c: Course) => c.status === CourseStatus.DRAFT);
  const pendingReviewCourses = courses.filter(
    (c: Course) => c.status === CourseStatus.PENDING_REVIEW,
  );

  const totalStudents = courses.length * 15; // Estimated student count across courses

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
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <main className="relative max-w-7xl mx-auto px-6 py-12 space-y-10">
        {/* Header Banner */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-primary text-primary-foreground rounded-3xl p-8 shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20">
              <span className="w-2 h-2 rounded-full bg-primary-foreground animate-ping" />
              Bảng Điều Khiển Giảng Viên
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-balance">
              {greeting}, <span className="opacity-90">Thầy/Cô {userName}</span>
            </h1>
            <p className="text-sm opacity-80 max-w-xl">
              Quản lý danh sách khóa học giảng dạy, theo dõi lượng học viên đăng ký, kiểm duyệt bài
              tập và cập nhật nội dung bài giảng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOrgModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-card text-foreground hover:bg-muted font-bold text-sm shadow-lg"
            >
              <UserPlus className="w-5 h-5 text-primary" aria-hidden="true" />
              Thành viên Organization
            </Button>
            <Link
              href="/instructor/courses/new"
              className="px-6 py-3 rounded-2xl bg-card text-foreground hover:bg-muted font-bold text-sm shadow-lg transition-colors flex items-center gap-2 cursor-pointer border border-border"
            >
              <Plus className="w-5 h-5 text-primary" aria-hidden="true" />
              Tạo Khóa Học Mới
            </Link>
          </div>
        </header>

        {/* Dynamic KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:shadow-md hover:border-primary/40 transition-colors duration-m3-short-4 ease-m3-emphasized">
            <div className="w-14 h-14 rounded-2xl bg-info/10 text-info flex items-center justify-center shrink-0">
              <Users className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tổng Học Viên
              </p>
              <p className="text-3xl font-black text-foreground font-mono">{totalStudents}</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:shadow-md hover:border-primary/40 transition-colors duration-m3-short-4 ease-m3-emphasized">
            <div className="w-14 h-14 rounded-2xl bg-success/10 text-success flex items-center justify-center shrink-0">
              <BadgeCheck className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Đã Xuất Bản
              </p>
              <p className="text-3xl font-black text-success font-mono">
                {publishedCourses.length}
              </p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:shadow-md hover:border-primary/40 transition-colors duration-m3-short-4 ease-m3-emphasized">
            <div className="w-14 h-14 rounded-2xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <Clock className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Chờ Kiểm Duyệt
              </p>
              <p className="text-3xl font-black text-warning font-mono">
                {pendingReviewCourses.length}
              </p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:shadow-md hover:border-primary/40 transition-colors duration-m3-short-4 ease-m3-emphasized">
            <div className="w-14 h-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
              <FileEdit className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Bản Nháp (Draft)
              </p>
              <p className="text-3xl font-black text-foreground font-mono">{draftCourses.length}</p>
            </div>
          </div>
        </div>

        {/* Quick Management Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/instructor/courses"
            className="p-6 rounded-3xl bg-card border border-border hover:border-primary/50 shadow-sm transition-colors group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                Danh sách Khóa học Giảng dạy
              </h3>
              <p className="text-xs text-muted-foreground">
                Xem và chỉnh sửa chương trình học, bài giảng video, câu hỏi trắc nghiệm và đề thi.
              </p>
            </div>
          </Link>

          <Link
            href="/instructor/profile"
            className="p-6 rounded-3xl bg-card border border-border hover:border-primary/50 shadow-sm transition-colors group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-info/10 text-info flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                Hồ sơ & Chữ ký Giảng viên
              </h3>
              <p className="text-xs text-muted-foreground">
                Cập nhật chức danh, học vị và chữ ký số ký duyệt trên chứng chỉ học viên.
              </p>
            </div>
          </Link>

          <Link
            href="/instructor/financial-aid"
            className="p-6 rounded-3xl bg-card border border-border hover:border-primary/50 shadow-sm transition-colors group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-success/10 text-success flex items-center justify-center shrink-0">
              <CircleDollarSign className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                Duyệt Hỗ Trợ Tài Chính
              </h3>
              <p className="text-xs text-muted-foreground">
                Xét duyệt các đơn xin miễn giảm học phí từ những học viên có hoàn cảnh đặc biệt.
              </p>
            </div>
          </Link>
        </div>

        {/* Teaching Courses Overview List */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-foreground">Khóa Học Đang Quản Lý</h2>
              <p className="text-xs text-muted-foreground">
                Danh sách tất cả các khóa học bạn phụ trách chuyên môn.
              </p>
            </div>
            <Link
              href="/instructor/courses"
              className="text-xs font-bold text-primary hover:underline"
            >
              Xem tất cả →
            </Link>
          </div>

          {loading ? (
            <div
              aria-live="polite"
              className="py-12 text-center text-muted-foreground text-sm animate-pulse"
            >
              Đang tải danh sách khóa học…
            </div>
          ) : courses.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-3">
              <p className="text-sm font-semibold">Bạn chưa khởi tạo khóa học nào trên hệ thống.</p>
              <Link
                href="/instructor/courses/new"
                className="inline-block px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs"
              >
                Khởi tạo khóa học đầu tiên
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.slice(0, 6).map((c: Course) => (
                <Link
                  key={c.id}
                  href={`/instructor/courses/${c.id}`}
                  className="p-5 rounded-2xl border border-border hover:border-primary/40 hover:bg-muted transition-colors flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {c.subject || "COURSE"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.status === CourseStatus.PUBLISHED
                            ? "bg-success/10 text-success"
                            : c.status === CourseStatus.PENDING_REVIEW
                              ? "bg-warning/10 text-warning"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {CourseStatus[c.status] || "DRAFT"}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground text-sm min-w-0 line-clamp-2">
                      {c.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                    <span>{c.level || "Tất cả cấp độ"}</span>
                    <span className="text-primary font-semibold">Chỉnh sửa →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <OrganizationMembersModal isOpen={isOrgModalOpen} onClose={() => setIsOrgModalOpen(false)} />
    </div>
  );
}
