"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  useListInstructorApplicationsQuery,
  useReviewInstructorApplicationMutation,
} from "@/lib/query_hooks";
import {
  InstructorApplicationStatus,
  type InstructorApplication,
} from "@/gen/identity/v1/identity_pb";
import { FileText, ExternalLink, PlayCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";
import { Progress } from "@/components/ui/Progress";
import { PageHeader } from "@/components/ui/LayoutPrimitives";

export default function AdminInstructorApplicationsPage() {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [approvingAppId, setApprovingAppId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>("");

  const {
    data: applications = [],
    isLoading,
    refetch,
  } = useListInstructorApplicationsQuery(statusFilter);

  const reviewMutation = useReviewInstructorApplicationMutation();

  const handleApprove = (appId: string) => {
    setApprovingAppId(appId);
  };

  const executeApprove = async () => {
    if (!approvingAppId) return;

    try {
      await reviewMutation.mutateAsync({
        applicationId: approvingAppId,
        approve: true,
      });
      setActionSuccessMsg("Đã phê duyệt đơn đăng ký giảng viên thành công!");
      toast.success("Phê duyệt đơn đăng ký thành công!");
      setApprovingAppId(null);
      refetch();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Phê duyệt thất bại.");
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingAppId || !rejectionReason.trim()) return;

    try {
      await reviewMutation.mutateAsync({
        applicationId: rejectingAppId,
        approve: false,
        rejectionReason: rejectionReason.trim(),
      });
      setActionSuccessMsg("Đã từ chối đơn đăng ký.");
      toast.info("Đã từ chối đơn đăng ký.");
      setRejectingAppId(null);
      setRejectionReason("");
      refetch();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Từ chối thất bại.");
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Breadcrumb & Title */}
        <PageHeader>
          <div>
            <PageHeader.Breadcrumbs>
              <Link href="/admin/dashboard" className="hover:underline">
                Admin Portal
              </Link>
              <span>/</span>
              <span className="font-semibold text-foreground">Đơn Giảng viên</span>
            </PageHeader.Breadcrumbs>
            <PageHeader.Title>Quản Lý Thẩm Định Đơn Giảng Viên</PageHeader.Title>
          </div>

          <PageHeader.Actions>
            <Button variant="outlined" render={<Link href="/admin/dashboard" />}>
              Về Dashboard
            </Button>
          </PageHeader.Actions>
        </PageHeader>

        {actionSuccessMsg && (
          <div
            aria-live="polite"
            className="p-4 rounded-2xl bg-success/10 border border-success/30 text-success text-sm font-bold flex items-center justify-between"
          >
            <span>{actionSuccessMsg}</span>
            <IconButton
              variant="standard"
              size="xs"
              type="button"
              onClick={() => setActionSuccessMsg("")}
              aria-label="Đóng thông báo"
              className="text-success hover:text-success"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </IconButton>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
          {[
            { label: "Tất cả đơn", value: "" },
            { label: "Chờ thẩm định", value: "PENDING_REVIEW" },
            { label: "Đã phê duyệt", value: "APPROVED" },
            { label: "Đã từ chối", value: "REJECTED" },
          ].map((tab) => (
            <Chip
              key={tab.value}
              variant="filter"
              selected={statusFilter === tab.value}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </Chip>
          ))}
        </div>

        {/* Content List */}
        {isLoading ? (
          <Card
            variant="outlined"
            className="p-12 text-center flex flex-col items-center justify-center"
          >
            <Progress.Circular size="md" className="mb-3" />
            <p aria-live="polite" className="text-muted-foreground text-sm font-medium">
              Đang tải danh sách đơn thẩm định…
            </p>
          </Card>
        ) : applications.length === 0 ? (
          <Card variant="outlined" className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-muted text-muted-foreground rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Không có đơn đăng ký nào</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Hiện tại chưa có đơn xin cấp quyền Giảng viên cá nhân nào phù hợp với bộ lọc đã chọn.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {applications.map((app: InstructorApplication) => {
              const isPending = app.status === InstructorApplicationStatus.PENDING_REVIEW;
              const isApproved = app.status === InstructorApplicationStatus.APPROVED;
              const isRejected = app.status === InstructorApplicationStatus.REJECTED;

              return (
                <Card key={app.id} variant="outlined" className="p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-foreground">{app.title}</h2>
                        <span className="text-xs text-muted-foreground font-mono">
                          ({app.userId})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ngày nộp:{" "}
                        {app.createdAt
                          ? new Date(app.createdAt).toLocaleString("vi-VN")
                          : "Gần đây"}
                      </p>
                    </div>

                    <div>
                      {isPending && (
                        <span className="px-3.5 py-1.5 rounded-full bg-warning/10 text-warning text-xs font-bold border border-warning/30">
                          Chờ Thẩm Định
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-3.5 py-1.5 rounded-full bg-success/10 text-success text-xs font-bold border border-success/30">
                          Đã Phê Duyệt
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-3.5 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-bold border border-destructive/30">
                          Đã Từ Chối
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bio & Details */}
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        Tiểu sử năng lực & Kinh nghiệm:
                      </span>
                      <p className="bg-muted p-4 rounded-2xl border border-border text-foreground leading-relaxed whitespace-pre-line">
                        {app.bio}
                      </p>
                    </div>

                    {/* External Links */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      {app.linkedinUrl && (
                        <Chip
                          variant="assist"
                          leadingIcon={<ExternalLink className="w-4 h-4" aria-hidden="true" />}
                          render={
                            <a
                              href={app.linkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Xem LinkedIn/Portfolio"
                            >
                              Xem LinkedIn/Portfolio
                            </a>
                          }
                        >
                          Xem LinkedIn/Portfolio
                        </Chip>
                      )}
                      {app.cvUrl && (
                        <Chip
                          variant="assist"
                          leadingIcon={<FileText className="w-4 h-4" aria-hidden="true" />}
                          render={
                            <a
                              href={app.cvUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Xem Hồ sơ CV (.pdf)"
                            >
                              Xem Hồ sơ CV (.pdf)
                            </a>
                          }
                        >
                          Xem Hồ sơ CV (.pdf)
                        </Chip>
                      )}
                      {app.demoVideoUrl && (
                        <Chip
                          variant="assist"
                          leadingIcon={<PlayCircle className="w-4 h-4" aria-hidden="true" />}
                          render={
                            <a
                              href={app.demoVideoUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Xem Video Giảng Thử Demo"
                            >
                              Xem Video Giảng Thử Demo
                            </a>
                          }
                        >
                          Xem Video Giảng Thử Demo
                        </Chip>
                      )}
                    </div>

                    {app.rejectionReason && (
                      <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                        <span className="font-bold block mb-0.5">Lý do từ chối:</span>
                        <span>{app.rejectionReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions for Pending */}
                  {isPending && (
                    <div className="border-t border-border pt-4 flex flex-wrap items-center justify-end gap-3">
                      {rejectingAppId === app.id ? (
                        <div className="w-full space-y-3 bg-destructive/10 p-4 rounded-2xl border border-destructive/30">
                          <Textarea
                            label="Nhập lý do từ chối đơn:"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={2}
                            placeholder="Mô tả lý do từ chối hồ sơ…"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outlined"
                              size="sm"
                              onClick={() => setRejectingAppId(null)}
                            >
                              Hủy
                            </Button>
                            <Button
                              type="button"
                              variant="outlined"
                              className="bg-error/10 text-destructive border-destructive/30 hover:bg-destructive/20"
                              size="sm"
                              onClick={handleConfirmReject}
                              disabled={reviewMutation.isPending}
                            >
                              Xác nhận Từ chối
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="outlined"
                            className="bg-error/10 text-destructive border-destructive/30 hover:bg-destructive/20"
                            size="sm"
                            onClick={() => setRejectingAppId(app.id)}
                            disabled={reviewMutation.isPending}
                          >
                            Từ Chối Hồ Sơ
                          </Button>
                          <Button
                            type="button"
                            variant="filled"
                            size="sm"
                            onClick={() => handleApprove(app.id)}
                            disabled={reviewMutation.isPending}
                          >
                            <Check className="w-4 h-4 mr-1.5" aria-hidden="true" />
                            <span>Phê Duyệt & Nâng Role Giảng Viên</span>
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(approvingAppId)}
        onOpenChange={(open) => {
          if (!open) setApprovingAppId(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Icon icon={<Check className="w-6 h-6 text-primary" aria-hidden="true" />} />
            <Dialog.Title>Xác nhận phê duyệt đơn Giảng viên</Dialog.Title>
            <Dialog.Description>
              Bạn có chắc chắn muốn phê duyệt đơn này và nâng quyền tài khoản tương ứng thành Giảng
              viên?
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button variant="text" onClick={() => setApprovingAppId(null)}>
              Hủy
            </Button>
            <Button variant="filled" onClick={executeApprove} disabled={reviewMutation.isPending}>
              Phê Duyệt
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}
