import { Suspense } from "react";
import type { Metadata } from "next";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getPublicRpcServerClient } from "@/lib/server_connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { CourseCatalogClient } from "./CourseCatalogClient";

export const metadata: Metadata = {
  title: "Danh Sách Khóa Học | LMS AI Platform",
  description: "Khám phá danh sách các khóa học chất lượng cao về AI và Công nghệ thông tin.",
};

/**
 * Catalog data prefetching for Client Hydration.
 */
async function getInitialCatalogData() {
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
      queryFn: async () => {
        try {
          const res = await client.listCourses(defaultFilters);
          return res.courses;
        } catch {
          return [];
        }
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["categories", "SUBJECT"],
      queryFn: async () => {
        try {
          const res = await client.listCategories({ type: "SUBJECT" });
          return res.categories;
        } catch {
          return [];
        }
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["categories", "LEVEL"],
      queryFn: async () => {
        try {
          const res = await client.listCategories({ type: "LEVEL" });
          return res.categories;
        } catch {
          return [];
        }
      },
    }),
  ]);

  return dehydrate(queryClient);
}

async function CatalogContent() {
  const dehydratedState = await getInitialCatalogData();

  return (
    <HydrationBoundary state={dehydratedState}>
      <CourseCatalogClient />
    </HydrationBoundary>
  );
}

export default function CoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-7xl mx-auto px-6 py-12 min-h-[65vh] text-center text-muted-foreground animate-pulse">
          Đang tải danh sách khóa học...
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
