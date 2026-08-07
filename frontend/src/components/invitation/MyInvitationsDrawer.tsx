"use client";

import { useState } from "react";
import { useMyInvitationsQuery, useRespondToInvitationMutation } from "@/lib/query_hooks";
import { InvitationAction, InvitationStatus, InvitationType } from "@/gen/identity/v1/identity_pb";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Building2,
  BookOpen,
  Award,
  Loader2,
  X,
  Inbox,
} from "lucide-react";

interface MyInvitationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MyInvitationsDrawer({ isOpen, onClose }: MyInvitationsDrawerProps) {
  const [feedback, setFeedback] = useState<{
    invId: string;
    type: "success" | "error";
    text: string;
  } | null>(null);

  const {
    data: invitations,
    isLoading,
    refetch,
  } = useMyInvitationsQuery(undefined, { enabled: isOpen });

  const respondMutation = useRespondToInvitationMutation({
    onSuccess: (res, vars) => {
      if (res.success) {
        setFeedback({
          invId: vars.invitationId,
          type: "success",
          text: res.message || "Xử lý thành công!",
        });
        refetch();
      } else {
        setFeedback({
          invId: vars.invitationId,
          type: "error",
          text: res.message || "Không thể phản hồi lời mời.",
        });
      }
    },
    onError: (err, vars) => {
      setFeedback({
        invId: vars.invitationId,
        type: "error",
        text: err.message || "Đã xảy ra lỗi.",
      });
    },
  });

  if (!isOpen) return null;

  const handleAction = (invitationId: string, action: InvitationAction) => {
    setFeedback(null);
    respondMutation.mutate({ invitationId, action });
  };

  const getTargetIcon = (type: InvitationType) => {
    if (type === InvitationType.ORGANIZATION_MEMBER)
      return <Building2 className="w-5 h-5 text-primary" />;
    if (type === InvitationType.COURSE_CO_INSTRUCTOR)
      return <BookOpen className="w-5 h-5 text-primary" />;
    return <Award className="w-5 h-5 text-primary" />;
  };

  const pendingList = invitations?.filter((i) => i.status === InvitationStatus.PENDING);
  const historyList = invitations?.filter((i) => i.status !== InvitationStatus.PENDING);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="bg-card text-foreground border-l border-border w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Lời mời của tôi</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isLoading && (
            <div className="flex justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Đang tải danh sách lời mời...</span>
            </div>
          )}

          {!isLoading && (!invitations || invitations.length === 0) && (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <Inbox className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-sm font-medium">Bạn chưa có lời mời nào.</p>
            </div>
          )}

          {/* Pending Invitations */}
          {pendingList && pendingList.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Đang chờ xử lý ({pendingList.length})
              </h3>
              {pendingList.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-card border border-border shadow-xs shrink-0">
                      {getTargetIcon(inv.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {inv.targetName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Từ:{" "}
                        <span className="font-medium text-foreground">
                          {inv.inviterName || inv.inviterEmail}
                        </span>
                      </p>
                    </div>
                  </div>

                  {inv.message && (
                    <p className="text-xs italic text-muted-foreground bg-card/60 p-2 rounded-md border border-border/50">
                      &ldquo;{inv.message}&rdquo;
                    </p>
                  )}

                  {feedback && feedback.invId === inv.id && (
                    <div
                      className={`p-2 rounded-md text-xs text-center ${
                        feedback.type === "success"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {feedback.text}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={respondMutation.isPending}
                      onClick={() => handleAction(inv.id, InvitationAction.DECLINE)}
                      className="py-1.5 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors"
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      disabled={respondMutation.isPending}
                      onClick={() => handleAction(inv.id, InvitationAction.ACCEPT)}
                      className="py-1.5 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      {respondMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Chấp nhận
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* History */}
          {historyList && historyList.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Lịch sử lời mời
              </h3>
              {historyList.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-xs gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{inv.targetName}</p>
                    <p className="text-muted-foreground">{inv.inviterEmail}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {inv.status === InvitationStatus.ACCEPTED ? (
                      <span className="px-2 py-0.5 rounded-full bg-success/10 text-success font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Đã nhận
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Từ chối/Hủy
                      </span>
                    )}
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
