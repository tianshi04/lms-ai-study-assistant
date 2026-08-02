"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { PublicLanding } from "@/components/home/PublicLanding";
import { LearningDashboard } from "@/components/home/LearningDashboard";
import { InstructorDashboard } from "@/components/dashboard/InstructorDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";

interface HomeDashboardSwitchProps {
  initialToken?: string;
  initialUserName?: string;
  initialUserRole?: string;
}

export function HomeDashboardSwitch({
  initialToken,
  initialUserName,
  initialUserRole,
}: HomeDashboardSwitchProps) {
  const {
    isAuthenticated,
    userName: clientUserName,
    userRole: clientUserRole,
    isSuperAdmin,
  } = useAuth();

  const isUserAuthenticated = Boolean(initialToken) || isAuthenticated;
  const userRole = clientUserRole || initialUserRole || "1";
  const userName = clientUserName || initialUserName || "Học viên";

  if (!isUserAuthenticated) {
    return <PublicLanding />;
  }

  if (isSuperAdmin) {
    return <AdminDashboard userName={userName} />;
  }

  switch (userRole) {
    case "2":
    case "USER_ROLE_INSTRUCTOR":
      return <InstructorDashboard userName={userName} />;
    case "3":
    case "USER_ROLE_ADMIN":
    case "USER_ROLE_SUPER_ADMIN":
      return <AdminDashboard userName={userName} />;
    default:
      return <LearningDashboard userName={userName} />;
  }
}
