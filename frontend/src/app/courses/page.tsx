import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getPublicRpcServerClient } from "@/lib/server_connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { CourseCatalogClient } from "./CourseCatalogClient";

export const instant = false;

/**
 * Best Practice Next.js 16 Cache Components:
 * High read-to-write catalog data cached for hours with explicit tag invalidation.
 * Immediate cache invalidation is triggered via updateTag("courses") / updateTag("categories").
 */
async function getInitialCatalogData() {
  const queryClient = new QueryClient();

  const defaultFilters = {
    searchQuery: "",
    subject: "",
    level: "",
    sortBy: "",
    pageSize: 10,
  };

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
      queryKey: ["courses", defaultFilters],
      queryFn: async () => {
        return fetchWithTimeout(async () => {
          const res = await client.listCourses(defaultFilters);
          return res.courses;
        }, []);
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["categories", "SUBJECT"],
      queryFn: async () => {
        return fetchWithTimeout(async () => {
          const res = await client.listCategories({ type: "SUBJECT" });
          return res.categories;
        }, []);
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["categories", "LEVEL"],
      queryFn: async () => {
        return fetchWithTimeout(async () => {
          const res = await client.listCategories({ type: "LEVEL" });
          return res.categories;
        }, []);
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
