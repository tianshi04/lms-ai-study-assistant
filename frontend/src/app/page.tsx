import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthServer } from "@/lib/auth_server";
import { PublicLanding } from "@/components/home/PublicLanding";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

async function AuthenticatedHomeSwitch() {
  const session = await getAuthServer();

  if (session.accessToken) {
    const role = String(session.userRole || "1").toUpperCase();
    if (role === "2" || role.includes("INSTRUCTOR")) {
      redirect("/instructor/dashboard");
    } else if (role === "3" || role.includes("ADMIN") || role.includes("SUPER_ADMIN")) {
      redirect("/admin/dashboard");
    } else {
      redirect("/learner/dashboard");
    }
  }

  return <PublicLanding />;
}

export default function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AuthenticatedHomeSwitch />
    </Suspense>
  );
}
