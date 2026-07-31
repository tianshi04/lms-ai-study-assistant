"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { InstructorDashboard } from "@/components/dashboard/InstructorDashboard";

export default function InstructorDashboardPage() {
  const { userName } = useAuth();
  return <InstructorDashboard userName={userName || "Giảng viên"} />;
}
