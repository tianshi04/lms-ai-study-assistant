"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, ArrowLeft, ChevronDown, Bug } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/shared/Badge";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log unexpected runtime errors for observability
    console.error("Unhandled App Error:", error);
  }, [error]);

  return (
    <main className="flex-1 flex items-center justify-center min-h-[75vh] px-4 py-12 sm:px-6 sm:py-16 text-center bg-background">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge
            variant="danger"
            className="px-3.5 py-1 text-xs font-semibold uppercase tracking-wider gap-2"
          >
            <span
              className="w-2 h-2 rounded-full bg-destructive animate-pulse"
              aria-hidden="true"
            />
            <span>Sự cố hệ thống</span>
          </Badge>
        </div>

        {/* M3 Tonal Hero Icon Avatar */}
        <div className="relative flex items-center justify-center">
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-error-container text-on-error-container border border-error/20 flex items-center justify-center shadow-inner"
            aria-hidden="true"
          >
            <AlertTriangle aria-hidden="true" className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
        </div>

        {/* Headings & Descriptions */}
        <div className="space-y-3 max-w-xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground text-balance">
            Rất tiếc, đã xảy ra lỗi ngoài dự kiến!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-balance">
            Hệ thống đã gặp gián đoạn tạm thời khi xử lý yêu cầu của bạn. Bạn có thể thử làm mới lại
            trang hoặc quay về trang chủ.
          </p>
        </div>

        {/* Technical Diagnostics Box (M3 Expandable Container) */}
        {(error.digest || error.message) && (
          <div className="pt-2 max-w-xl mx-auto text-left">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowDetails((prev) => !prev)}
              className="w-full justify-between px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-medium text-muted-foreground transition-colors cursor-pointer"
              aria-expanded={showDetails}
            >
              <span className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-destructive" aria-hidden="true" />
                <span>Chi tiết kỹ thuật (dành cho quản trị viên)</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-m3-short-4 ease-m3-emphasized ${showDetails ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </Button>

            {showDetails && (
              <div className="mt-2 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-2 text-xs font-mono text-muted-foreground break-all animate-fade-in">
                {error.digest && (
                  <div>
                    <span className="font-semibold text-foreground">
                      Mã định danh lỗi (Digest):
                    </span>{" "}
                    <code className="text-destructive">{error.digest}</code>
                  </div>
                )}
                {error.message && (
                  <div>
                    <span className="font-semibold text-foreground">Thông điệp:</span>{" "}
                    <span>{error.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MD3 Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={() => reset()}
            className="w-full sm:w-auto shadow-sm"
          >
            <RefreshCw className="w-4.5 h-4.5 mr-2" aria-hidden="true" />
            Thử lại trang
          </Button>

          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/">
              <Home className="w-4.5 h-4.5 mr-2" aria-hidden="true" />
              Về Trang Chủ
            </Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="w-4.5 h-4.5 mr-2" aria-hidden="true" />
            Quay lại
          </Button>
        </div>
      </div>
    </main>
  );
}
