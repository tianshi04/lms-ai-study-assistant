import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getRpcServerClient } from "@/lib/server_connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { CourseCatalogClient } from "./CourseCatalogClient";

export const revalidate = 60; // Revalidate page every 60 seconds

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
