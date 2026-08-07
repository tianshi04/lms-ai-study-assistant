"use client";

import { use, useState, Suspense } from "react";
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
import { ConfirmAlertDialog } from "@/components/ui/AlertDialog";
import { Modal } from "@/components/ui/Modal";
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
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm thành viên theo tên hoặc email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {isOwnerOrAdmin && (
            <button
              type="button"
              onClick={() => {
                setInviteFeedback(null);
                setIsInviteModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4.5 h-4.5" aria-hidden="true" />
              Gửi Lời mời Thành viên Mới
            </button>
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
              <Users className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-sm font-medium">Không tìm thấy thành viên nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 border-b border-border text-xs text-muted-foreground uppercase font-bold">
                  <tr>
                    <th className="px-6 py-3.5">Thành viên</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Vai trò trong Org</th>
                    <th className="px-6 py-3.5">Trạng thái</th>
                    {isOwnerOrAdmin && <th className="px-6 py-3.5 text-right">Hành động</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMembers.map((m) => (
                    <tr
                      key={m.memberId || m.userId}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-xs">
                            {m.avatarUrl ? (
                              <img
                                src={m.avatarUrl}
                                alt={m.fullName}
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
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                        {m.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                          <Shield className="w-3 h-3" aria-hidden="true" />
                          {m.roleName || m.roleId || "Giảng viên"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          {m.status || "ACTIVE"}
                        </span>
                      </td>
                      {isOwnerOrAdmin && (
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setRemovingMember({
                                userId: m.userId,
                                memberName: m.fullName || m.email,
                              })
                            }
                            className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Xóa thành viên"
                            aria-label={`Xóa thành viên ${m.fullName || m.email}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Invite Member Modal */}
        <Modal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          title="Gửi Lời mời Thành viên Mới"
        >
          <form onSubmit={handleSendInvite} className="space-y-5 py-2">
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
                    <button
                      type="button"
                      onClick={() => handleCopyLink(inviteFeedback.token!)}
                      className="px-3 py-1 rounded-lg bg-success text-success-foreground font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedToken ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedToken ? "Đã chép link!" : "Copy Link"}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="inviteEmail" className="text-xs font-bold text-foreground">
                Email người nhận
              </label>
              <input
                id="inviteEmail"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="vi-du: giangvien@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="inviteRole" className="text-xs font-bold text-foreground">
                Vai trò trong Org
              </label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="INSTRUCTOR">Giảng viên (INSTRUCTOR)</option>
                <option value="MEMBER">Thành viên / Học viên (MEMBER)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="inviteMsg" className="text-xs font-bold text-foreground">
                Lời nhắn (không bắt buộc)
              </label>
              <textarea
                id="inviteMsg"
                rows={2}
                value={inviteMsg}
                onChange={(e) => setInviteMsg(e.target.value)}
                placeholder="Chào mừng bạn đến với tổ chức của chúng tôi..."
                className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-muted text-foreground font-bold text-xs hover:bg-muted/80 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={createInviteMutation.isPending}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {createInviteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Gửi Lời Mời (PENDING)
              </button>
            </div>
          </form>
        </Modal>

        {/* Remove Member Confirm Dialog */}
        {removingMember && (
          <ConfirmAlertDialog
            isOpen={Boolean(removingMember)}
            onClose={() => setRemovingMember(null)}
            onConfirm={() =>
              removeMemberMutation.mutate({
                userId: removingMember.userId,
                organizationId: slug,
              })
            }
            title="Xóa thành viên khỏi Tổ chức"
            description={`Bạn có chắc chắn muốn xóa thành viên "${removingMember.memberName}" khỏi tổ chức không? Thao tác này không thể hoàn tác.`}
            confirmText="Xóa Thành Viên"
          />
        )}
      </main>
    </div>
  );
}

export default function OrgMembersPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm">Đang tải danh sách thành viên...</span>
        </div>
      }
    >
      <OrgMembersContent params={params} />
    </Suspense>
  );
}
