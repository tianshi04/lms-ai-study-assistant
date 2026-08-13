import { Suspense } from "react";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { GraduationCap } from "lucide-react";
import { CourseGridSkeleton } from "@/components/course/CourseGridSkeleton";
import { getPublicRpcServerClient } from "@/lib/server_connect_client";
import { CatalogService, type Course, type Category } from "@/gen/catalog/v1/catalog_pb";
import { CourseCatalogClient } from "./CourseCatalogClient";

export const metadata: Metadata = {
  title: "Danh Sách Khóa Học | LMS AI Platform",
  description: "Khám phá danh sách các khóa học chất lượng cao về AI và Công nghệ thông tin.",
};

async function getCachedInitialCatalog() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog", "courses-initial");

  let initialCourses: Course[] = [];
  let initialSubjects: Category[] = [];
  let initialLevels: Category[] = [];

  try {
    const client = getPublicRpcServerClient(CatalogService);
    const [coursesRes, subjectsRes, levelsRes] = await Promise.all([
      client.listCourses({ pageSize: 10 }),
      client.listCategories({ type: "SUBJECT" }),
      client.listCategories({ type: "LEVEL" }),
    ]);
    initialCourses = coursesRes.courses;
    initialSubjects = subjectsRes.categories;
    initialLevels = levelsRes.categories;
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "Server catalog fetch fallback to client:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return { initialCourses, initialSubjects, initialLevels };
}

async function CourseCatalogWrapper() {
  const { initialCourses, initialSubjects, initialLevels } = await getCachedInitialCatalog();

  return (
    <CourseCatalogClient
      initialCourses={initialCourses}
      initialSubjects={initialSubjects}
      initialLevels={initialLevels}
    />
  );
}

export default function CoursesPage() {
  return (
    <main className="w-full max-w-7xl mx-auto px-6 py-12 min-h-[65vh] bg-surface text-on-surface">
      {/* 🟢 KHUNG TĨNH TẦNG 1: Render ngay lập tức 0ms */}
      <div className="mb-10 text-center md:text-left max-w-5xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-container border border-primary/20 text-on-primary-container text-xs font-bold uppercase tracking-wider mb-4 shadow-xs">
          <GraduationCap className="w-4 h-4 text-primary" aria-hidden="true" />
          {"Coursera-Style Specializations & Courses"}
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-on-surface mb-4 text-balance">
          {"Khám phá Khóa học & Lộ trình Học tập"}
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed">
          {
            "Học tập với bài giảng video tương tác, phụ đề cuộn thông minh, bài tập thực hành nâng cao và thảo luận cộng đồng."
          }
        </p>
      </div>

      {/* 🔵 SUSPENSE BỌC KHU VỰC BỘ LỌC VÀ LƯỚI KHÓA HỌC DỘNG */}
      <Suspense fallback={<CourseGridSkeleton />}>
        <CourseCatalogWrapper />
      </Suspense>
    </main>
  );
}
