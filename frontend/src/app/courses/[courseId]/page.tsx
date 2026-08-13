import { Suspense } from "react";
import type { Metadata } from "next";
import { getPublicRpcServerClient } from "@/lib/server_connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { CourseDetailClient } from "./CourseDetailClient";

/**
 * Metadata retrieval for Course Detail page.
 */
async function getCourseMetadata(courseId: string): Promise<Metadata> {
  try {
    const client = getPublicRpcServerClient(CatalogService);
    const res = await client.getCourseDetail({ idOrSlug: courseId });
    if (!res.course) {
      return {
        title: "Chi tiết Khóa học",
        description: "Khóa học chất lượng cao trên LMS AI Study Assistant",
      };
    }
    return {
      title: `${res.course.title} - LMS AI Study Assistant`,
      description: res.course.description
        ? res.course.description.slice(0, 160)
        : "Khóa học chất lượng cao trên LMS AI Study Assistant",
    };
  } catch {
    return {
      title: "Chi tiết Khóa học",
      description: "Khóa học chất lượng cao trên LMS AI Study Assistant",
    };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<Metadata> {
  const { courseId } = await params;
  return getCourseMetadata(courseId);
}

async function CourseDetailWrapper({
  paramsPromise,
}: {
  paramsPromise: Promise<{ courseId: string }>;
}) {
  const { courseId } = await paramsPromise;
  return <CourseDetailClient courseId={courseId} />;
}

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground animate-pulse">
          Đang tải thông tin khóa học…
        </div>
      }
    >
      <CourseDetailWrapper paramsPromise={params} />
    </Suspense>
  );
}
