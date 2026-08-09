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
import { ArrowLeft, Check, X, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";

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
            <ArrowLeft aria-hidden="true" className="w-4 h-4" />
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
            className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-md transition-colors ${
              toastMessage.type === "success"
                ? "bg-success/10 text-success border border-success/30"
                : "bg-destructive/10 text-destructive border border-destructive/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === "success" ? (
                <Check aria-hidden="true" className="w-5 h-5 text-success" />
              ) : (
                <X aria-hidden="true" className="w-5 h-5 text-destructive" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <IconButton
              type="button"
              variant="standard"
              size="xs"
              onClick={() => setToastMessage(null)}
              aria-label="Đóng thông báo"
              className="opacity-60 hover:opacity-100"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </IconButton>
          </div>
        )}

        {/* Role Access Guard Alert */}
        {isMounted && !isInstructorOrAdmin && (
          <div className="p-6 rounded-2xl bg-warning/10 border border-warning/30 text-warning">
            <h2 className="font-bold text-base flex items-center gap-2">
              <AlertTriangle aria-hidden="true" className="w-5 h-5" />
              Quyền truy cập bị hạn chế
            </h2>
            <p className="text-sm mt-1">
              Bạn đang sử dụng tài khoản Học viên. Vui lòng đăng nhập với tài khoản Giảng viên
              (Instructor) hoặc Quản trị viên (Admin) để thực hiện quyền xét duyệt đơn.
            </p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border mb-6">
          {[
            { label: "Tất cả đơn", value: "ALL" },
            { label: "Chờ xét duyệt (Pending)", value: "PENDING" },
            { label: "Đã phê duyệt (Approved)", value: "APPROVED" },
            { label: "Đã từ chối (Rejected)", value: "REJECTED" },
          ].map((tab) => (
            <Chip
              key={tab.value}
              variant="filter"
              selected={activeTab === tab.value}
              onClick={() => setActiveTab(tab.value as any)}
            >
              {tab.label}
            </Chip>
          ))}
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
          <Card variant="outlined" className="py-16 text-center p-8">
            <FileText aria-hidden="true" className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-base font-bold text-foreground">
              Không có đơn nộp nào trong danh mục này
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Các đơn Hỗ trợ tài chính mới từ học viên sẽ xuất hiện ở đây.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredApps.map((app) => (
              <Card key={app.id} variant="outlined" className="p-6 space-y-4 text-foreground">
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
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => handleReview(app.id, false)}
                      disabled={processingId === app.id}
                      className="text-xs font-bold text-destructive bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
                    >
                      <X aria-hidden="true" className="w-4 h-4" />
                      <span>{"Từ chối đơn"}</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleReview(app.id, true)}
                      disabled={processingId === app.id}
                      className="text-xs font-bold text-primary-foreground bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
                    >
                      <Check aria-hidden="true" className="w-4 h-4" />
                      <span>{"Phê duyệt đơn"}</span>
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
