"use client";

import { useState } from "react";
import { useMyInvitationsQuery, useRespondToInvitationMutation } from "@/lib/query_hooks";
import { InvitationAction, InvitationStatus, InvitationType } from "@/gen/identity/v1/identity_pb";
import { Button } from "@/components/ui/Button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/Drawer";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Building2,
  BookOpen,
  Award,
  Loader2,
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

  const handleAction = (invitationId: string, action: InvitationAction) => {
    setFeedback(null);
    respondMutation.mutate({ invitationId, action });
  };

  const getTargetIcon = (type: InvitationType) => {
    if (type === InvitationType.ORGANIZATION_MEMBER)
      return <Building2 className="w-5 h-5 text-primary" aria-hidden="true" />;
    if (type === InvitationType.COURSE_CO_INSTRUCTOR)
      return <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />;
    return <Award className="w-5 h-5 text-primary" aria-hidden="true" />;
  };

  const pendingList = invitations?.filter((i) => i.status === InvitationStatus.PENDING);
  const historyList = invitations?.filter((i) => i.status !== InvitationStatus.PENDING);

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent side="right" className="flex flex-col h-full">
        {/* Header */}
        <DrawerHeader className="flex items-center space-x-2">
          <Mail className="w-5 h-5 text-primary" aria-hidden="true" />
          <DrawerTitle className="text-lg font-semibold">Lời mời của tôi</DrawerTitle>
        </DrawerHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isLoading && (
            <div className="flex justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span className="text-sm">Đang tải danh sách lời mời...</span>
            </div>
          )}

          {!isLoading && (!invitations || invitations.length === 0) && (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <Inbox className="w-10 h-10 mx-auto opacity-40" aria-hidden="true" />
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
                    <Button
                      type="button"
                      variant="outlined"
                      size="sm"
                      disabled={respondMutation.isPending}
                      onClick={() => handleAction(inv.id, InvitationAction.DECLINE)}
                      className="w-full"
                    >
                      Từ chối
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={respondMutation.isPending}
                      onClick={() => handleAction(inv.id, InvitationAction.ACCEPT)}
                      className="w-full"
                    >
                      Chấp nhận
                    </Button>
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
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Đã nhận
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold flex items-center gap-1">
                        <XCircle className="w-3 h-3" aria-hidden="true" /> Từ chối/Hủy
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <DrawerFooter>
          <Button type="button" variant="outlined" onClick={onClose}>
            Đóng
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
