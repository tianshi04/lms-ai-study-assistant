"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useGetInvitationByTokenQuery, useRespondToInvitationMutation } from "@/lib/query_hooks";
import { InvitationAction, InvitationStatus, InvitationType } from "@/gen/identity/v1/identity_pb";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  BookOpen,
  Award,
  Loader2,
  ArrowRight,
} from "lucide-react";

function AcceptInvitationContent() {
  const params = useParams();
  const token = (params?.token as string) || "";
  const router = useRouter();
  const { userEmail, isAuthenticated } = useAuth();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { data: invitation, isLoading, isError, error } = useGetInvitationByTokenQuery(token);

  const respondMutation = useRespondToInvitationMutation({
    onSuccess: (data) => {
      if (data.success) {
        setFeedback({
          type: "success",
          message: data.message || "Xử lý lời mời thành công!",
        });
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        setFeedback({
          type: "error",
          message: data.message || "Không thể xử lý lời mời.",
        });
      }
    },
    onError: (err) => {
      setFeedback({
        type: "error",
        message: err.message || "Đã xảy ra lỗi khi phản hồi lời mời.",
      });
    },
  });

  const handleAction = (action: InvitationAction) => {
    if (!invitation) return;
    setFeedback(null);
    respondMutation.mutate({
      invitationId: invitation.id,
      action,
      token,
    });
  };

  const getTargetIcon = (type: InvitationType) => {
    if (type === InvitationType.ORGANIZATION_MEMBER)
      return <Building2 className="w-8 h-8 text-primary" />;
    if (type === InvitationType.COURSE_CO_INSTRUCTOR)
      return <BookOpen className="w-8 h-8 text-primary" />;
    return <Award className="w-8 h-8 text-primary" />;
  };

  const getVietnameseStatus = (status: InvitationStatus) => {
    switch (status) {
      case InvitationStatus.PENDING:
        return "Đang chờ";
      case InvitationStatus.ACCEPTED:
        return "Đã chấp nhận";
      case InvitationStatus.DECLINED:
        return "Đã từ chối";
      case InvitationStatus.CANCELLED:
        return "Đã hủy";
      case InvitationStatus.EXPIRED:
        return "Đã hết hạn";
      default:
        return "Không xác định";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-lg p-6 text-foreground space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 rounded-full bg-primary/10 mb-2">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Lời mời tham gia</h1>
          <p className="text-sm text-muted-foreground">Hệ thống đào tạo trực tuyến LMS</p>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Đang tải thông tin lời mời...</p>
          </div>
        )}

        {isError && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center space-y-2">
            <XCircle className="w-6 h-6 mx-auto" />
            <p>{error?.message || "Lời mời không hợp lệ hoặc đã hết hạn."}</p>
            <Link href="/" className="inline-block text-xs font-semibold underline mt-2">
              Trở về Trang chủ
            </Link>
          </div>
        )}

        {invitation && !isLoading && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="p-2 rounded-md bg-background shadow-xs">
                {getTargetIcon(invitation.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold truncate">
                  {invitation.targetName || "Mục tiêu lời mời"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Gửi bởi:{" "}
                  <span className="font-medium text-foreground">
                    {invitation.inviterName || invitation.inviterEmail}
                  </span>
                </p>
              </div>
            </div>

            {invitation.message && (
              <div className="p-3 rounded-md bg-background border border-border text-sm italic text-muted-foreground">
                &ldquo;{invitation.message}&rdquo;
              </div>
            )}

            <div className="space-y-1 text-xs text-muted-foreground border-t border-border pt-4">
              <div className="flex justify-between">
                <span>Dành cho Email:</span>
                <span className="font-medium text-foreground">{invitation.inviteeEmail}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Trạng thái:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <Clock className="w-3.5 h-3.5" /> {getVietnameseStatus(invitation.status)}
                </span>
              </div>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-md text-sm text-center flex items-center justify-center gap-2 ${
                  feedback.type === "success"
                    ? "bg-success/10 text-success border border-success/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {!isAuthenticated ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-center text-muted-foreground">
                  Bạn cần đăng nhập hoặc tạo tài khoản với email{" "}
                  <strong className="text-foreground">{invitation.inviteeEmail}</strong> để nhận lời
                  mời này.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href={`/login?redirect=/invitations/${token}`}
                    className="flex items-center justify-center py-2.5 px-4 rounded-md border border-input bg-background hover:bg-muted text-sm font-semibold transition-colors"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href={`/register?email=${encodeURIComponent(invitation.inviteeEmail)}&invite_token=${token}`}
                    className="flex items-center justify-center py-2.5 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors gap-1"
                  >
                    Đăng ký <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : userEmail?.toLowerCase() !== invitation.inviteeEmail.toLowerCase() ? (
              <div className="p-3 rounded-md bg-warning/10 border border-warning/20 text-warning text-xs text-center space-y-2">
                <p>
                  Bạn đang đăng nhập bằng tài khoản <strong>{userEmail}</strong>. Lời mời này gửi
                  tới <strong>{invitation.inviteeEmail}</strong>.
                </p>
                <p className="text-muted-foreground">
                  Vui lòng chuyển sang đúng tài khoản để chấp nhận lời mời.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={respondMutation.isPending}
                  onClick={() => handleAction(InvitationAction.DECLINE)}
                  className="w-full py-2.5 px-4 rounded-md border border-input bg-background hover:bg-muted text-sm font-semibold text-foreground transition-colors disabled:opacity-50"
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  disabled={respondMutation.isPending}
                  onClick={() => handleAction(InvitationAction.ACCEPT)}
                  className="w-full py-2.5 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {respondMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Chấp nhận
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
          <p className="text-sm">Đang tải thông tin lời mời...</p>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
