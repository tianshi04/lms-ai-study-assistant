"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CertificateService, type FinancialAidApplication } from "@/gen/certificate/v1/certificate_pb";
import { Navbar } from "@/components/layout/Navbar";

const emptySubscribe = () => () => {};

export default function InstructorFinancialAidPage() {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [applications, setApplications] = useState<FinancialAidApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Authorization Check
  const userRole = isMounted && typeof window !== "undefined" ? localStorage.getItem("user_role") : null;
  const isInstructorOrAdmin = userRole === "2" || userRole === "4" || userRole === "5";

  useEffect(() => {
    let ignore = false;

    async function fetchApplications() {
      try {
        const client = getRpcClient(CertificateService);
        const res = await client.listFinancialAidApplications({
          status: activeTab === "ALL" ? "" : activeTab,
        });
        if (!ignore) {
          setApplications(res.applications);
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error("Failed to load financial aid applications:", err);
        if (!ignore) setLoading(false);
      }
    }

    fetchApplications();

    return () => {
      ignore = true;
    };
  }, [activeTab]);

  const handleReview = async (appId: string, isApproved: boolean) => {
    setProcessingId(appId);
    setToastMessage(null);

    try {
      const client = getRpcClient(CertificateService);
      const res = await client.reviewFinancialAidApplication({
        applicationId: appId,
        isApproved,
      });

      if (res.application) {
        // Update local state
        setApplications((prev) =>
          prev.map((item) => (item.id === appId ? res.application! : item))
        );
        setToastMessage({
          type: "success",
          text: isApproved ? "Đã phê duyệt đơn Hỗ trợ tài chính!" : "Đã từ chối đơn Hỗ trợ tài chính.",
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi duyệt đơn.";
      setToastMessage({ type: "error", text: errMsg });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredApps = applications.filter((app) => {
    if (activeTab === "ALL") return true;
    return app.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/instructor/courses" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Giảng viên
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Xét duyệt Hỗ trợ tài chính</span>
          </div>

          <Link
            href="/instructor/courses"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Quản lý Khóa học</span>
          </Link>
        </div>

        {/* Header Title Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md uppercase tracking-wider text-blue-100">
                Instructor Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Xét duyệt Đơn Hỗ trợ Tài chính (Financial Aid)
            </h1>
            <p className="text-sm text-blue-100/90 max-w-2xl">
              Quản lý và thẩm định các bài luận xin học bổng 150 từ của học viên. Duyệt hoặc từ chối để cấp quyền truy cập khóa học trả phí.
            </p>
          </div>
        </div>

        {/* Toast Alert Notification */}
        {toastMessage && (
          <div
            className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-md transition-all ${
              toastMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20"
                : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === "success" ? (
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Role Access Guard Alert */}
        {isMounted && !isInstructorOrAdmin && (
          <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300">
            <h2 className="font-bold text-base flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Quyền truy cập bị hạn chế
            </h2>
            <p className="text-sm mt-1">
              Bạn đang sử dụng tài khoản Học viên. Vui lòng đăng nhập với tài khoản Giảng viên (Instructor) hoặc Quản trị viên (Admin) để thực hiện quyền xét duyệt đơn.
            </p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((tab) => {
            const labels = {
              ALL: "Tất cả đơn",
              PENDING: "Chờ xét duyệt (Pending)",
              APPROVED: "Đã phê duyệt (Approved)",
              REJECTED: "Đã từ chối (Rejected)",
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Application Cards List */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-500">Đang tải danh sách đơn Hỗ trợ tài chính...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <svg className="w-12 h-12 mx-auto text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">Không có đơn nộp nào trong danh mục này</p>
            <p className="text-xs text-slate-500 mt-1">Các đơn Hỗ trợ tài chính mới từ học viên sẽ xuất hiện ở đây.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        ID: {app.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        Khóa học: <span className="font-bold text-slate-800 dark:text-slate-200">{app.courseId}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Học viên (User ID): <span className="font-mono text-slate-700 dark:text-slate-300">{app.userId}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    {app.status === "PENDING" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Chờ duyệt ({app.reviewDeadlineDaysLeft} ngày còn lại)
                      </span>
                    )}
                    {app.status === "APPROVED" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Đã Phê Duyệt
                      </span>
                    )}
                    {app.status === "REJECTED" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Đã Từ Chối
                      </span>
                    )}
                  </div>
                </div>

                {/* Essay Content Section */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Bài luận xin học bổng 150 từ (Financial Aid Essay)
                  </h3>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                    {app.essay150Words}
                  </div>
                </div>

                {/* Action Buttons for Pending Applications */}
                {app.status === "PENDING" && isInstructorOrAdmin && (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleReview(app.id, false)}
                      disabled={processingId === app.id}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>{processingId === app.id ? "Đang xử lý..." : "Từ chối đơn"}</span>
                    </button>
                    <button
                      onClick={() => handleReview(app.id, true)}
                      disabled={processingId === app.id}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{processingId === app.id ? "Đang xử lý..." : "Phê duyệt đơn"}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
