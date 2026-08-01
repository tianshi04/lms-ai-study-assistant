"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { ConnectError, Code } from "@connectrpc/connect";
import {
  CertificateService,
  type FinancialAidApplication,
} from "@/gen/certificate/v1/certificate_pb";
import { useAuth } from "@/components/providers/AuthProvider";

const emptySubscribe = () => () => {};

export default function InstructorFinancialAidPage() {
  const { isStaff: isInstructorOrAdmin } = useAuth();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const [applications, setApplications] = useState<FinancialAidApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">(
    "PENDING",
  );
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let ignore = false;

    if (!isMounted) return;

    async function fetchApplications() {
      if (!isInstructorOrAdmin) {
        if (!ignore) setLoading(false);
        return;
      }

      try {
        const client = getRpcClient(CertificateService);
        const res = await client.listFinancialAidApplications({
          status: activeTab === "ALL" ? "" : activeTab,
        });
        if (!ignore) {
          setApplications(res.applications);
        }
      } catch (err: unknown) {
        if (!ignore) {
          if (err instanceof ConnectError && err.code === Code.PermissionDenied) {
            setToastMessage({
              type: "error",
              text:
                err.rawMessage ||
                "Chỉ Giảng viên hoặc Quản trị viên mới có quyền xem danh sách đơn Hỗ trợ tài chính.",
            });
          } else {
            console.error("Failed to load financial aid applications:", err);
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchApplications();

    return () => {
      ignore = true;
    };
  }, [activeTab, isMounted, isInstructorOrAdmin]);

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
          prev.map((item) => (item.id === appId ? res.application! : item)),
        );
        setToastMessage({
          type: "success",
          text: isApproved
            ? "Đã phê duyệt đơn Hỗ trợ tài chính!"
            : "Đã từ chối đơn Hỗ trợ tài chính.",
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
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/instructor/courses" className="hover:text-primary transition-colors">
              Giảng viên
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground">Xét duyệt Hỗ trợ tài chính</span>
          </div>

          <Link
            href="/instructor/courses"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 border border-border"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Quản lý Khóa học</span>
          </Link>
        </div>

        {/* Header Title Banner */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 text-foreground shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                Instructor Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-balance text-foreground">
              Xét duyệt Đơn Hỗ trợ Tài chính (Financial Aid)
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Quản lý và thẩm định các bài luận xin học bổng 150 từ của học viên. Duyệt hoặc từ chối
              để cấp quyền truy cập khóa học trả phí.
            </p>
          </div>
        </div>

        {/* Toast Alert Notification */}
        {toastMessage && (
          <div
            className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-md transition-all ${
              toastMessage.type === "success"
                ? "bg-success/10 text-success border border-success/30"
                : "bg-destructive/10 text-destructive border border-destructive/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === "success" ? (
                <svg
                  className="w-5 h-5 text-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-destructive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Role Access Guard Alert */}
        {isMounted && !isInstructorOrAdmin && (
          <div className="p-6 rounded-2xl bg-warning/10 border border-warning/30 text-warning">
            <h2 className="font-bold text-base flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Quyền truy cập bị hạn chế
            </h2>
            <p className="text-sm mt-1">
              Bạn đang sử dụng tài khoản Học viên. Vui lòng đăng nhập với tài khoản Giảng viên
              (Instructor) hoặc Quản trị viên (Admin) để thực hiện quyền xét duyệt đơn.
            </p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
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
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-card text-muted-foreground hover:text-foreground border border-border"
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
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p aria-live="polite" className="text-sm font-medium text-muted-foreground">
              Đang tải danh sách đơn Hỗ trợ tài chính…
            </p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-16 text-center bg-card rounded-2xl border border-border p-8">
            <svg
              className="w-12 h-12 mx-auto text-muted-foreground mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-base font-bold text-foreground">
              Không có đơn nộp nào trong danh mục này
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Các đơn Hỗ trợ tài chính mới từ học viên sẽ xuất hiện ở đây.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-all space-y-4 text-foreground"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                        ID: {app.id}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        Khóa học: <span className="font-bold text-foreground">{app.courseId}</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Học viên (User ID):{" "}
                      <span className="font-mono text-foreground">{app.userId}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    {app.status === "PENDING" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-warning/10 text-warning border border-warning/30 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                        Chờ duyệt ({app.reviewDeadlineDaysLeft} ngày còn lại)
                      </span>
                    )}
                    {app.status === "APPROVED" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/30 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-success" />
                        Đã Phê Duyệt
                      </span>
                    )}
                    {app.status === "REJECTED" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/30 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-destructive" />
                        Đã Từ Chối
                      </span>
                    )}
                  </div>
                </div>

                {/* Essay Content Section */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Bài luận xin học bổng 150 từ (Financial Aid Essay)
                  </h3>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border text-sm text-foreground leading-relaxed font-sans whitespace-pre-wrap">
                    {app.essay150Words}
                  </div>
                </div>

                {/* Action Buttons for Pending Applications */}
                {app.status === "PENDING" && isInstructorOrAdmin && (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleReview(app.id, false)}
                      disabled={processingId === app.id}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-destructive bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span>{processingId === app.id ? "Đang xử lý…" : "Từ chối đơn"}</span>
                    </button>
                    <button
                      onClick={() => handleReview(app.id, true)}
                      disabled={processingId === app.id}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{processingId === app.id ? "Đang xử lý…" : "Phê duyệt đơn"}</span>
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
