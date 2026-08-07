import { Suspense } from "react";
import type { Metadata } from "next";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { getPublicRpcServerClient } from "@/lib/server_connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { CourseDetailClient } from "./CourseDetailClient";

/**
 * Best Practice Next.js 16 Cache Components:
 * Metadata is cached for days and invalidated on-demand via updateTag(`course-${courseId}`).
 */
async function getCourseMetadata(courseId: string): Promise<Metadata> {
  "use cache";
  cacheLife("days");
  cacheTag("courses", `course-${courseId}`);

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

/**
 * Initial course detail & reviews payload cached for hours.
 * Triggered on-demand via updateTag(`course-${courseId}`) when course content updates.
 */
async function getInitialCourseDetailData(courseId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("courses", `course-${courseId}`);

  const queryClient = new QueryClient();
  const client = getPublicRpcServerClient(CatalogService);

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["courseDetail", courseId],
      queryFn: async () => (await client.getCourseDetail({ idOrSlug: courseId })).course ?? null,
    }),
    queryClient.prefetchQuery({
      queryKey: ["courseReviews", courseId],
      queryFn: async () => (await client.listCourseReviews({ courseId })).reviews || [],
    }),
  ]);

  return dehydrate(queryClient);
}

async function CourseDetailContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ courseId: string }>;
}) {
  const { courseId } = await paramsPromise;
  const dehydratedState = await getInitialCourseDetailData(courseId);

  return (
    <HydrationBoundary state={dehydratedState}>
      <CourseDetailClient courseId={courseId} />
    </HydrationBoundary>
  );
}

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground animate-pulse">
          Đang tải thông tin khóa học...
        </div>
      }
    >
      <CourseDetailContent paramsPromise={params} />
    </Suspense>
  );
}
