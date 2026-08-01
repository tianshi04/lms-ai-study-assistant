"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  FileText,
  Check,
  X,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { getRpcClient } from "@/lib/connect_client";
import {
  CertificateService,
  type FinancialAidApplication,
} from "@/gen/certificate/v1/certificate_pb";
import { CatalogService, type Course } from "@/gen/catalog/v1/catalog_pb";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";

function FinancialAidContent() {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get("courseId") || "";

  const [courses, setCourses] = useState<Course[]>([]);
  const [myApps, setMyApps] = useState<FinancialAidApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<FinancialAidApplication | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Application Form State (triggered when coming from Course Detail page)
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [essay, setEssay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isReApplying, setIsReApplying] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const wordCount = essay.trim() === "" ? 0 : essay.trim().split(/\s+/).length;
  const isEnoughWords = wordCount >= 150;

  // Load Course List & User's Financial Aid Applications
  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setLoading(true);
      try {
        const catalogClient = getRpcClient(CatalogService);
        const certClient = getRpcClient(CertificateService);

        const [courseRes, myAppRes] = await Promise.all([
          catalogClient.listCourses({ pageSize: 50 }).catch(() => ({ courses: [] })),
          certClient.listMyFinancialAids({}).catch(() => ({ applications: [] })),
        ]);

        if (!ignore) {
          setCourses(courseRes.courses);
          setMyApps(myAppRes.applications);

          // If navigated directly from Course Detail page via ?courseId=...
          if (initialCourseId) {
            setSelectedCourseId(initialCourseId);
            const found = myAppRes.applications.find((a) => a.courseId === initialCourseId);
            if (found) {
              setSelectedApp(found);
            } else {
              setShowCreateModal(true);
            }
          }
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu Hỗ trợ tài chính:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [initialCourseId]);

  const refreshMyApps = async () => {
    try {
      const certClient = getRpcClient(CertificateService);
      const res = await certClient.listMyFinancialAids({});
      setMyApps(res.applications);
    } catch (err) {
      console.error("Failed to refresh applications:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEnoughWords) {
      toast.error("Bài luận cần tối thiểu 150 từ trước khi nộp.");
      return;
    }

    setSubmitting(true);

    try {
      const client = getRpcClient(CertificateService);
      const res = await client.applyFinancialAid({
        courseId: selectedCourseId,
        essay150Words: essay,
      });

      if (res.application) {
        toast.success("Đơn xin hỗ trợ tài chính đã được gửi thành công!");
        setShowCreateModal(false);
        setIsReApplying(false);
        setEssay("");
        setSelectedApp(res.application);
        await refreshMyApps();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gửi đơn thất bại. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
          <span aria-live="polite" className="text-sm font-medium">
            {"Đang tải danh sách Đơn Hỗ trợ tài chính…"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      {/* Header Banner */}
      <div className="border-b border-border pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
          {"Chương trình Hỗ trợ Tài chính Coursera"}
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight text-balance">
          {"Theo dõi Đơn xin Hỗ trợ Tài chính"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {
            "Quản lý danh sách đơn xin học bổng đã gửi. Để xin hỗ trợ cho khóa học mới, vui lòng truy cập trang Chi tiết của khóa học đó."
          }
        </p>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span>{"Danh sách Đơn của tôi"}</span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
            {myApps.length}
          </span>
        </h2>

        {myApps.length === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              {"Bạn chưa có đơn xin Hỗ trợ Tài chính nào."}
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {
                "Để xin Hỗ trợ Tài chính cho một khóa học, vui lòng truy cập trang Chi tiết Khóa học tương ứng và chọn 'Financial Aid available'."
              }
            </p>
            <Link
              href="/courses"
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all inline-flex items-center gap-2"
            >
              {"Khám phá danh sách Khóa học →"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {myApps.map((app) => {
              const matchedCourse = courses.find((c) => c.id === app.courseId);
              const courseTitle = matchedCourse ? matchedCourse.title : app.courseId;
              const partnerName = matchedCourse ? matchedCourse.partnerName : "Coursera AI Partner";

              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    selectedApp?.id === app.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        #{app.id}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {partnerName}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground hover:text-primary transition-colors">
                      {courseTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {app.essay150Words}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {app.status === "PENDING" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-warning/10 text-warning border border-warning/20 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                        {`Chờ duyệt (${app.reviewDeadlineDaysLeft}d left)`}
                      </span>
                    )}
                    {app.status === "APPROVED" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-success" />
                        {"Đã Phê Duyệt"}
                      </span>
                    )}
                    {app.status === "REJECTED" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1.5">
                        <X className="w-3.5 h-3.5 text-destructive" />
                        {"Chưa được duyệt"}
                      </span>
                    )}

                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-xs font-bold text-foreground transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>{"Xem chi tiết"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Application Detail Modal */}
      {selectedApp && (
        <Modal
          isOpen={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          title={"Chi tiết Đơn Hỗ trợ Tài chính"}
          className="max-w-2xl"
        >
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <span className="text-xs font-mono font-semibold text-muted-foreground">
                  Mã đơn: #{selectedApp.id}
                </span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">
                  {courses.find((c) => c.id === selectedApp.courseId)?.title ||
                    selectedApp.courseId}
                </h3>
              </div>

              {selectedApp.status === "PENDING" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-warning/10 text-warning border border-warning/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                  {"Đang xét duyệt (Pending)"}
                </span>
              )}
              {selectedApp.status === "APPROVED" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-success" />
                  {"Đã Phê Duyệt"}
                </span>
              )}
              {selectedApp.status === "REJECTED" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1.5">
                  <X className="w-4 h-4 text-destructive" />
                  {"Chưa được duyệt"}
                </span>
              )}
            </div>

            {selectedApp.status === "PENDING" && (
              <div className="p-4 rounded-2xl bg-warning/10 border border-warning/20 text-xs text-warning space-y-1">
                <p className="font-bold">{"Thời gian thẩm định dự kiến:"}</p>
                <p>
                  {"Giảng viên/Admin có tối đa 15 ngày để duyệt đơn. Còn lại: "}
                  <strong className="text-primary font-bold">
                    {selectedApp.reviewDeadlineDaysLeft} ngày
                  </strong>
                  .
                </p>
              </div>
            )}

            {selectedApp.status === "APPROVED" && (
              <div className="p-4 rounded-2xl bg-success/10 border border-success/20 text-xs text-success space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  {"Đơn đã được duyệt thành công!"}
                </p>
                <p>
                  {
                    "Tài khoản của bạn đã được nâng cấp Paid Mode cho khóa học này. Bạn có thể mở toàn bộ bài thi tính điểm và nhận Verified Certificate."
                  }
                </p>
              </div>
            )}

            {selectedApp.status === "REJECTED" && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  {"Đơn chưa được duyệt."}
                </p>
                <p>{"Bạn có thể nộp lại đơn bài luận mới để ban quản trị tiếp tục thẩm định."}</p>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {"Bài luận đã gửi:"}
              </span>
              <div className="p-4 rounded-2xl bg-muted/50 border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                {selectedApp.essay150Words}
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
              {selectedApp.status === "REJECTED" && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCourseId(selectedApp.courseId);
                    setSelectedApp(null);
                    setIsReApplying(true);
                    setShowCreateModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-warning hover:bg-warning-hover text-warning-foreground font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {"Nộp lại bài luận mới"}
                </button>
              )}

              <Link
                href={`/courses/${selectedApp.courseId}`}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all ml-auto"
              >
                {"Trang bài giảng khóa học →"}
              </Link>
            </div>
          </div>
        </Modal>
      )}

      {/* Create New Application Modal (Only opens if navigated from Course Detail page via ?courseId=...) */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setIsReApplying(false);
          }}
          title={
            isReApplying ? "Nộp lại Bài luận Hỗ trợ Tài chính" : "Soạn Đơn Hỗ trợ Tài chính Mới"
          }
          className="max-w-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {"Khóa học xin Hỗ trợ Tài chính:"}
              </label>
              <div className="p-3.5 rounded-xl border border-input bg-muted font-bold text-foreground text-sm">
                {selectedCourse ? selectedCourse.title : selectedCourseId}
              </div>

              {selectedCourse && selectedCourse.financialAidEnabled === false && (
                <div className="mt-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span>
                    {"Khóa học này hiện đã bị tắt tính năng xin Hỗ trợ Tài chính (BR_FAID_003)."}
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {"Bài luận giải trình hoàn cảnh & Mục tiêu (Tối thiểu 150 từ)"}
                </label>
                <span
                  className={`text-xs font-bold font-mono px-2.5 py-1 rounded-md ${
                    isEnoughWords
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {wordCount} / 150 {"từ"}
                </span>
              </div>
              <textarea
                rows={8}
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder={"Tôi xin nộp đơn xin hỗ trợ tài chính cho khóa học này vì…"}
                className="w-full p-4 rounded-2xl border border-input bg-card text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-sm leading-relaxed"
                required
              />
              <div className="w-full bg-muted h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${isEnoughWords ? "bg-success" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, (wordCount / 150) * 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setIsReApplying(false);
                }}
                className="px-4 py-2.5 rounded-xl border border-input text-foreground text-xs font-semibold hover:bg-muted cursor-pointer"
              >
                {"Hủy"}
              </button>
              <button
                type="submit"
                disabled={
                  submitting || !isEnoughWords || selectedCourse?.financialAidEnabled === false
                }
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold shadow-lg disabled:opacity-50 cursor-pointer"
              >
                <span aria-live="polite">
                  {submitting
                    ? "Đang gửi đơn…"
                    : selectedCourse?.financialAidEnabled === false
                      ? "Khóa học này đã tắt FinAid"
                      : "Gửi đơn Hỗ trợ"}
                </span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function FinancialAidPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <span aria-live="polite" className="text-sm text-muted-foreground">
            Loading…
          </span>
        </div>
      }
    >
      <FinancialAidContent />
    </Suspense>
  );
}
