"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PublicLanding } from "@/components/home/PublicLanding";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMyOrganizationsQuery } from "@/lib/query_hooks";

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

  const isAdminRole =
    isSuperAdmin ||
    userRole === "3" ||
    userRole === "USER_ROLE_ADMIN" ||
    userRole === "USER_ROLE_SUPER_ADMIN";
  const isInstructorRole = userRole === "2" || userRole === "USER_ROLE_INSTRUCTOR";

  const shouldCheckOrgOwnership = isUserAuthenticated && !isAdminRole && !isInstructorRole;
  const { data: myOrgs = [], isLoading: orgsLoading } = useMyOrganizationsQuery({
    enabled: shouldCheckOrgOwnership,
  });

  useEffect(() => {
    if (!isUserAuthenticated) return;

    if (isAdminRole) {
      router.replace("/admin/dashboard");
      return;
    }

    if (isInstructorRole) {
      router.replace("/instructor/dashboard");
      return;
    }

    if (orgsLoading) return;

    const ownedOrg = myOrgs.find((org) => {
      if (org.id === "partner_community") return false;
      const roleUpper = (org.roleInOrg || "").toUpperCase();
      return roleUpper.includes("OWNER") || roleUpper.includes("ADMIN");
    });

    if (ownedOrg) {
      router.replace(`/organizations/${ownedOrg.slug || ownedOrg.id}/dashboard`);
    } else {
      router.replace("/learner/dashboard");
    }
  }, [isUserAuthenticated, isAdminRole, isInstructorRole, orgsLoading, myOrgs, router]);

  if (!isUserAuthenticated) {
    return <PublicLanding />;
  }

  return null;
}
