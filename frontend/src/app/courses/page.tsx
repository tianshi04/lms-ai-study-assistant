import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getRpcServerClient } from "@/lib/server_connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { CourseCatalogClient } from "./CourseCatalogClient";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore revalidate = 60 using cacheLife({ revalidate: 60 }) or "use cache"

export default async function CoursesPage() {
  const queryClient = new QueryClient();

  const defaultFilters = {
    searchQuery: "",
    subject: "",
    level: "",
    sortBy: "",
    pageSize: 10,
  };

  // Prefetch initial course list & category filters on the server
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["courses", defaultFilters],
      queryFn: async () => {
        const client = await getRpcServerClient(CatalogService);
        const res = await client.listCourses(defaultFilters);
        return res.courses;
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["categories", "SUBJECT"],
      queryFn: async () => {
        const client = await getRpcServerClient(CatalogService);
        const res = await client.listCategories({ type: "SUBJECT" });
        return res.categories;
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["categories", "LEVEL"],
      queryFn: async () => {
        const client = await getRpcServerClient(CatalogService);
        const res = await client.listCategories({ type: "LEVEL" });
        return res.categories;
      },
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CourseCatalogClient />
    </HydrationBoundary>
  );
}
