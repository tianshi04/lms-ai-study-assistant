import { Suspense } from "react";
import type { Metadata } from "next";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { connection } from "next/server";
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
 * Fetch raw course detail & reviews data (cacheable, no Date.now()).
 * QueryClient is NOT created inside "use cache" to avoid Date.now() instability.
 */
async function fetchCourseData(courseId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("courses", `course-${courseId}`);

  const client = getPublicRpcServerClient(CatalogService);

  const fetchWithTimeout = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      const timeoutPromise = new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Prerender timeout")), 2000),
      );
      return await Promise.race([fn(), timeoutPromise]);
    } catch {
      return fallback;
    }
  };

  const [course, reviews] = await Promise.all([
    fetchWithTimeout(async () => {
      const res = await client.getCourseDetail({ idOrSlug: courseId });
      return res.course ?? null;
    }, null),
    fetchWithTimeout(async () => {
      const res = await client.listCourseReviews({ courseId });
      return res.reviews || [];
    }, []),
  ]);

  return { course, reviews };
}

async function CourseDetailContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ courseId: string }>;
}) {
<<<<<<< HEAD
  const { courseId } = await paramsPromise;
  const dehydratedState = await getInitialCourseDetailData(courseId);
=======
  await connection();
  const { courseId } = await params;

  // Fetch cached data (no Date.now() inside cache boundary)
  const { course, reviews } = await fetchCourseData(courseId);

  // Hydrate QueryClient outside cache boundary (Date.now() is safe here in dynamic mode)
  const queryClient = new QueryClient();
  queryClient.setQueryData(["courseDetail", courseId], course);
  queryClient.setQueryData(["courseReviews", courseId], reviews);
  const dehydratedState = dehydrate(queryClient);
>>>>>>> 14d2db9 (fix(storage/catalog): fix R2 proxy upload CORS, Next.js 16 prerender error, and IPv6 lookup timeouts)

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
