"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Home, BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function NotFoundClient() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col justify-between w-full relative z-10 bg-background text-foreground min-h-[80vh]">
      {/* Main 404 Container */}
      <main className="flex-1 relative z-10 flex items-center justify-center max-w-3xl mx-auto px-4 py-12 sm:px-6 sm:py-16 text-center">
        <div className="w-full space-y-8">
          {/* Badge */}
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className="px-3.5 py-1 text-xs font-semibold uppercase tracking-wider gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-info animate-pulse" aria-hidden="true" />
              <span>Lỗi 404 • Không tìm thấy trang</span>
            </Badge>
          </div>

          {/* Graphical 404 Hero Illustration */}
          <div className="relative flex items-center justify-center my-4">
            <div
              className="absolute w-64 h-64 sm:w-80 sm:h-80 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse"
              aria-hidden="true"
            />
            <div className="relative">
              <span className="text-7xl sm:text-9xl font-black tracking-tighter text-primary select-none drop-shadow-sm">
                404
              </span>
              {/* Floating Compass / Search SVG overlay */}
              <div
                className="absolute -top-3 -right-4 sm:-top-4 sm:-right-6 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary-container text-on-primary-container border border-primary/20 shadow-md flex items-center justify-center"
                aria-hidden="true"
              >
                <Search className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
            </div>
          </div>

          {/* Headings */}
          <div className="space-y-3 max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground text-balance">
              Trang bạn tìm kiếm không tồn tại hoặc đã bị di chuyển
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-balance">
              Đường dẫn (URL) có thể đã thay đổi, bị gỡ bỏ hoặc tạm thời không khả dụng. Bạn có thể
              thử kiểm tra lại hoặc quay về trang chủ.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button id="btn-notfound-home" asChild size="lg" variant="primary">
                <Link href="/">
                  <Home className="w-4.5 h-4.5 mr-2" aria-hidden="true" />
                  <span>Về trang chủ</span>
                </Link>
              </Button>

              <Button id="btn-notfound-catalog" asChild variant="outline" size="lg">
                <Link href="/courses">
                  <BookOpen className="w-4.5 h-4.5 text-primary mr-2" aria-hidden="true" />
                  <span>Khám phá khóa học</span>
                </Link>
              </Button>
            </div>

            <div className="flex justify-center pt-1">
              <Button
                id="btn-notfound-goback"
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" aria-hidden="true" />
                <span>Quay lại trang trước</span>
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 border-t border-outline-variant text-center text-xs text-muted-foreground">
        <p>© 2026 LMS Platform. Nền tảng học tập trực tuyến hàng đầu.</p>
      </footer>
    </div>
  );
}
