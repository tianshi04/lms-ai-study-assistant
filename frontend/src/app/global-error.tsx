"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import "@/app/globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Global Error:", error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="bg-background text-foreground antialiased min-h-screen flex items-center justify-center p-4">
        <main className="w-full max-w-xl mx-auto space-y-6 text-center">
          {/* Hero Icon */}
          <div className="flex justify-center">
            <div
              className="w-20 h-20 rounded-3xl bg-error-container text-on-error-container border border-error/20 flex items-center justify-center shadow-inner"
              aria-hidden="true"
            >
              <AlertTriangle aria-hidden="true" className="w-10 h-10 text-destructive" />
            </div>
          </div>

          {/* Heading & Paragraph */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Sự cố hệ thống nghiêm trọng
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Ứng dụng đã gặp lỗi ngoài dự kiến ở cấp độ hệ thống. Bạn có thể thử tải lại hoặc quay
              về trang chủ.
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-muted-foreground pt-1">
                Mã định danh lỗi: <code className="text-destructive">{error.digest}</code>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary-hover transition-colors duration-m3-short-4 ease-m3-emphasized cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              Tải lại trang
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full border border-outline text-primary font-medium hover:bg-primary/10 transition-colors duration-m3-short-4 ease-m3-emphasized cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Home className="w-4 h-4 mr-2" aria-hidden="true" />
              Về Trang Chủ
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
