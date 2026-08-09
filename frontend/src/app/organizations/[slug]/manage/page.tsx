"use client";

import { use, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  useOrganizationMembersQuery,
  useSentInvitationsQuery,
  useCoursesQuery,
  usePartnersQuery,
  useMyOrganizationsQuery,
} from "@/lib/query_hooks";
import { InvitationType, InvitationStatus } from "@/gen/identity/v1/identity_pb";
import { CourseStatus, type Course } from "@/gen/catalog/v1/catalog_pb";
import { OrgHeaderNav } from "../components/OrgHeaderNav";
import { Card } from "@/components/ui/Card";
import { Users, Mail, BookOpen, UserPlus, Settings, ArrowRight, BadgeCheck } from "lucide-react";
import { Progress } from "@/components/ui/Progress";

function OrgManageContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { userRole, isSuperAdmin } = useAuth();
  const { data: myOrgs = [] } = useMyOrganizationsQuery();

  const currentOrg = myOrgs.find((o) => o.slug === slug || o.id === slug);
  const roleUpper = (currentOrg?.roleInOrg || "").toUpperCase();
  const isOwnerOrAdmin =
    isSuperAdmin ||
    userRole === "3" ||
    (userRole || "").toUpperCase().includes("ADMIN") ||
    roleUpper.includes("ADMIN") ||
    roleUpper.includes("OWNER");

  const { data: members = [] } = useOrganizationMembersQuery(slug);
  const { data: invitations = [] } = useSentInvitationsQuery(
    InvitationType.ORGANIZATION_MEMBER,
    slug,
  );
  const { data: allCourses = [] } = useCoursesQuery();
  const { data: partners = [] } = usePartnersQuery();

  const partner = partners.find((p) => p.slug === slug || p.id === slug);
  const orgName =
    partner?.name || (slug === "partner_community" ? "Coursera Project Network" : slug);

  const pendingInvitations = invitations.filter((i) => i.status === InvitationStatus.PENDING);
  const orgCourses = allCourses.filter(
    (c: Course) => c.organizationId === slug || slug === "partner_community",
  );
  const publishedCourses = orgCourses.filter((c: Course) => c.status === CourseStatus.PUBLISHED);

  return (
    <div className="w-full flex-1 bg-background min-h-screen">
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <OrgHeaderNav
          slug={slug}
          orgName={orgName}
          avatarUrl={partner?.logoUrl}
          activeTab="manage"
          isOwnerOrAdmin={isOwnerOrAdmin}
        />

        {/* Dynamic KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card
            variant="elevated"
            className="flex items-center gap-5 hover:border-primary/40 transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tổng Thành viên
              </p>
              <p className="text-3xl font-black text-foreground font-mono">{members.length}</p>
            </div>
          </Card>

          <Card
            variant="elevated"
            className="flex items-center gap-5 hover:border-primary/40 transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <Mail className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Lời mời đang chờ
              </p>
              <p className="text-3xl font-black text-warning font-mono">
                {pendingInvitations.length}
              </p>
            </div>
          </Card>

          <Card
            variant="elevated"
            className="flex items-center gap-5 hover:border-primary/40 transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-success/10 text-success flex items-center justify-center shrink-0">
              <BadgeCheck className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Khóa học đã xuất bản
              </p>
              <p className="text-3xl font-black text-success font-mono">
                {publishedCourses.length}
              </p>
            </div>
          </Card>

          <Card
            variant="elevated"
            className="flex items-center gap-5 hover:border-primary/40 transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-info/10 text-info flex items-center justify-center shrink-0">
              <BookOpen className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tổng Khóa học Org
              </p>
              <p className="text-3xl font-black text-foreground font-mono">{orgCourses.length}</p>
            </div>
          </Card>
        </div>

        {/* Quick Action Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            variant="outlined"
            render={<Link href={`/organizations/${slug}/members`} />}
            className="hover:border-primary/50 transition-colors group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UserPlus className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5 text-base">
                Thành viên Tổ chức
                <ArrowRight
                  aria-hidden="true"
                  className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors"
                />
              </h3>
              <p className="text-xs text-muted-foreground">
                Xem danh sách giảng viên & đồng nghiệp thuộc Tổ chức.
              </p>
            </div>
          </Card>

          {isOwnerOrAdmin && (
            <>
              <Card
                variant="outlined"
                render={<Link href={`/organizations/${slug}/invitations`} />}
                className="hover:border-primary/50 transition-colors group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="font-bold text-foreground group-hover:text-warning transition-colors flex items-center gap-1.5 text-base">
                    Lời mời đã gửi ({pendingInvitations.length})
                    <ArrowRight
                      aria-hidden="true"
                      className="w-4 h-4 text-muted-foreground group-hover:text-warning transition-colors"
                    />
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Theo dõi các lời mời gia nhập đang chờ phản hồi và sao chép link token.
                  </p>
                </div>
              </Card>

              <Card
                variant="outlined"
                render={<Link href={`/organizations/${slug}/settings`} />}
                className="hover:border-primary/50 transition-colors group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <Settings className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="font-bold text-foreground group-hover:text-foreground transition-colors flex items-center gap-1.5 text-base">
                    Cài đặt Tổ chức
                    <ArrowRight aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Cập nhật Tên, Logo, Banner, Domain bảo chứng và thông tin thương hiệu.
                  </p>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Recent Members Preview */}
        <Card variant="outlined" className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" aria-hidden="true" />
                Thành viên Tổ chức ({members.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Danh sách thành viên chính thức đang hoạt động trong Tổ chức
              </p>
            </div>
            <Link
              href={`/organizations/${slug}/members`}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Xem tất cả →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {members.slice(0, 6).map((m) => (
              <div
                key={m.memberId || m.userId}
                className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center space-x-3"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  {m.avatarUrl ? (
                    <Image
                      src={m.avatarUrl}
                      alt={m.fullName || "Avatar"}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    m.fullName?.charAt(0).toUpperCase() || "U"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">
                    {m.fullName || m.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}

export default function OrgManagePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground gap-2">
          <Progress.Circular size="sm" />
          <span className="text-sm">Đang tải bảng điều khiển...</span>
        </div>
      }
    >
      <OrgManageContent params={params} />
    </Suspense>
  );
}
