"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { PublicLanding } from "@/components/home/PublicLanding";
import { LearningDashboard } from "@/components/home/LearningDashboard";
import { InstructorDashboard } from "@/components/dashboard/InstructorDashboard";
import { TADashboard } from "@/components/dashboard/TADashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { PartnerDashboard } from "@/components/dashboard/PartnerDashboard";

interface HomeDashboardSwitchProps {
  initialToken?: string;
  initialUserName?: string;
  initialUserRole?: string;
  initialSystemRole?: string;
}

export function HomeDashboardSwitch({
  initialToken,
  initialUserName,
  initialUserRole,
  initialSystemRole,
}: HomeDashboardSwitchProps) {
  const {
    isAuthenticated,
    userName: clientUserName,
    userRole: clientUserRole,
    systemRole: clientSystemRole,
  } = useAuth();

  const isUserAuthenticated = Boolean(initialToken) || isAuthenticated;
  const systemRole = clientSystemRole || initialSystemRole;
  const userRole = clientUserRole || initialUserRole || "1";
  const userName = clientUserName || initialUserName || "Học viên";

  if (!isUserAuthenticated) {
    return <PublicLanding />;
  }

  if (
    systemRole === "SUPER_ADMIN" ||
    systemRole === "SYSTEM_ROLE_SUPER_ADMIN" ||
    systemRole === "2"
  ) {
    return <AdminDashboard userName={userName} />;
  }

  switch (userRole) {
    case "2":
      return <InstructorDashboard userName={userName} />;
    case "3":
      return <TADashboard userName={userName} />;
    case "4":
      return <AdminDashboard userName={userName} />;
    case "5":
      return <PartnerDashboard userName={userName} />;
    default:
      return <LearningDashboard userName={userName} />;
  }
}
