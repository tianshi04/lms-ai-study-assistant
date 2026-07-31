"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { TADashboard } from "@/components/dashboard/TADashboard";

export default function TADashboardPage() {
  const { userName } = useAuth();
  return <TADashboard userName={userName || "Trợ giảng"} />;
}
