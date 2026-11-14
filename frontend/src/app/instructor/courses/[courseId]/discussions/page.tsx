import { Suspense } from "react";
import type { Metadata } from "next";
import { InstructorCourseDiscussionsClient } from "./InstructorCourseDiscussionsClient";

export const metadata: Metadata = {
  title: "Hỏi Đáp & Thảo Luận Khóa Học | LMS Studio",
  description: "Bàn làm việc giải đáp thắc mắc và hỗ trợ học viên trong khóa học.",
};

interface DiscussionsPageProps {
  params: Promise<{ courseId: string }>;
}

async function DiscussionsContent({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <InstructorCourseDiscussionsClient courseId={courseId} />;
}

export default function InstructorCourseDiscussionsPage({ params }: DiscussionsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">
              Đang tải bàn làm việc thảo luận...
            </p>
          </div>
        </div>
      }
    >
      <DiscussionsContent params={params} />
    </Suspense>
  );
}
