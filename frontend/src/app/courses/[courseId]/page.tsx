import type { Metadata } from "next";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getRpcServerClient } from "@/lib/server_connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { CourseDetailClient } from "./CourseDetailClient";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore revalidate = 60 using cacheLife({ revalidate: 60 }) or "use cache"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<Metadata> {
  const { courseId } = await params;
  try {
    const client = await getRpcServerClient(CatalogService);
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

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["courseDetail", courseId],
      queryFn: async () => {
        const client = await getRpcServerClient(CatalogService);
        const res = await client.getCourseDetail({ idOrSlug: courseId });
        return res.course ?? null;
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["courseReviews", courseId],
      queryFn: async () => {
        const client = await getRpcServerClient(CatalogService);
        const res = await client.listCourseReviews({ courseId });
        return res.reviews || [];
      },
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CourseDetailClient courseId={courseId} />
    </HydrationBoundary>
  );
}
