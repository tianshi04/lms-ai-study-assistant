"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getRpcClient } from "@/lib/connect_client";
import { CertificateService, type FinancialAidApplication } from "@/gen/certificate/v1/certificate_pb";
import { CatalogService, type Course } from "@/gen/catalog/v1/catalog_pb";
import { ThemeToggle } from "@/components/ThemeToggle";

function FinancialAidContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCourseId = searchParams.get("courseId") || "course-python-ai";

  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [courses, setCourses] = useState<Course[]>([]);
  const [essay, setEssay] = useState("");
  const [existingApp, setExistingApp] = useState<FinancialAidApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isReApplying, setIsReApplying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const wordCount = essay.trim() === "" ? 0 : essay.trim().split(/\s+/).length;
  const isEnoughWords = wordCount >= 150;

  // Load Course List for dropdown selection
  useEffect(() => {
    async function fetchCourses() {
      try {
        const client = getRpcClient(CatalogService);
        const res = await client.listCourses({ pageSize: 50 });
        setCourses(res.courses);
      } catch (err) {
        console.error("Lỗi lấy danh sách khóa học:", err);
      }
    }
    fetchCourses();
  }, []);

  // Load status whenever selectedCourseId changes
  useEffect(() => {
    async function loadStatus() {
      setLoading(true);
      setIsReApplying(false);
      setMessage(null);
      try {
        const client = getRpcClient(CertificateService);
        const res = await client.getFinancialAidStatus({ courseId: selectedCourseId });
        setExistingApp(res.application || null);
      } catch (err) {
        console.error("Lỗi kiểm tra đơn Financial Aid:", err);
        setExistingApp(null);
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, [selectedCourseId]);

  const handleCourseChange = (newCourseId: string) => {
    setSelectedCourseId(newCourseId);
    router.push(`/financial-aid?courseId=${newCourseId}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEnoughWords) {
      setMessage({ type: "error", text: "Bài luận cần tối thiểu 150 từ trước khi nộp." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const client = getRpcClient(CertificateService);
      const res = await client.applyFinancialAid({
        courseId: selectedCourseId,
        essay150Words: essay,
      });

      if (res.application) {
        setExistingApp(res.application);
        setIsReApplying(false);
        setEssay("");
        setMessage({ type: "success", text: "Đơn xin hỗ trợ tài chính đã được gửi thành công!" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gửi đơn thất bại. Vui lòng thử lại.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
          <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span className="text-sm font-medium">Đang tải dữ liệu Hỗ trợ tài chính...</span>
        </div>
      </div>
    );
  }

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      {/* Header Banner */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-3">
          Coursera Financial Aid Program
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          Đơn xin Hỗ trợ Tài chính (Financial Aid)
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          Coursera cam kết mang lại cơ hội tiếp cận tri thức bình đẳng. Đơn xin hỗ trợ tài chính giúp bạn tham gia khóa học trả phí và nhận chứng chỉ hoàn toàn miễn phí.
        </p>
      </div>

      {/* Course Selection Dropdown Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Chọn Khóa học muốn xin Hỗ trợ Tài chính:
        </label>
        <select
          value={selectedCourseId}
          onChange={(e) => handleCourseChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
        >
          {courses.length > 0 ? (
            courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.partnerName})
              </option>
            ))
          ) : (
            <option value={selectedCourseId}>{selectedCourseId}</option>
          )}
        </select>
        {selectedCourse && (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            Đối tác cấp bằng: <strong className="text-slate-700 dark:text-slate-300">{selectedCourse.partnerName}</strong>
          </p>
        )}
      </div>

      {/* Existing Application Status Card (If already submitted & not re-applying) */}
      {existingApp && !isReApplying ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Mã đơn: #{existingApp.id}
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Trạng thái hồ sơ Hỗ trợ tài chính</h2>
            </div>

            {/* Status Badge */}
            {existingApp.status === "PENDING" && (
              <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Đang xét duyệt (Pending)
              </span>
            )}
            {existingApp.status === "APPROVED" && (
              <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Đã Phê Duyệt (Approved)
              </span>
            )}
            {existingApp.status === "REJECTED" && (
              <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Chưa được Phê duyệt (Rejected)
              </span>
            )}
          </div>

          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
            {existingApp.status === "PENDING" && (
              <>
                <p>
                  Đơn xin hỗ trợ tài chính cho khóa học <strong className="text-slate-900 dark:text-white">{selectedCourseId}</strong> của bạn đã được nhận và đang trong quá trình thẩm định từ Giảng viên/Admin.
                </p>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Thời gian phản hồi dự kiến:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{existingApp.reviewDeadlineDaysLeft} ngày còn lại</span>
                </div>
              </>
            )}

            {existingApp.status === "APPROVED" && (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-2">
                <p className="font-bold text-base flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Chúc mừng! Đơn xin hỗ trợ tài chính của bạn đã được phê duyệt.
                </p>
                <p className="text-sm">
                  Bạn đã được mở khóa toàn bộ bài kiểm tra tính điểm và đủ điều kiện nhận Chứng chỉ xác minh (Verified Certificate) sau khi hoàn thành khóa học.
                </p>
              </div>
            )}

            {existingApp.status === "REJECTED" && (
              <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 space-y-3">
                <p className="font-bold text-base flex items-center gap-2">
                  <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Đơn xin hỗ trợ tài chính trước đó của bạn chưa được duyệt.
                </p>
                <p className="text-sm">
                  Bạn có thể bổ sung chi tiết bài luận giải trình hoàn cảnh kinh tế & mục tiêu học tập rõ ràng hơn để <strong>nộp lại đơn bài luận mới</strong>.
                </p>
              </div>
            )}

            {/* Display Previous Submitted Essay */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Bài luận đã gửi:</span>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                {existingApp.essay150Words}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            {existingApp.status === "REJECTED" && (
              <button
                onClick={() => setIsReApplying(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Nộp lại đơn bài luận mới</span>
              </button>
            )}

            <Link
              href={`/courses/${selectedCourseId}`}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all text-center ml-auto"
            >
              Vào học ngay (Auditing)
            </Link>
          </div>
        </div>
      ) : (
        /* Application Form (For new applications OR re-applying) */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
          {isReApplying && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center justify-between">
              <span>Đang ở chế độ: Nộp lại đơn bài luận mới sau khi điều chỉnh</span>
              <button onClick={() => setIsReApplying(false)} className="text-xs text-amber-700 underline font-bold">
                Hủy nộp lại
              </button>
            </div>
          )}

          {message && (
            <div
              className={`p-4 rounded-2xl border text-sm flex items-center gap-3 ${
                message.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400"
              }`}
            >
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-900 dark:text-white">
                  Bài luận giải trình hoàn cảnh & Mục tiêu (Tối thiểu 150 từ)
                </label>
                <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-md ${
                  isEnoughWords 
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}>
                  {wordCount} / 150 từ
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Hãy giải thích lý do bạn xin hỗ trợ tài chính, dự định học tập và việc hoàn thành khóa học này sẽ giúp ích thế nào cho sự nghiệp của bạn.
              </p>
              <textarea
                rows={10}
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder="Tôi xin nộp đơn xin hỗ trợ tài chính cho khóa học này vì..."
                className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm leading-relaxed"
                required
              />

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${isEnoughWords ? "bg-emerald-500" : "bg-blue-600"}`}
                  style={{ width: `${Math.min(100, (wordCount / 150) * 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Cam kết liêm chính học thuật:
              </p>
              <p>Tôi cam kết cung cấp thông tin trung thực về hoàn cảnh kinh tế và sẽ hoàn thành tất cả các bài kiểm tra của khóa học nếu đơn xin được phê duyệt.</p>
            </div>

            <button
              type="submit"
              disabled={submitting || !isEnoughWords}
              className="w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? "Đang gửi đơn..." : "Gửi đơn xin Hỗ trợ Tài chính"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function FinancialAidPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-between transition-colors">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/courses" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              C
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Coursera AI
              </span>
              <span className="text-xs block text-slate-500 dark:text-slate-400 font-medium">LMS Platform</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <Suspense fallback={
        <div className="flex items-center justify-center py-24">
          <span className="text-sm text-slate-500">Loading...</span>
        </div>
      }>
        <FinancialAidContent />
      </Suspense>
    </div>
  );
}
