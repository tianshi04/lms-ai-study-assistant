import { Suspense } from "react";
import type { Metadata } from "next";
import { GradingCockpitClient } from "./GradingCockpitClient";

export const metadata: Metadata = {
  title: "Trung tâm Chấm bài & Phúc khảo | LMS Studio",
  description:
    "Bàn làm việc sư phạm dành cho Giảng viên & Trợ giảng: Xử lý bài tập, khiếu nại và công bố điểm tức thì.",
};

interface GradingPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function GradingPage({ params }: GradingPageProps) {
  const { courseId } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">
              Đang tải bàn làm việc chấm bài...
            </p>
          </div>
        </div>
      }
    >
      <GradingCockpitClient courseId={courseId} />
    </Suspense>
  );
}
