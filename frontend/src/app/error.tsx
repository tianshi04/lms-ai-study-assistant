"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime errors for observability
    console.error("Unhandled App Error:", error);
  }, [error]);

  return (
    <main className="flex-1 flex items-center justify-center min-h-[70vh] px-6 py-16 text-center">
      <div className="space-y-8 max-w-2xl mx-auto">
        {/* Badge */}
        <Badge variant="danger" className="uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse mr-2" />
          <span>{"Đã xảy ra sự cố hệ thống"}</span>
        </Badge>

        {/* Graphical Illustration */}
        <div className="relative flex items-center justify-center my-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-card border border-border shadow-xl flex items-center justify-center text-destructive">
            <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
        </div>

        {/* Headings */}
        <div className="space-y-3 max-w-xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground text-balance">
            {"Rất tiếc, đã có lỗi không mong muốn xảy ra!"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {
              "Hệ thống gặp sự cố tạm thời khi xử lý yêu cầu của bạn. Bạn có thể thử lại hoặc quay về trang chủ."
            }
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-muted-foreground pt-1">Mã lỗi: {error.digest}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button type="button" onClick={() => reset()} className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            {"Thử lại trang"}
          </Button>
          <Button asChild variant="secondary" className="w-full sm:w-auto">
            <Link href="/">{"Về Trang Chủ"}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
