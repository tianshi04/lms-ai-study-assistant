"use client";

import { use, useState, Suspense } from "react";
import Image from "next/image";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  useOrganizationMembersQuery,
  useRemoveOrganizationMemberMutation,
  useCreateInvitationMutation,
  usePartnersQuery,
  useMyOrganizationsQuery,
} from "@/lib/query_hooks";
import { InvitationType } from "@/gen/identity/v1/identity_pb";
import { mapConnectError } from "@/lib/connect_error_mapper";
import { OrgHeaderNav } from "../components/OrgHeaderNav";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/AlertDialog";
import { Dialog } from "@/components/ui/Modal";

import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  Loader2,
  CheckCircle2,
  Search,
  Copy,
  Check,
} from "lucide-react";

function OrgMembersContent({ params }: { params: Promise<{ slug: string }> }) {
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

  const [search, setSearch] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("INSTRUCTOR");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState<{
    type: "success" | "error";
    text: string;
    token?: string;
  } | null>(null);

  const [copiedToken, setCopiedToken] = useState(false);
  const [removingMember, setRemovingMember] = useState<{
    userId: string;
    memberName: string;
  } | null>(null);

  const { data: members = [], isLoading, refetch } = useOrganizationMembersQuery(slug);
  const { data: partners = [] } = usePartnersQuery();

  const partner = partners.find((p) => p.slug === slug || p.id === slug);
  const orgName =
    partner?.name || (slug === "partner_community" ? "Coursera Project Network" : slug);

  const createInviteMutation = useCreateInvitationMutation({
    onSuccess: (inv) => {
      setInviteFeedback({
        type: "success",
        text: `Đã gửi lời mời thành công tới ${inv.inviteeEmail}!`,
        token: inv.token,
      });
      setInviteEmail("");
      setInviteMsg("");
    },
    onError: (err) => {
      setInviteFeedback({
        type: "error",
        text: mapConnectError(err, "Không thể gửi lời mời."),
      });
    },
  });

  const removeMemberMutation = useRemoveOrganizationMemberMutation({
    onSuccess: () => {
      refetch();
      setRemovingMember(null);
    },
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteFeedback(null);
    createInviteMutation.mutate({
      type: InvitationType.ORGANIZATION_MEMBER,
      inviteeEmail: inviteEmail.trim(),
      targetId: slug,
      targetName: orgName,
      roleId: inviteRole,
      message: inviteMsg.trim(),
    });
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/invitations/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const filteredMembers = members.filter(
    (m) =>
      m.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="w-full flex-1 bg-background min-h-screen">
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <OrgHeaderNav
          slug={slug}
          orgName={orgName}
          avatarUrl={partner?.logoUrl}
          activeTab="members"
          isOwnerOrAdmin={isOwnerOrAdmin}
        />

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-3xl p-6 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10"
              aria-hidden="true"
            />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm thành viên theo tên hoặc email..."
              className="pl-10"
            />
          </div>

          {isOwnerOrAdmin && (
            <Button
              type="button"
              onClick={() => {
                setInviteFeedback(null);
                setIsInviteModalOpen(true);
              }}
            >
              <UserPlus className="w-4.5 h-4.5" aria-hidden="true" />
              Gửi Lời mời Thành viên Mới
            </Button>
          )}
        </div>

        {/* Members Table */}
        <section className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" aria-hidden="true" />
              Danh sách Thành viên ({filteredMembers.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 text-primary animate-spin" aria-hidden="true" />
              <p className="text-sm">Đang tải danh sách thành viên...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <Users className="w-10 h-10 mx-auto opacity-40" aria-hidden="true" />
              <p className="text-sm font-medium">Không tìm thấy thành viên nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6 py-3.5">Thành viên</TableHead>
                    <TableHead className="px-6 py-3.5">Email</TableHead>
                    <TableHead className="px-6 py-3.5">Vai trò trong Org</TableHead>
                    <TableHead className="px-6 py-3.5">Trạng thái</TableHead>
                    {isOwnerOrAdmin && (
                      <TableHead className="px-6 py-3.5 text-right">Hành động</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((m) => (
                    <TableRow key={m.memberId || m.userId}>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-xs">
                            {m.avatarUrl ? (
                              <Image
                                src={m.avatarUrl}
                                alt={m.fullName || "Avatar"}
                                width={36}
                                height={36}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              m.fullName?.charAt(0).toUpperCase() || "U"
                            )}
                          </div>
                          <span className="font-bold text-foreground">
                            {m.fullName || "Thành viên"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-muted-foreground font-mono text-xs">
                        {m.email}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                          <Shield className="w-3 h-3" aria-hidden="true" />
                          {m.roleName || m.roleId || "Giảng viên"}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          {m.status || "ACTIVE"}
                        </span>
                      </TableCell>
                      {isOwnerOrAdmin && (
                        <TableCell className="px-6 py-4 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setRemovingMember({
                                userId: m.userId,
                                memberName: m.fullName || m.email,
                              })
                            }
                            className="text-destructive hover:bg-destructive/10"
                            aria-label={`Xóa thành viên ${m.fullName || m.email}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Invite Member Modal */}
        <Dialog.Root open={isInviteModalOpen} onOpenChange={(open) => setIsInviteModalOpen(open)}>
          <Dialog.Content size="md">
            <Dialog.Header>
              <Dialog.Title>{"Gửi Lời mời Thành viên Mới"}</Dialog.Title>
            </Dialog.Header>
            <form onSubmit={handleSendInvite} className="space-y-5 pt-2">
              <p className="text-xs text-muted-foreground">
                Nhập email người dùng. Lời mời ở trạng thái <strong>PENDING</strong> sẽ được gửi tới
                người nhận. Người được mời phải bấm <strong>Chấp nhận</strong> thì mới gia nhập Tổ
                chức.
              </p>

              {inviteFeedback && (
                <div
                  className={`p-4 rounded-2xl text-xs space-y-2 ${
                    inviteFeedback.type === "success"
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  <p className="font-bold">{inviteFeedback.text}</p>
                  {inviteFeedback.token && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-success/20">
                      <span className="font-mono truncate">Token: {inviteFeedback.token}</span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleCopyLink(inviteFeedback.token!)}
                        className="bg-success text-success-foreground hover:bg-success/90 text-[11px] h-7 px-2.5 shrink-0"
                      >
                        {copiedToken ? (
                          <Check className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <Copy className="w-3 h-3" aria-hidden="true" />
                        )}
                        {copiedToken ? "Đã chép link!" : "Copy Link"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Input
                label="Email Người Dùng *"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@organization.org"
              />

              <div className="space-y-1.5">
                <label htmlFor="inviteRoleSelect" className="text-xs font-bold text-foreground">
                  Vai trò trong Tổ chức
                </label>
                <Select
                  value={inviteRole}
                  onValueChange={(val) => {
                    if (val) setInviteRole(val as string);
                  }}
                >
                  <SelectTrigger id="inviteRoleSelect" className="w-full">
                    <SelectValue placeholder="Chọn vai trò">
                      {inviteRole === "ORG_ADMIN"
                        ? "Quản trị viên Tổ chức (ORG_ADMIN)"
                        : inviteRole === "INSTRUCTOR"
                          ? "Giảng viên (INSTRUCTOR)"
                          : "Thành viên / Học viên (MEMBER)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORG_ADMIN">Quản trị viên Tổ chức (ORG_ADMIN)</SelectItem>
                    <SelectItem value="INSTRUCTOR">Giảng viên (INSTRUCTOR)</SelectItem>
                    <SelectItem value="MEMBER">Thành viên / Học viên (MEMBER)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="inviteMsg" className="text-xs font-bold text-foreground">
                  Lời nhắn (không bắt buộc)
                </label>
                <Textarea
                  id="inviteMsg"
                  rows={2}
                  value={inviteMsg}
                  onChange={(e) => setInviteMsg(e.target.value)}
                  placeholder="Chào mừng bạn đến với tổ chức của chúng tôi..."
                />
              </div>

              <Dialog.Footer className="pt-4 flex justify-end gap-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" isLoading={createInviteMutation.isPending}>
                  Gửi Lời Mời (PENDING)
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Root>

        {/* Remove Member Confirm Dialog */}
        <AlertDialog
          open={Boolean(removingMember)}
          onOpenChange={(open) => {
            if (!open) setRemovingMember(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa thành viên khỏi Tổ chức</AlertDialogTitle>
              <AlertDialogDescription>
                {removingMember
                  ? `Bạn có chắc chắn muốn xóa thành viên "${removingMember.memberName}" khỏi tổ chức không? Thao tác này không thể hoàn tác.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setRemovingMember(null)}>
                Hủy
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (removingMember) {
                    removeMemberMutation.mutate({
                      userId: removingMember.userId,
                      organizationId: slug,
                    });
                  }
                }}
                isLoading={removeMemberMutation.isPending}
              >
                Xóa Thành Viên
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

export default function OrgMembersPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
          <span className="text-sm">Đang tải danh sách thành viên...</span>
        </div>
      }
    >
      <OrgMembersContent params={params} />
    </Suspense>
  );
}
