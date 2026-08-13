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
import { Surface } from "@/components/ui/Surface";
import { IconButton } from "@/components/ui/IconButton";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Dialog } from "@/components/ui/Dialog";

import { Progress } from "@/components/ui/Progress";
import { Users, UserPlus, Trash2, Shield, CheckCircle2, Search, Copy, Check } from "lucide-react";

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
        <Surface
          variant="low"
          shape="2xl"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6"
        >
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10"
              aria-hidden="true"
            />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm thành viên theo tên hoặc email…"
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
        </Surface>

        {/* Members Table */}
        <Surface variant="low" shape="2xl" className="p-0 overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" aria-hidden="true" />
              Danh sách Thành viên ({filteredMembers.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Progress.Circular size="md" />
              <p className="text-sm">Đang tải danh sách thành viên…</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <Users className="w-10 h-10 mx-auto opacity-40" aria-hidden="true" />
              <p className="text-sm font-medium">Không tìm thấy thành viên nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head className="px-6 py-3.5">Thành viên</Table.Head>
                    <Table.Head className="px-6 py-3.5">Email</Table.Head>
                    <Table.Head className="px-6 py-3.5">Vai trò trong Org</Table.Head>
                    <Table.Head className="px-6 py-3.5">Trạng thái</Table.Head>
                    {isOwnerOrAdmin && (
                      <Table.Head className="px-6 py-3.5 text-right">Hành động</Table.Head>
                    )}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredMembers.map((m) => (
                    <Table.Row key={m.memberId || m.userId}>
                      <Table.Cell className="px-6 py-4">
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
                      </Table.Cell>
                      <Table.Cell className="px-6 py-4 text-muted-foreground font-mono text-xs">
                        {m.email}
                      </Table.Cell>
                      <Table.Cell className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                          <Shield className="w-3 h-3" aria-hidden="true" />
                          {m.roleName || m.roleId || "Giảng viên"}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          {m.status || "ACTIVE"}
                        </span>
                      </Table.Cell>
                      {isOwnerOrAdmin && (
                        <Table.Cell className="px-6 py-4 text-right">
                          <IconButton
                            type="button"
                            variant="standard"
                            size="xs"
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
                          </IconButton>
                        </Table.Cell>
                      )}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          )}
        </Surface>

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
                        variant="outlined"
                        size="sm"
                        onClick={() => handleCopyLink(inviteFeedback.token!)}
                        className="text-[11px] h-7 px-2.5 shrink-0"
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
                  <Select.Trigger id="inviteRoleSelect" className="w-full">
                    <Select.Value placeholder="Chọn vai trò">
                      {inviteRole === "ORG_ADMIN"
                        ? "Quản trị viên Tổ chức (ORG_ADMIN)"
                        : inviteRole === "INSTRUCTOR"
                          ? "Giảng viên (INSTRUCTOR)"
                          : "Thành viên / Học viên (MEMBER)"}
                    </Select.Value>
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="ORG_ADMIN">Quản trị viên Tổ chức (ORG_ADMIN)</Select.Item>
                    <Select.Item value="INSTRUCTOR">Giảng viên (INSTRUCTOR)</Select.Item>
                    <Select.Item value="MEMBER">Thành viên / Học viên (MEMBER)</Select.Item>
                  </Select.Content>
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
                  placeholder="Chào mừng bạn đến với tổ chức của chúng tôi…"
                />
              </div>

              <Dialog.Footer className="pt-4 flex justify-end gap-3 border-t border-border">
                <Button type="button" variant="text" onClick={() => setIsInviteModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="filled" disabled={createInviteMutation.isPending}>
                  Gửi Lời Mời (PENDING)
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Root>

        {/* Remove Member Confirm Dialog */}
        <Dialog.Root
          open={Boolean(removingMember)}
          onOpenChange={(open: boolean) => {
            if (!open) setRemovingMember(null);
          }}
        >
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Icon icon={<Trash2 className="w-6 h-6 text-error" aria-hidden="true" />} />
              <Dialog.Title>Xóa thành viên khỏi Tổ chức</Dialog.Title>
              <Dialog.Description>
                {removingMember
                  ? `Bạn có chắc chắn muốn xóa thành viên "${removingMember.memberName}" khỏi tổ chức không? Thao tác này không thể hoàn tác.`
                  : ""}
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Button variant="text" onClick={() => setRemovingMember(null)}>
                Hủy
              </Button>
              <Button
                variant="filled"
                className="bg-error text-on-error hover:bg-destructive-hover active:bg-destructive-active"
                onClick={() => {
                  if (removingMember) {
                    removeMemberMutation.mutate({
                      userId: removingMember.userId,
                      organizationId: slug,
                    });
                  }
                }}
                disabled={removeMemberMutation.isPending}
              >
                Xóa Thành Viên
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      </main>
    </div>
  );
}

export default function OrgMembersPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground gap-2">
          <Progress.Circular size="sm" />
          <span className="text-sm">Đang tải danh sách thành viên…</span>
        </div>
      }
    >
      <OrgMembersContent params={params} />
    </Suspense>
  );
}
