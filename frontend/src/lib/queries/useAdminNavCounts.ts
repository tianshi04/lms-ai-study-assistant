import { useAdminAssessmentAlertsQuery } from "@/lib/queries/useAssessmentQueries";
import { useAdminCatalogStatsQuery } from "@/lib/queries/useCatalogQueries";
import { useAdminCertificateStatsQuery } from "@/lib/queries/useCertificateQueries";
import { useAdminIdentityStatsQuery } from "@/lib/queries/useIdentityQueries";
import { useActiveAnnouncementsQuery } from "@/lib/queries/useNotificationQueries";

/** Formats a pending counter for compact corner notification badges (e.g. `99+`). */
export function formatCornerBadgeCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

/**
 * Lightweight actionable pending counts for global navigation (Navbar / Dashboard CTA).
 * Calls only 3 cached aggregate KPI queries (enabled strictly for Super Admin) and
 * counts ONLY queues that a Super Admin can directly approve or acknowledge.
 */
export function useAdminNavbarPendingCount() {
  const identityQuery = useAdminIdentityStatsQuery();
  const catalogQuery = useAdminCatalogStatsQuery();
  const certificateQuery = useAdminCertificateStatsQuery();

  const pendingInstructorApplications = identityQuery.data?.pendingInstructorApplications ?? 0;
  const pendingReviewCourses = catalogQuery.data?.pendingReviewCourses ?? 0;
  const pendingFinancialAids = certificateQuery.data?.pendingFinancialAids ?? 0;
  const lowReviewTotal = catalogQuery.data?.lowReviewTotal ?? 0;

  const totalActionablePending =
    pendingInstructorApplications + pendingReviewCourses + pendingFinancialAids + lowReviewTotal;

  return {
    pendingInstructorApplications,
    pendingReviewCourses,
    pendingFinancialAids,
    lowReviewTotal,
    totalActionablePending,
  };
}

/**
 * Full workspace badge counts for the Admin Workspace top navigation bar.
 * Reuses the cached aggregate queries above and adds open assessment alerts
 * plus active system-wide banner announcements.
 */
export function useAdminWorkspaceBadgeCounts() {
  const base = useAdminNavbarPendingCount();
  const assessmentQuery = useAdminAssessmentAlertsQuery();
  const activeAnnouncementsQuery = useActiveAnnouncementsQuery();

  const assessmentAlertsTotal = assessmentQuery.data?.totalCount ?? 0;
  const activeAnnouncementsTotal = activeAnnouncementsQuery.data?.length ?? 0;

  return {
    ...base,
    assessmentAlertsTotal,
    activeAnnouncementsTotal,
  };
}
