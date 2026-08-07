import type { Metadata } from "next";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { getPublicRpcServerClient } from "@/lib/server_connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { CourseCatalogClient } from "./CourseCatalogClient";

export const metadata: Metadata = {
  title: "Danh Sách Khóa Học | LMS AI Platform",
  description: "Khám phá danh sách các khóa học chất lượng cao về AI và Công nghệ thông tin.",
};

/**
 * Best Practice Next.js 16 Cache Components:
 * High read-to-write catalog data cached for hours with explicit tag invalidation.
 * Immediate cache invalidation is triggered via updateTag("courses") / updateTag("categories").
 */
async function getInitialCatalogData() {
  "use cache";
  cacheLife("hours");
  cacheTag("courses", "categories");

  const queryClient = new QueryClient();
  const client = getPublicRpcServerClient(CatalogService);

  const defaultFilters = {
    searchQuery: "",
    subject: "",
    level: "",
    sortBy: "",
    pageSize: 10,
  };

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["courses", defaultFilters],
      queryFn: async () => (await client.listCourses(defaultFilters)).courses,
    }),
    queryClient.prefetchQuery({
      queryKey: ["categories", "SUBJECT"],
      queryFn: async () => (await client.listCategories({ type: "SUBJECT" })).categories,
    }),
    queryClient.prefetchQuery({
      queryKey: ["categories", "LEVEL"],
      queryFn: async () => (await client.listCategories({ type: "LEVEL" })).categories,
    }),
  ]);

  return dehydrate(queryClient);
}

export default async function CoursesPage() {
  const dehydratedState = await getInitialCatalogData();

  return (
    <HydrationBoundary state={dehydratedState}>
      <CourseCatalogClient />
    </HydrationBoundary>
  );
}
