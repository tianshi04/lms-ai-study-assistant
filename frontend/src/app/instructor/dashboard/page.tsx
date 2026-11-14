"use client";

import { Suspense } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { InstructorDashboard } from "@/components/dashboard/InstructorDashboard";

function DashboardContent() {
  const { userName } = useAuth();
  return <InstructorDashboard userName={userName || "Giảng viên"} />;
}

export default function InstructorDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
