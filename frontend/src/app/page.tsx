import { Suspense } from "react";
import { getAuthServer } from "@/lib/auth_server";
import { HomeDashboardSwitch } from "@/components/dashboard/HomeDashboardSwitch";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

async function AuthenticatedHomeSwitch() {
  const session = await getAuthServer();

  return (
    <HomeDashboardSwitch
      initialToken={session.accessToken || undefined}
      initialUserName={session.userName || undefined}
      initialUserRole={session.userRole || undefined}
      initialSystemRole={session.systemRole || undefined}
    />
  );
}

export default function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AuthenticatedHomeSwitch />
    </Suspense>
  );
}
