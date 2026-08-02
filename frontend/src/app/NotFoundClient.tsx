"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Home, BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function NotFoundClient() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col justify-between w-full relative z-10">
      {/* Background radial decorations */}

      {/* Main 404 Container */}
      <main className="flex-1 relative z-10 flex items-center justify-center max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="space-y-8 w-full">
          {/* Badge */}
          <Badge variant="outline" className="uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-info animate-pulse mr-2" />
            <span>{"Lỗi 404 - Không tìm thấy trang"}</span>
          </Badge>

          {/* Graphical 404 Hero Illustration */}
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="relative">
              <span className="text-8xl sm:text-9xl font-black tracking-tighter bg-gradient-to-r from-primary via-info to-primary bg-clip-text text-transparent select-none drop-shadow-sm">
                404
              </span>
              {/* Floating Compass / Search SVG overlay */}
              <div className="absolute -top-3 -right-4 sm:-top-4 sm:-right-6 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-card border border-border shadow-xl flex items-center justify-center rotate-12 transform hover:rotate-0 transition-transform duration-300">
                <Search className="w-6 h-6 sm:w-8 sm:h-8 text-primary" aria-hidden="true" />
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
              <Button id="btn-notfound-home" asChild size="lg">
                <Link href="/">
                  <Home className="w-5 h-5 mr-2" aria-hidden="true" />
                  <span>{"Về trang chủ"}</span>
                </Link>
              </Button>

              <Button id="btn-notfound-catalog" asChild variant="outline" size="lg">
                <Link href="/courses">
                  <BookOpen className="w-5 h-5 text-primary mr-2" aria-hidden="true" />
                  <span>{"Khám phá khóa học"}</span>
                </Link>
              </Button>
            </div>

            <div className="flex justify-center pt-2">
              <Button
                id="btn-notfound-goback"
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" aria-hidden="true" />
                <span>{"Quay lại"}</span>
              </Button>
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
