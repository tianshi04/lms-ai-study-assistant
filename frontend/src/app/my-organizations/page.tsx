"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMyOrganizationsQuery } from "@/lib/query_hooks";
import { MyInvitationsDrawer } from "@/components/invitation/MyInvitationsDrawer";
import { Button } from "@/components/ui/Button";
import {
  Building2,
  Users,
  Shield,
  Mail,
  Loader2,
  Clock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

function MyOrganizationsContent() {
  const [isInvitationsOpen, setIsInvitationsOpen] = useState(false);

  const { data: organizations = [], isLoading, error } = useMyOrganizationsQuery();

  const getRoleBadge = (roleStr: string) => {
    const roleUpper = (roleStr || "").toUpperCase();
    if (roleUpper.includes("ADMIN") || roleUpper.includes("OWNER")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
          <Shield className="w-3.5 h-3.5" aria-hidden="true" />
          Quản trị viên Org
        </span>
      );
    }
    if (roleUpper.includes("INSTRUCTOR")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20">
          <Users className="w-3.5 h-3.5" aria-hidden="true" />
          Giảng viên Org
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
        Thành viên
      </span>
    );
  };

  return (
    <div className="w-full flex-1 bg-background min-h-screen">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Breadcrumb & Navigation */}
        <nav className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="text-foreground font-semibold">Tổ chức của tôi</span>
        </nav>

        {/* Header Banner */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              <Building2 className="w-4 h-4" aria-hidden="true" />
              Quản lý Tổ chức & Đối tác
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Tổ chức của tôi
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Danh sách các Partner Organization mà bạn đang tham gia với tư cách Giảng viên hoặc
              Quản trị viên. Bạn có thể quản lý thành viên và xem lời mời trực tiếp tại đây.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="outlined"
              onClick={() => setIsInvitationsOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-muted text-foreground hover:bg-muted/80 font-bold text-sm"
            >
              <Mail className="w-4 h-4 text-primary" aria-hidden="true" />
              Lời mời của tôi
            </Button>
          </div>
        </header>

        {/* Organizations List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" aria-hidden="true" />
              Danh sách Tổ chức ({organizations.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-card border border-border rounded-3xl space-y-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Đang tải danh sách tổ chức...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-destructive/10 text-destructive border border-destructive/20 rounded-3xl text-sm font-medium">
              Không thể tải danh sách tổ chức: {error.message}
            </div>
          ) : organizations.length === 0 ? (
            <div className="p-12 text-center bg-card border border-border rounded-3xl space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Building2 className="w-8 h-8" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-foreground">Bạn chưa tham gia tổ chức nào</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Khi bạn được mời tham gia một Partner Organization hoặc nộp đơn Giảng viên thành
                công, các tổ chức bạn thuộc về sẽ xuất hiện ở đây.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {organizations.map((org) => (
                <Link
                  key={org.id}
                  href={`/organizations/${org.slug || org.id}/manage`}
                  className="p-6 rounded-3xl bg-card border border-border shadow-xs hover:border-primary/50 hover:shadow-md group transition-all flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black text-lg">
                          {org.avatarUrl ? (
                            <Image
                              src={org.avatarUrl}
                              alt={org.name || "Org"}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover rounded-2xl"
                            />
                          ) : (
                            org.name?.charAt(0).toUpperCase() || "O"
                          )}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <h3 className="font-bold text-foreground text-base truncate group-hover:text-primary transition-colors">
                            {org.name}
                          </h3>
                          {org.slug && (
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              Slug: {org.slug}
                            </p>
                          )}
                        </div>
                      </div>
                      {getRoleBadge(org.roleInOrg)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border/50 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Trạng thái:</span>
                        <span className="font-bold text-success flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Hoạt động (Active)
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Ngày tham gia:</span>
                        <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                          {org.joinedAt
                            ? new Date(org.joinedAt).toLocaleDateString("vi-VN")
                            : "Gần đây"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between text-xs font-bold text-primary group-hover:underline">
                    <span>Vào trang Quản lý Tổ chức</span>
                    <ChevronRight
                      className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* My Invitations Drawer */}
      <MyInvitationsDrawer isOpen={isInvitationsOpen} onClose={() => setIsInvitationsOpen(false)} />
    </div>
  );
}

export default function MyOrganizationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
          <span className="text-sm">Đang tải tổ chức...</span>
        </div>
      }
    >
      <MyOrganizationsContent />
    </Suspense>
  );
}
