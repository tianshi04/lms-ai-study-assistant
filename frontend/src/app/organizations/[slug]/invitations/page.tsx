"use client";

import { use, useState, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  useSentInvitationsQuery,
  useCancelInvitationMutation,
  usePartnersQuery,
  useMyOrganizationsQuery,
} from "@/lib/query_hooks";
import { InvitationType, InvitationStatus } from "@/gen/identity/v1/identity_pb";
import { OrgHeaderNav } from "../components/OrgHeaderNav";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import {
  Mail,
  Loader2,
  Copy,
  Check,
  XCircle,
  Clock,
  CheckCircle2,
  Inbox,
  Trash2,
  ShieldAlert,
} from "lucide-react";

function OrgInvitationsContent({ params }: { params: Promise<{ slug: string }> }) {
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

  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [cancelingInvId, setCancelingInvId] = useState<string | null>(null);

  const {
    data: invitations = [],
    isLoading,
    refetch,
  } = useSentInvitationsQuery(InvitationType.ORGANIZATION_MEMBER, slug, {
    enabled: isOwnerOrAdmin,
  });
  const { data: partners = [] } = usePartnersQuery();

  const partner = partners.find((p) => p.slug === slug || p.id === slug);
  const orgName =
    partner?.name || (slug === "partner_community" ? "Coursera Project Network" : slug);

  if (!isOwnerOrAdmin) {
    return (
      <div className="w-full flex-1 bg-background min-h-screen">
        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          <OrgHeaderNav
            slug={slug}
            orgName={orgName}
            avatarUrl={partner?.logoUrl}
            activeTab="invitations"
            isOwnerOrAdmin={false}
          />
          <Card variant="outlined" className="p-12 text-center space-y-4 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-foreground">Không có quyền quản trị</h3>
            <p className="text-xs text-muted-foreground">
              Bạn đang ở vai trò <strong>{currentOrg?.roleInOrg || "Giảng viên"}</strong>. Bạn không
              có quyền xem hoặc gửi lời mời gia nhập Tổ chức này.
            </p>
            <Link
              href={`/organizations/${slug}/manage`}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs"
            >
              Quay lại Tổng quan
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  const cancelMutation = useCancelInvitationMutation({
    onSuccess: () => {
      refetch();
      setCancelingInvId(null);
    },
  });

  const handleCopyInviteLink = (invId: string, token: string) => {
    const link = `${window.location.origin}/invitations/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedTokenId(invId);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const getStatusBadge = (status: InvitationStatus) => {
    switch (status) {
      case InvitationStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning/10 text-warning border border-warning/20">
            <Clock className="w-3 h-3" aria-hidden="true" />
            Đang chờ
          </span>
        );
      case InvitationStatus.ACCEPTED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            Đã chấp nhận
          </span>
        );
      case InvitationStatus.DECLINED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
            <XCircle className="w-3 h-3" aria-hidden="true" />
            Đã từ chối
          </span>
        );
      case InvitationStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
            <XCircle className="w-3 h-3" aria-hidden="true" />
            Đã hủy
          </span>
        );
      case InvitationStatus.EXPIRED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
            <Clock className="w-3 h-3" aria-hidden="true" />
            Hết hạn
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
            {status || "Không xác định"}
          </span>
        );
    }
  };

  return (
    <div className="w-full flex-1 bg-background min-h-screen">
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <OrgHeaderNav
          slug={slug}
          orgName={orgName}
          avatarUrl={partner?.logoUrl}
          activeTab="invitations"
        />

        {/* Invitations Table */}
        <Card variant="outlined" className="p-0 overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" aria-hidden="true" />
                Lời mời đã gửi ({invitations.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Theo dõi các lời mời gia nhập Tổ chức và sao chép link token gửi trực tiếp.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 text-primary animate-spin" aria-hidden="true" />
              <p className="text-sm">Đang tải danh sách lời mời...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <Inbox className="w-10 h-10 mx-auto opacity-40" aria-hidden="true" />
              <p className="text-sm font-medium">Chưa có lời mời nào được gửi.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6 py-3.5">Email Người nhận</TableHead>
                    <TableHead className="px-6 py-3.5">Vai trò mời</TableHead>
                    <TableHead className="px-6 py-3.5">Trạng thái</TableHead>
                    <TableHead className="px-6 py-3.5">Ngày tạo</TableHead>
                    <TableHead className="px-6 py-3.5 text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="px-6 py-4 font-bold text-foreground">
                        {inv.inviteeEmail}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {inv.roleId || "INSTRUCTOR"}
                      </TableCell>
                      <TableCell className="px-6 py-4">{getStatusBadge(inv.status)}</TableCell>
                      <TableCell className="px-6 py-4 text-xs text-muted-foreground">
                        {inv.createdAt
                          ? new Date(inv.createdAt).toLocaleDateString("vi-VN")
                          : "Gần đây"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status === InvitationStatus.PENDING && inv.token && (
                            <Button
                              type="button"
                              variant="outlined"
                              size="sm"
                              onClick={() => handleCopyInviteLink(inv.id, inv.token)}
                              className="text-xs shrink-0"
                            >
                              {copiedTokenId === inv.id ? (
                                <Check className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                              {copiedTokenId === inv.id ? "Đã chép link!" : "Copy Link"}
                            </Button>
                          )}

                          {inv.status === InvitationStatus.PENDING && (
                            <IconButton
                              type="button"
                              variant="standard"
                              size="xs"
                              onClick={() => setCancelingInvId(inv.id)}
                              className="text-destructive hover:bg-destructive/10"
                              title="Hủy lời mời"
                              aria-label="Hủy lời mời gia nhập"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </IconButton>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Cancel Invitation Confirm Dialog */}
        <Dialog.Root
          open={Boolean(cancelingInvId)}
          onOpenChange={(open: boolean) => {
            if (!open) setCancelingInvId(null);
          }}
        >
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Icon icon={<XCircle className="w-6 h-6 text-error" aria-hidden="true" />} />
              <Dialog.Title>Hủy Lời mời Gia nhập</Dialog.Title>
              <Dialog.Description>
                Bạn có chắc chắn muốn hủy lời mời này không? Người được mời sẽ không thể dùng link
                token này nữa.
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Button variant="text" onClick={() => setCancelingInvId(null)}>
                Hủy
              </Button>
              <Button
                variant="filled"
                className="bg-error text-on-error hover:bg-destructive-hover active:bg-destructive-active"
                onClick={() => {
                  if (cancelingInvId) cancelMutation.mutate({ invitationId: cancelingInvId });
                }}
                disabled={cancelMutation.isPending}
              >
                Hủy Lời Mời
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      </main>
    </div>
  );
}

export default function OrgInvitationsPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
          <span className="text-sm">Đang tải danh sách lời mời...</span>
        </div>
      }
    >
      <OrgInvitationsContent params={params} />
    </Suspense>
  );
}
