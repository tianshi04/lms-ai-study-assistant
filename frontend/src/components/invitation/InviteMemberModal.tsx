"use client";

import { useState } from "react";
import {
  useCreateInvitationMutation,
  useSentInvitationsQuery,
  useCancelInvitationMutation,
} from "@/lib/query_hooks";
import { InvitationType } from "@/gen/identity/v1/identity_pb";
import { Dialog } from "@/components/ui/Dialog";

import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Send, Loader2, CheckCircle2, AlertCircle, Copy, Check, UserX } from "lucide-react";

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
    { id: "INSTRUCTOR", label: "Giảng viên (Instructor)" },
    { id: "MEMBER", label: "Thành viên / Học viên (Member)" },
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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Content size="lg">
        <Dialog.Header>
          <Dialog.Title>{`Mời tham gia ${targetName}`}</Dialog.Title>
        </Dialog.Header>

        <div className="flex flex-col max-h-[70vh] overflow-hidden my-2">
          {/* Tabs */}
          <div className="flex border-b border-border bg-muted/10 px-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTab("send")}
              className={`pb-2 px-4 text-sm font-medium border-b-2 rounded-b-none transition-colors ${
                activeTab === "send"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Gửi lời mời mới
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTab("pending")}
              className={`pb-2 px-4 text-sm font-medium border-b-2 rounded-b-none transition-colors ${
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
            </Button>
          </div>

          {/* Content Body */}
          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {activeTab === "send" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field>
                  <Field.Label htmlFor="invitee-email">
                    Email người nhận <span className="text-destructive">*</span>
                  </Field.Label>
                  <Input
                    id="invitee-email"
                    type="email"
                    required
                    placeholder="nhanvien@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>

                {rolesList.length > 1 && (
                  <Field>
                    <Field.Label htmlFor="invitee-role">Vai trò gán cho người dùng</Field.Label>
                    <Select value={roleId} onValueChange={(val) => val && setRoleId(val)}>
                      <Select.Trigger id="invitee-role" className="w-full">
                        <Select.Value placeholder="Chọn vai trò" />
                      </Select.Trigger>
                      <Select.Content>
                        {rolesList.map((r) => (
                          <Select.Item key={r.id} value={r.id}>
                            {r.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Field>
                )}

                <Field>
                  <Field.Label htmlFor="invitee-message">Lời nhắn gửi kèm (Tùy chọn)</Field.Label>
                  <Textarea
                    id="invitee-message"
                    rows={2}
                    placeholder="Ví dụ: Rất mong bạn tham gia đội ngũ giảng dạy khóa học này..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </Field>

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
                        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
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
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleCopyLink(feedback.token!, "new")}
                          className="bg-success/20 hover:bg-success/30 text-success text-xs shrink-0"
                        >
                          {copiedTokenId === "new" ? (
                            <>
                              <Check className="w-3.5 h-3.5" aria-hidden="true" /> Đã chép
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Sao chép link
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Đóng
                  </Button>
                  <Button
                    type="submit"
                    disabled={!email.trim()}
                    isLoading={createMutation.isPending}
                  >
                    <Send className="w-4 h-4" aria-hidden="true" />
                    Gửi lời mời
                  </Button>
                </div>
              </form>
            )}

            {activeTab === "pending" && (
              <div className="space-y-3">
                {isLoadingPending && (
                  <div className="flex justify-center py-8 text-muted-foreground gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span className="text-sm">Đang danh sách lời mời...</span>
                  </div>
                )}

                {!isLoadingPending && (!pendingInvitations || pendingInvitations.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground space-y-1">
                    <UserX className="w-8 h-8 mx-auto opacity-50" aria-hidden="true" />
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate({ invitationId: inv.id })}
                        className="text-xs text-destructive hover:bg-destructive/10 border border-destructive/30"
                      >
                        Hủy
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Dialog.Content>
    </Dialog>
  );
}
