"use client";

import { AdminQualityAlerts } from "@/components/dashboard/admin/AdminQualityAlerts";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { useAdminAssessmentAlertsQuery } from "@/lib/queries/useAssessmentQueries";
import { useAdminCatalogStatsQuery } from "@/lib/queries/useCatalogQueries";
import { useAdminCertificateStatsQuery } from "@/lib/queries/useCertificateQueries";

export default function AdminModerationPage() {
  const assessmentQuery = useAdminAssessmentAlertsQuery();
  const catalogQuery = useAdminCatalogStatsQuery();
  const certificateQuery = useAdminCertificateStatsQuery();

  const queries = [assessmentQuery, catalogQuery, certificateQuery];
  const failedQuery = queries.find((q) => q.isError);
  const refetchFailed = () => {
    for (const q of queries) {
      if (q.isError) void q.refetch();
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {failedQuery && (
        <Surface
          variant="low"
          shape="2xl"
          className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-destructive/30"
        >
          <div>
            <h2 className="text-sm font-extrabold text-destructive">
              Không thể tải dữ liệu kiểm soát vi phạm
            </h2>
            <p className="text-xs text-muted-foreground">{failedQuery.error?.message}</p>
          </div>
          <Button variant="outlined" size="sm" onClick={refetchFailed}>
            Thử lại
          </Button>
        </Surface>
      )}

      <AdminQualityAlerts
        assessmentAlerts={assessmentQuery.data?.alerts ?? []}
        assessmentTotal={assessmentQuery.data?.totalCount}
        lowReviews={catalogQuery.data?.lowReviews ?? []}
        lowReviewTotal={catalogQuery.data?.lowReviewTotal}
        certificateTotal={certificateQuery.data?.certificatesIssued}
        isAssessmentLoading={assessmentQuery.isLoading}
        isReviewsLoading={catalogQuery.isLoading}
      />
    </main>
  );
}
