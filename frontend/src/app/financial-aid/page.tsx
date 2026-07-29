"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getRpcClient } from "@/lib/connect_client";
import { CertificateService, type FinancialAidApplication } from "@/gen/certificate/v1/certificate_pb";
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
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
          <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span className="text-sm font-medium">{"Đang tải danh sách Đơn Hỗ trợ tài chính..."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      {/* Header Banner */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
          {"Chương trình Hỗ trợ Tài chính Coursera"}
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {"Theo dõi Đơn xin Hỗ trợ Tài chính"}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          {"Quản lý danh sách đơn xin học bổng đã gửi. Để xin hỗ trợ cho khóa học mới, vui lòng truy cập trang Chi tiết của khóa học đó."}
        </p>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>{"Danh sách Đơn của tôi"}</span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
            {myApps.length}
          </span>
        </h2>

        {myApps.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
              {"Bạn chưa có đơn xin Hỗ trợ Tài chính nào."}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {"Để xin Hỗ trợ Tài chính cho một khóa học, vui lòng truy cập trang Chi tiết Khóa học tương ứng và chọn 'Financial Aid available'."}
            </p>
            <Link
              href="/courses"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all inline-flex items-center gap-2"
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
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    selectedApp?.id === app.id
                      ? "border-blue-500 ring-2 ring-blue-500/20"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        #{app.id}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {partnerName}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white hover:text-blue-600 transition-colors">
                      {courseTitle}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {app.essay150Words}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {app.status === "PENDING" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        {`Chờ duyệt (${app.reviewDeadlineDaysLeft}d left)`}
                      </span>
                    )}
                    {app.status === "APPROVED" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {"Đã Phê Duyệt"}
                      </span>
                    )}
                    {app.status === "REJECTED" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {"Chưa được duyệt"}
                      </span>
                    )}

                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>{"Xem chi tiết"}</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs font-mono font-semibold text-slate-500">Mã đơn: #{selectedApp.id}</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {courses.find((c) => c.id === selectedApp.courseId)?.title || selectedApp.courseId}
                </h3>
              </div>

              {selectedApp.status === "PENDING" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  {"Đang xét duyệt (Pending)"}
                </span>
              )}
              {selectedApp.status === "APPROVED" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {"Đã Phê Duyệt"}
                </span>
              )}
              {selectedApp.status === "REJECTED" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {"Chưa được duyệt"}
                </span>
              )}
            </div>

            {selectedApp.status === "PENDING" && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-bold">{"Thời gian thẩm định dự kiến:"}</p>
                <p>{"Giảng viên/Admin có tối đa 15 ngày để duyệt đơn. Còn lại: "}<strong className="text-blue-600 dark:text-blue-400">{selectedApp.reviewDeadlineDaysLeft} ngày</strong>.</p>
              </div>
            )}

            {selectedApp.status === "APPROVED" && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {"Đơn đã được duyệt thành công!"}
                </p>
                <p>{"Tài khoản của bạn đã được nâng cấp Paid Mode cho khóa học này. Bạn có thể mở toàn bộ bài thi tính điểm và nhận Verified Certificate."}</p>
              </div>
            )}

            {selectedApp.status === "REJECTED" && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {"Đơn chưa được duyệt."}
                </p>
                <p>{"Bạn có thể nộp lại đơn bài luận mới để ban quản trị tiếp tục thẩm định."}</p>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{"Bài luận đã gửi:"}</span>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                {selectedApp.essay150Words}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              {selectedApp.status === "REJECTED" && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCourseId(selectedApp.courseId);
                    setSelectedApp(null);
                    setIsReApplying(true);
                    setShowCreateModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {"Nộp lại bài luận mới"}
                </button>
              )}

              <Link
                href={`/courses/${selectedApp.courseId}`}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all ml-auto"
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
          title={isReApplying ? "Nộp lại Bài luận Hỗ trợ Tài chính" : "Soạn Đơn Hỗ trợ Tài chính Mới"}
          className="max-w-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                {"Khóa học xin Hỗ trợ Tài chính:"}
              </label>
              <div className="p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white text-sm">
                {selectedCourse ? selectedCourse.title : selectedCourseId}
              </div>

              {selectedCourse && selectedCourse.financialAidEnabled === false && (
                <div className="mt-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                  <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{"Khóa học này hiện đã bị tắt tính năng xin Hỗ trợ Tài chính (BR_FAID_003)."}</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  {"Bài luận giải trình hoàn cảnh & Mục tiêu (Tối thiểu 150 từ)"}
                </label>
                <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-md ${
                  isEnoughWords 
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}>
                  {wordCount} / 150 {"từ"}
                </span>
              </div>
              <textarea
                rows={8}
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder={"Tôi xin nộp đơn xin hỗ trợ tài chính cho khóa học này vì..."}
                className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed"
                required
              />
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${isEnoughWords ? "bg-emerald-500" : "bg-blue-600"}`}
                  style={{ width: `${Math.min(100, (wordCount / 150) * 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setIsReApplying(false);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {"Hủy"}
              </button>
              <button
                type="submit"
                disabled={submitting || !isEnoughWords || selectedCourse?.financialAidEnabled === false}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
              >
                {submitting
                  ? "Đang gửi đơn..."
                  : selectedCourse?.financialAidEnabled === false
                  ? "Khóa học này đã tắt FinAid"
                  : "Gửi đơn Hỗ trợ"}
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
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <span className="text-sm text-slate-500">Loading...</span>
      </div>
    }>
      <FinancialAidContent />
    </Suspense>
  );
}
