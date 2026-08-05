"use client";

import Link from "next/link";
import {
  Award,
  BookOpen,
  Globe,
  MessageSquare,
  ShieldCheck,
  HeartHandshake,
  GraduationCap,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card text-card-foreground transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="space-y-3 md:col-span-1">
            <BrandLogo size="md" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Nền tảng học tập trực tuyến thông minh tích hợp AI Coach và chứng chỉ số hóa chuẩn hóa
              OpenBadges.
            </p>
          </div>

          {/* Quick Links Column 1 */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Khám phá Học tập
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/landing"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Trang giới thiệu</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/courses"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Khóa học</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/partners"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <HeartHandshake className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Đối tác</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/forum"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Diễn đàn thảo luận</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links Column 2 */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Dịch vụ & Xác thực
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/financial-aid"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Hỗ trợ Tài chính</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/verify/CERT-DEMO12345"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Xác minh Chứng chỉ</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/become-an-instructor"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Trở thành Giảng viên</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Standards & Certifications Column */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Tiêu chuẩn Quốc tế
            </h3>
            <div className="bg-muted/50 border border-border p-3.5 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-primary font-semibold">
                <Award className="w-4 h-4" aria-hidden="true" />
                <span>OpenBadges 3.0 Standard</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tất cả chứng chỉ hoàn thành khóa học được xác thực mật mã mã hóa bởi đối tác và
                chứng nhận trên toàn cầu.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center text-xs text-muted-foreground gap-3">
          <p>© {new Date().getFullYear()} LMS AI Study Assistant. Tất cả các quyền được bảo lưu.</p>
          <div className="flex items-center space-x-4 text-[11px]">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Chính sách Bảo mật
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Điều khoản Dịch vụ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
