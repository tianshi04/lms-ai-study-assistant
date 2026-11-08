import { Suspense } from "react";
import type { Metadata } from "next";
import { CourseGradebookClient } from "./CourseGradebookClient";

export const metadata: Metadata = {
  title: "Sổ điểm Khóa học | LMS Studio",
  description: "Bảng tổng hợp điểm số, nguồn gốc đánh giá và tiến độ học tập của sinh viên.",
};

interface GradebookPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function GradebookPage({ params }: GradebookPageProps) {
  const { courseId } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">Đang tải sổ điểm...</p>
          </div>
        </div>
      }
    >
      <CourseGradebookClient courseId={courseId} />
    </Suspense>
  );
}
