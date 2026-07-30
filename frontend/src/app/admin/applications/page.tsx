"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  useListInstructorApplicationsQuery,
  useReviewInstructorApplicationMutation,
} from "@/lib/query_hooks";
import { InstructorApplicationStatus, type InstructorApplication } from "@/gen/identity/v1/identity_pb";

export default function AdminInstructorApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>("");

  const { data: applications = [], isLoading, refetch } = useListInstructorApplicationsQuery(statusFilter);

  const reviewMutation = useReviewInstructorApplicationMutation({
    onSuccess: (updatedApp, variables) => {
      setRejectingAppId(null);
      setRejectionReason("");
      setActionSuccessMsg(
        variables.approve
          ? "Đã phê duyệt đơn và nâng tài khoản thành Giảng viên thành công!"
          : "Đã từ chối đơn đăng ký thành công."
      );
      refetch();
    },
  });

  const handleApprove = (appId: string) => {
    if (confirm("Bạn có chắc chắn muốn phê duyệt đơn này và nâng quyền tài khoản thành Giảng viên?")) {
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Link href="/admin/dashboard" className="hover:underline">Admin Portal</Link>
              <span>/</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Đơn Giảng viên</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Quản Lý Thẩm Định Đơn Giảng Viên
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
            >
              Về Dashboard
            </Link>
          </div>
        </div>

        {actionSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-bold flex items-center justify-between">
            <span>{actionSuccessMsg}</span>
            <button onClick={() => setActionSuccessMsg("")} className="text-emerald-600 dark:text-emerald-400 hover:opacity-75">
              ✕
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
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
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content List */}
        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Đang tải danh sách đơn thẩm định...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Không có đơn đăng ký nào</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
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
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-200 dark:border-slate-800 space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{app.title}</h2>
                        <span className="text-xs text-slate-400 font-mono">({app.userId})</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Ngày nộp: {app.createdAt ? new Date(app.createdAt).toLocaleString("vi-VN") : "Gần đây"}
                      </p>
                    </div>

                    <div>
                      {isPending && (
                        <span className="px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-500/30">
                          Chờ Thẩm Định
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-500/30">
                          Đã Phê Duyệt
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-3.5 py-1.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-500/30">
                          Đã Từ Chối
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bio & Details */}
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        Tiểu sử năng lực & Kinh nghiệm:
                      </span>
                      <p className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
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
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-xs font-semibold hover:bg-blue-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                          </svg>
                          <span>Xem LinkedIn/Portfolio</span>
                        </a>
                      )}
                      {app.cvUrl && (
                        <a
                          href={app.cvUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
                        >
                          <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span>Xem Hồ sơ CV (.pdf)</span>
                        </a>
                      )}
                      {app.demoVideoUrl && (
                        <a
                          href={app.demoVideoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 text-xs font-semibold hover:bg-red-100 transition-colors"
                        >
                          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Xem Video Giảng Thử Demo</span>
                        </a>
                      )}
                    </div>

                    {app.rejectionReason && (
                      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
                        <span className="font-bold block mb-0.5">Lý do từ chối:</span>
                        <span>{app.rejectionReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions for Pending */}
                  {isPending && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-wrap items-center justify-end gap-3">
                      {rejectingAppId === app.id ? (
                        <div className="w-full space-y-3 bg-rose-50/50 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-200 dark:border-rose-800">
                          <label className="block text-xs font-bold text-rose-900 dark:text-rose-200">
                            Nhập lý do từ chối đơn:
                          </label>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={2}
                            placeholder="Mô tả lý do từ chối hồ sơ..."
                            className="w-full p-3 text-xs rounded-xl border border-rose-200 dark:border-rose-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setRejectingAppId(null)}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmReject(app.id)}
                              disabled={reviewMutation.isPending}
                              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20"
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
                            className="px-5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-bold hover:bg-rose-100 transition-colors"
                          >
                            Từ Chối Hồ Sơ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(app.id)}
                            disabled={reviewMutation.isPending}
                            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
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
