import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { getPublicRpcServerClient } from "@/lib/server_connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { CourseCatalogClient } from "./CourseCatalogClient";

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

  const defaultFilters = {
    searchQuery: "",
    subject: "",
    level: "",
    sortBy: "",
    pageSize: 10,
  };

  const client = getPublicRpcServerClient(CatalogService);

  // Prefetch initial course list & category filters on the server
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["courses", defaultFilters],
      queryFn: async () => {
        const res = await client.listCourses(defaultFilters);
        return res.courses;
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["categories", "SUBJECT"],
      queryFn: async () => {
        const res = await client.listCategories({ type: "SUBJECT" });
        return res.categories;
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["categories", "LEVEL"],
      queryFn: async () => {
        const res = await client.listCategories({ type: "LEVEL" });
        return res.categories;
      },
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
