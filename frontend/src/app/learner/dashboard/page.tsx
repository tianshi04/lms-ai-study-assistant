"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { LearningDashboard } from "@/components/home/LearningDashboard";

export default function LearnerDashboardPage() {
  const { userName } = useAuth();

  return <LearningDashboard userName={userName || "Học viên"} />;
}
