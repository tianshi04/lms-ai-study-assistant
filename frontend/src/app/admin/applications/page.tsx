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
import { FileText, ExternalLink, PlayCircle, Check } from "lucide-react";

export default function AdminInstructorApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>("");

  const {
    data: applications = [],
    isLoading,
    refetch,
  } = useListInstructorApplicationsQuery(statusFilter);

  const reviewMutation = useReviewInstructorApplicationMutation({
    onSuccess: (updatedApp, variables) => {
      setRejectingAppId(null);
      setRejectionReason("");
      setActionSuccessMsg(
        variables.approve
          ? "Đã phê duyệt đơn và nâng tài khoản thành Giảng viên thành công!"
          : "Đã từ chối đơn đăng ký thành công.",
      );
      refetch();
    },
  });

  const handleApprove = (appId: string) => {
    if (
      confirm("Bạn có chắc chắn muốn phê duyệt đơn này và nâng quyền tài khoản thành Giảng viên?")
    ) {
      reviewMutation.mutate({ applicationId: appId, approve: true });
    }
  };

  const handleConfirmReject = (appId: string) => {
    if (!rejectionReason.trim()) {
      alert("Vui lòng nhập lý do từ chối.");
      return;
    }
    reviewMutation.mutate({
      applicationId: appId,
      approve: false,
      rejectionReason: rejectionReason.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/admin/dashboard" className="hover:underline">
                Admin Portal
              </Link>
              <span>/</span>
              <span className="font-semibold text-foreground">Đơn Giảng viên</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight text-balance">
              Quản Lý Thẩm Định Đơn Giảng Viên
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Về Dashboard
            </Link>
          </div>
        </div>

        {actionSuccessMsg && (
          <div
            aria-live="polite"
            className="p-4 rounded-2xl bg-success/10 border border-success/30 text-success text-sm font-bold flex items-center justify-between"
          >
            <span>{actionSuccessMsg}</span>
            <button
              type="button"
              onClick={() => setActionSuccessMsg("")}
              aria-label="Đóng thông báo"
              className="text-success hover:opacity-75"
            >
              ✕
            </button>
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
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.value
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card text-foreground hover:bg-muted border border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content List */}
        {isLoading ? (
          <div className="bg-card rounded-3xl p-12 text-center border border-border shadow-sm">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-3" />
            <p aria-live="polite" className="text-muted-foreground text-sm font-medium">
              Đang tải danh sách đơn thẩm định…
            </p>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-card rounded-3xl p-12 text-center border border-border shadow-sm space-y-3">
            <div className="w-12 h-12 bg-muted text-muted-foreground rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Không có đơn đăng ký nào</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Hiện tại chưa có đơn xin cấp quyền Giảng viên cá nhân nào phù hợp với bộ lọc đã chọn.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((app: InstructorApplication) => {
              const isPending = app.status === InstructorApplicationStatus.PENDING_REVIEW;
              const isApproved = app.status === InstructorApplicationStatus.APPROVED;
              const isRejected = app.status === InstructorApplicationStatus.REJECTED;

              return (
                <div
                  key={app.id}
                  className="bg-card rounded-3xl p-6 sm:p-8 shadow-lg border border-border space-y-6"
                >
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
                    <div className="flex flex-wrap gap-4 pt-2">
                      {app.linkedinUrl && (
                        <a
                          href={app.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-info/10 text-info border border-info/20 text-xs font-semibold hover:bg-info/20 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" aria-hidden="true" />
                          <span>Xem LinkedIn/Portfolio</span>
                        </a>
                      )}
                      {app.cvUrl && (
                        <a
                          href={app.cvUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted text-foreground border border-border text-xs font-semibold hover:bg-muted/80 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-destructive" aria-hidden="true" />
                          <span>Xem Hồ sơ CV (.pdf)</span>
                        </a>
                      )}
                      {app.demoVideoUrl && (
                        <a
                          href={app.demoVideoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold hover:bg-destructive/20 transition-colors"
                        >
                          <PlayCircle className="w-4 h-4 text-destructive" aria-hidden="true" />
                          <span>Xem Video Giảng Thử Demo</span>
                        </a>
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
                          <label className="block text-xs font-bold text-destructive">
                            Nhập lý do từ chối đơn:
                          </label>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={2}
                            placeholder="Mô tả lý do từ chối hồ sơ…"
                            className="w-full p-3 text-xs rounded-xl border border-input bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setRejectingAppId(null)}
                              className="px-3.5 py-1.5 rounded-xl bg-muted text-xs font-bold text-muted-foreground"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmReject(app.id)}
                              disabled={reviewMutation.isPending}
                              className="px-4 py-1.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold shadow-md"
                            >
                              Xác nhận Từ chối
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setRejectingAppId(app.id)}
                            disabled={reviewMutation.isPending}
                            className="px-5 py-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs font-bold hover:bg-destructive/20 transition-colors"
                          >
                            Từ Chối Hồ Sơ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(app.id)}
                            disabled={reviewMutation.isPending}
                            className="px-6 py-2.5 rounded-xl bg-success text-success-foreground hover:opacity-90 text-xs font-bold shadow-lg transition-all flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" aria-hidden="true" />
                            <span>Phê Duyệt & Nâng Role Giảng Viên</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
