"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";

export default function AdminDashboardPage() {
  const { userName } = useAuth();

  return <AdminDashboard userName={userName || "Admin"} />;
}
