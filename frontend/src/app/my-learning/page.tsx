import { Suspense } from "react";
import type { Metadata } from "next";
import { MyLearningClient } from "./MyLearningClient";

export const metadata: Metadata = {
  title: "Việc Học Của Tôi | LMS AI Platform",
  description:
    "Theo dõi tiến độ học tập, tiếp tục các khóa đang học và xem lại chứng chỉ đã hoàn thành.",
};

function MyLearningSkeleton() {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div
          key={n}
          className="bg-card border border-border rounded-2xl p-6 animate-pulse shadow-sm flex flex-col justify-between h-64"
        >
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="h-3 bg-muted rounded w-1/4" />
              <div className="h-4 bg-muted rounded w-1/5" />
            </div>
            <div className="h-6 bg-muted rounded w-3/4 mb-3" />
            <div className="h-4 bg-muted rounded w-1/2 mb-6" />
          </div>
          <div>
            <div className="h-2 bg-muted rounded mb-4" />
            <div className="h-10 bg-muted rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyLearningPage() {
  return (
    <main className="w-full max-w-7xl mx-auto px-6 pt-12 pb-20 flex-1">
      {/* 🟢 KHUNG TĨNH TẦNG 1: Render ngay lập tức 0ms */}
      <div className="w-full mb-10 text-center md:text-left max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4 text-balance">
          {"Việc học của tôi"}
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          {
            "Theo dõi tiến độ học tập, tiếp tục các khóa đang học, và xem lại chứng chỉ đã hoàn thành."
          }
        </p>
      </div>

      {/* 🔵 SUSPENSE BỌC NỘI DUNG VÀ TABS DỘNG */}
      <Suspense fallback={<MyLearningSkeleton />}>
        <MyLearningClient />
      </Suspense>
    </main>
  );
}
