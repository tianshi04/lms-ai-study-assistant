"use client";

import { useState } from "react";
import {
  useCreateInvitationMutation,
  useSentInvitationsQuery,
  useCancelInvitationMutation,
} from "@/lib/query_hooks";
import { InvitationType } from "@/gen/identity/v1/identity_pb";
import {
  Mail,
  Send,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  UserX,
} from "lucide-react";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetName: string;
  type: InvitationType;
  defaultRole?: string;
  rolesList?: { id: string; label: string }[];
}

export function InviteMemberModal({
  isOpen,
  onClose,
  targetId,
  targetName,
  type,
  defaultRole = "MEMBER",
  rolesList = [
    { id: "MEMBER", label: "Thành viên (Member)" },
    { id: "ORG_ADMIN", label: "Quản trị viên Tổ chức (Org Admin)" },
  ],
}: InviteMemberModalProps) {
  const [activeTab, setActiveTab] = useState<"send" | "pending">("send");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(defaultRole);
  const [message, setMessage] = useState("");
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
    token?: string;
  } | null>(null);

  const { data: pendingInvitations, isLoading: isLoadingPending } = useSentInvitationsQuery(
    type,
    targetId,
    { enabled: isOpen },
  );

  const createMutation = useCreateInvitationMutation({
    onSuccess: (inv) => {
      setFeedback({
        type: "success",
        text: `Đã gửi lời mời thành công tới ${inv.inviteeEmail}!`,
        token: inv.token,
      });
      setEmail("");
      setMessage("");
    },
    onError: (err) => {
      setFeedback({
        type: "error",
        text: err.message || "Không thể gửi lời mời.",
      });
    },
  });

  const cancelMutation = useCancelInvitationMutation();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setFeedback(null);
    createMutation.mutate({
      type,
      inviteeEmail: email.trim(),
      targetId,
      targetName,
      roleId,
      message,
    });
  };

  const handleCopyLink = (rawToken: string, invId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/invitations/${rawToken}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedTokenId(invId);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-card text-foreground border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Mời tham gia {targetName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/10 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("send")}
            className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "send"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Gửi lời mời mới
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "pending"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Lời mời đang chờ
            {pendingInvitations && pendingInvitations.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                {pendingInvitations.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === "send" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="invitee-email" className="block text-sm font-medium mb-1">
                  Email người nhận <span className="text-destructive">*</span>
                </label>
                <input
                  id="invitee-email"
                  type="email"
                  required
                  placeholder="nhanvien@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>

              {rolesList.length > 1 && (
                <div>
                  <label htmlFor="invitee-role" className="block text-sm font-medium mb-1">
                    Vai trò gán cho người dùng
                  </label>
                  <select
                    id="invitee-role"
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                  >
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="invitee-message" className="block text-sm font-medium mb-1">
                  Lời nhắn gửi kèm (Tùy chọn)
                </label>
                <textarea
                  id="invitee-message"
                  rows={2}
                  placeholder="Ví dụ: Rất mong bạn tham gia đội ngũ giảng dạy khóa học này..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>

              {feedback && (
                <div
                  className={`p-3 rounded-md text-sm space-y-2 ${
                    feedback.type === "success"
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {feedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{feedback.text}</span>
                  </div>

                  {feedback.token && (
                    <div className="pt-2 border-t border-success/20 flex items-center justify-between gap-2">
                      <span className="text-xs truncate font-mono text-muted-foreground">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/invitations/${feedback.token}`
                          : feedback.token}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(feedback.token!, "new")}
                        className="px-2.5 py-1 rounded-md bg-success/20 hover:bg-success/30 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                      >
                        {copiedTokenId === "new" ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Đã chép
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Sao chép link
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium border border-input rounded-md hover:bg-muted transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !email.trim()}
                  className="px-4 py-2 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Gửi lời mời
                </button>
              </div>
            </form>
          )}

          {activeTab === "pending" && (
            <div className="space-y-3">
              {isLoadingPending && (
                <div className="flex justify-center py-8 text-muted-foreground gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Đang danh sách lời mời...</span>
                </div>
              )}

              {!isLoadingPending && (!pendingInvitations || pendingInvitations.length === 0) && (
                <div className="text-center py-8 text-muted-foreground space-y-1">
                  <UserX className="w-8 h-8 mx-auto opacity-50" />
                  <p className="text-sm">Chưa có lời mời nào đang chờ xử lý.</p>
                </div>
              )}

              {pendingInvitations?.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-semibold truncate">{inv.inviteeEmail}</p>
                    <p className="text-xs text-muted-foreground">
                      Vai trò: <span className="font-medium text-foreground">{inv.roleId}</span> •
                      Tạo ngày: {new Date(inv.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate({ invitationId: inv.id })}
                      className="px-2.5 py-1 text-xs rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
