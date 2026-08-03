import type { Metadata } from "next";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { getPublicRpcServerClient } from "@/lib/server_connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { CourseDetailClient } from "./CourseDetailClient";

export const instant = false;

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
    if (res.course) {
      return {
        title: `${res.course.title} | LMS AI Study Assistant`,
        description:
          res.course.description ||
          "Tham gia khóa học chất lượng cao trên hệ thống đào tạo LMS AI.",
        openGraph: {
          title: res.course.title,
          description: res.course.description || "Khóa học AI & Khoa học Dữ liệu chất lượng cao.",
          type: "website",
        },
      };
    }
  } catch (err) {
    console.warn("Failed to generate metadata for course:", courseId, err);
  }
  return {
    title: "Chi Tiết Khóa Học | LMS AI Platform",
    description: "Khóa học chất lượng cao trên LMS AI Study Assistant.",
  };
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
  const queryClient = new QueryClient();
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

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["courseDetail", courseId],
      queryFn: async () => {
        return fetchWithTimeout(async () => {
          const res = await client.getCourseDetail({ idOrSlug: courseId });
          return res.course ?? null;
        }, null);
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["courseReviews", courseId],
      queryFn: async () => {
        return fetchWithTimeout(async () => {
          const res = await client.listCourseReviews({ courseId });
          return res.reviews || [];
        }, []);
      },
    }),
  ]);

  return dehydrate(queryClient);
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const dehydratedState = await getInitialCourseDetailData(courseId);

  return (
    <HydrationBoundary state={dehydratedState}>
      <CourseDetailClient courseId={courseId} />
    </HydrationBoundary>
  );
}
