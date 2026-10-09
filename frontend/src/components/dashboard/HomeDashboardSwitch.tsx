"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { PublicLanding } from "@/components/home/PublicLanding";

interface HomeDashboardSwitchProps {
  initialToken?: string;
  initialUserName?: string;
  initialUserRole?: string;
}

export function HomeDashboardSwitch({ initialToken, initialUserRole }: HomeDashboardSwitchProps) {
  const router = useRouter();
  const { isAuthenticated, userRole: clientUserRole, isSuperAdmin } = useAuth();

  const isUserAuthenticated = Boolean(initialToken) || isAuthenticated;
  const userRole = clientUserRole || initialUserRole || "1";

  useEffect(() => {
    if (isUserAuthenticated) {
      if (
        isSuperAdmin ||
        userRole === "3" ||
        userRole === "USER_ROLE_ADMIN" ||
        userRole === "USER_ROLE_SUPER_ADMIN"
      ) {
        router.replace("/admin/dashboard");
      } else if (userRole === "2" || userRole === "USER_ROLE_INSTRUCTOR") {
        router.replace("/instructor/dashboard");
      } else {
        router.replace("/learner/dashboard");
      }
    }
  }, [isUserAuthenticated, userRole, isSuperAdmin, router]);

  if (!isUserAuthenticated) {
    return <PublicLanding />;
  }

  return null;
}
