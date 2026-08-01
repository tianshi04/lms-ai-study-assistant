"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  useSubmitInstructorApplicationMutation,
  useMyInstructorApplicationQuery,
} from "@/lib/query_hooks";
import { InstructorApplicationStatus } from "@/gen/identity/v1/identity_pb";

export default function BecomeAnInstructorPage() {
  const { userName, userRole } = useAuth();
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isReapplying, setIsReapplying] = useState(false);

  const { data: existingApp, isLoading: isLoadingApp } = useMyInstructorApplicationQuery({
    enabled: !!userName,
  });

  const submitMutation = useSubmitInstructorApplicationMutation({
    onSuccess: () => {
      setSubmitSuccess(true);
      setIsReapplying(false);
      setErrorMessage("");
    },
    onError: (err) => {
      setErrorMessage(err.message || "Không thể gửi đơn đăng ký. Vui lòng thử lại.");
    },
  });

  const isInstructor = userRole === "2" || userRole === "4" || userRole === "5";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Vui lòng nhập Chức danh chuyên môn mong muốn.");
      return;
    }
    if (!bio.trim()) {
      setErrorMessage("Vui lòng nhập Bài viết tiểu sử năng lực.");
      return;
    }

    setErrorMessage("");
    submitMutation.mutate({
      title: title.trim(),
      bio: bio.trim(),
      linkedinUrl: linkedinUrl.trim(),
      cvUrl: cvUrl.trim(),
      demoVideoUrl: demoVideoUrl.trim(),
    });
  };

  const handleStartReapply = () => {
    if (existingApp) {
      setTitle(existingApp.title || "");
      setBio(existingApp.bio || "");
      setLinkedinUrl(existingApp.linkedinUrl || "");
      setCvUrl(existingApp.cvUrl || "");
      setDemoVideoUrl(existingApp.demoVideoUrl || "");
    }
    setIsReapplying(true);
  };

  // Determine active status
  const activeApp =
    existingApp || (submitSuccess ? { status: InstructorApplicationStatus.PENDING_REVIEW } : null);
  const isPending = activeApp?.status === InstructorApplicationStatus.PENDING_REVIEW;
  const isRejected = activeApp?.status === InstructorApplicationStatus.REJECTED;

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Hero Section */}
        <div className="bg-card rounded-3xl p-8 sm:p-10 shadow-xl border border-border text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-info/10 text-info text-xs font-bold uppercase tracking-wider mb-4 border border-info/20">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l9-5-9-5-9 5 9 5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
              />
            </svg>
            <span>Dành cho Chuyên gia & Đào tạo Cá nhân</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight text-balance">
            Nộp Đơn Xin Cấp Quyền{" "}
            <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
              Giảng Viên Cá Nhân
            </span>
          </h1>

          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
            Trở thành Giảng viên trên nền tảng Coursera AI, chia sẻ tri thức chuyên môn đến hàng
            ngàn học viên và khẳng định thương hiệu cá nhân của bạn.
          </p>
        </div>

        {/* Loading Spinner */}
        {isLoadingApp ? (
          <div className="bg-card rounded-3xl p-12 text-center border border-border shadow-sm">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-3" />
            <p aria-live="polite" className="text-muted-foreground text-sm font-medium">
              Đang kiểm tra hồ sơ đăng ký của bạn…
            </p>
          </div>
        ) : isInstructor ? (
          /* View for already instructor */
          <div className="bg-success/10 border border-success/30 rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-success/20 text-success rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Tài khoản của bạn đã sở hữu vai trò Giảng viên!
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Bạn có thể truy cập ngay Cổng Giảng viên (Instructor Portal) để bắt đầu biên soạn và
              đăng tải các khóa học mới.
            </p>
            <div className="pt-2">
              <Link
                href="/instructor/courses"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold shadow-lg transition-all"
              >
                <span>Truy cập Cổng Giảng viên</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        ) : !userName ? (
          /* View for not logged in */
          <div className="bg-warning/10 border border-warning/30 rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-warning/20 text-warning rounded-2xl flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Vui lòng Đăng nhập để Nộp Đơn</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Bạn cần có tài khoản cá nhân trên hệ thống để gửi đơn xin cấp quyền Giảng viên và theo
              dõi kết quả thẩm định.
            </p>
            <div className="flex items-center justify-center gap-4 pt-2">
              <Link
                href="/auth/login?redirect=/become-an-instructor"
                className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold shadow-lg transition-all"
              >
                Đăng nhập ngay
              </Link>
              <Link
                href="/auth/register"
                className="px-6 py-3 rounded-2xl bg-card text-foreground border border-border hover:bg-muted font-bold transition-all"
              >
                Đăng ký tài khoản
              </Link>
            </div>
          </div>
        ) : isPending ? (
          /* View for Pending Application */
          <div className="bg-card rounded-3xl p-8 sm:p-10 shadow-xl border border-border space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border pb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Đơn Đăng Ký Đang Được Thẩm Định
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Mã đơn: <span className="font-mono">{existingApp?.id || "PENDING"}</span>
                </p>
              </div>
              <span className="px-4 py-1.5 rounded-full bg-warning/10 text-warning text-xs font-bold border border-warning/30 uppercase tracking-wider">
                Chờ Thẩm Định (PENDING_REVIEW)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-warning/10 border border-warning/30 text-foreground text-sm flex items-start gap-3">
              <svg
                className="w-5 h-5 text-warning shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="font-bold">Hồ sơ của bạn đã được ghi nhận thành công.</p>
                <p className="mt-0.5 text-muted-foreground">
                  Ban Quản trị nền tảng (Super Admin) đang tiến hành thẩm định thông tin năng lực
                  chuyên môn và video demo. Kết quả sẽ được tự động cập nhật ngay trên trang này.
                </p>
              </div>
            </div>

            {existingApp && (
              <div className="space-y-4 pt-2 text-sm">
                <h3 className="font-bold text-foreground text-base">Thông tin đã nộp:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted p-4 rounded-2xl border border-border">
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">
                      Chức danh đăng ký:
                    </span>
                    <span className="font-bold text-foreground">{existingApp.title}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">
                      Thời gian nộp:
                    </span>
                    <span className="font-medium text-foreground">
                      {existingApp.createdAt
                        ? new Date(existingApp.createdAt).toLocaleString("vi-VN")
                        : "Gần đây"}
                    </span>
                  </div>
                  {existingApp.linkedinUrl && (
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">
                        LinkedIn/Portfolio:
                      </span>
                      <a
                        href={existingApp.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-medium truncate block"
                      >
                        {existingApp.linkedinUrl}
                      </a>
                    </div>
                  )}
                  {existingApp.cvUrl && (
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">
                        File CV (.pdf):
                      </span>
                      <a
                        href={existingApp.cvUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-medium truncate block"
                      >
                        {existingApp.cvUrl}
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block font-medium mb-1">
                    Tiểu sử năng lực:
                  </span>
                  <p className="bg-muted p-4 rounded-2xl border border-border text-foreground leading-relaxed whitespace-pre-line">
                    {existingApp.bio}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : isRejected && !isReapplying ? (
          /* View for Rejected Application */
          <div className="bg-card rounded-3xl p-8 sm:p-10 shadow-xl border border-border space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border pb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Kết Quả Thẩm Định Hồ Sơ</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Đơn nộp ngày:{" "}
                  {existingApp?.createdAt
                    ? new Date(existingApp.createdAt).toLocaleDateString("vi-VN")
                    : "Trước"}
                </p>
              </div>
              <span className="px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-bold border border-destructive/30 uppercase tracking-wider">
                Từ Chối (REJECTED)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-sm space-y-2">
              <div className="flex items-center gap-2 font-bold text-base">
                <svg
                  className="w-5 h-5 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Hồ sơ chưa được phê duyệt</span>
              </div>
              <p>
                <span className="font-semibold">Lý do từ chối:</span>{" "}
                {existingApp?.rejectionReason || "Hồ sơ chưa đáp ứng đầy đủ tiêu chuẩn chuyên môn."}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Bạn có thể chỉnh sửa lại các thông tin bằng cách bổ sung thêm kinh nghiệm, làm rõ
              thành tựu hoặc cập nhật CV/Video demo mới để nộp lại đơn.
            </p>

            <div className="pt-2 flex justify-start">
              <button
                type="button"
                onClick={handleStartReapply}
                className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold shadow-lg transition-all flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span>Chỉnh Sửa & Nộp Lại Đơn Mới</span>
              </button>
            </div>
          </div>
        ) : (
          /* Application Form */
          <form
            onSubmit={handleSubmit}
            className="bg-card rounded-3xl p-8 sm:p-10 shadow-xl border border-border space-y-6"
          >
            <div className="border-b border-border pb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>
                  {isReapplying ? "Soạn Lại Đơn Đăng Ký Mới" : "Thông tin Hồ sơ Thẩm định"}
                </span>
              </h2>
              {isReapplying && (
                <button
                  type="button"
                  onClick={() => setIsReapplying(false)}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold underline"
                >
                  Quay lại xem lý do từ chối
                </button>
              )}
            </div>

            {isReapplying && (
              <div className="p-4 rounded-2xl bg-warning/10 border border-warning/30 text-warning text-xs">
                <span className="font-bold block mb-1">Đang soạn đơn đăng ký lại:</span>
                <span>
                  Vui lòng bổ sung hoặc điều chỉnh thông tin dựa trên lý do từ chối trước đó (
                  {existingApp?.rejectionReason}).
                </span>
              </div>
            )}

            {errorMessage && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-semibold flex items-center gap-3">
                <svg
                  className="w-5 h-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Title Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-foreground">
                Chức danh Chuyên môn / Học hàm <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Chuyên gia AI & Khoa học Dữ liệu, Tiến sĩ Công nghệ Thông tin"
                className="w-full px-4 py-3 rounded-2xl border border-input bg-muted text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                Chức danh này sẽ hiển thị bên cạnh tên của bạn trên các khóa học sau khi được phê
                duyệt.
              </p>
            </div>

            {/* Bio Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-foreground">
                Bài viết Tiểu sử Năng lực & Kinh nghiệm <span className="text-destructive">*</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                placeholder="Mô tả quá trình công tác, thành tựu chuyên môn, các dự án thực tế và định hướng giảng dạy của bạn…"
                className="w-full px-4 py-3 rounded-2xl border border-input bg-muted text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors text-sm resize-none"
                required
              />
            </div>

            {/* Portfolio / LinkedIn Link */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-foreground">
                Đường dẫn Trang cá nhân LinkedIn / Website Portfolio
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username hoặc https://yourportfolio.com"
                spellCheck={false}
                className="w-full px-4 py-3 rounded-2xl border border-input bg-muted text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors text-sm"
              />
            </div>

            {/* CV PDF Link */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-foreground">
                Đường dẫn File Hồ sơ Năng lực CV (.pdf)
              </label>
              <input
                type="url"
                value={cvUrl}
                onChange={(e) => setCvUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/… hoặc link file PDF"
                spellCheck={false}
                className="w-full px-4 py-3 rounded-2xl border border-input bg-muted text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors text-sm"
              />
            </div>

            {/* Demo Video Link */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-foreground">
                Đường dẫn Link Video Giảng thử Demo
              </label>
              <input
                type="url"
                value={demoVideoUrl}
                onChange={(e) => setDemoVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=… hoặc link Video giới thiệu bài giảng"
                spellCheck={false}
                className="w-full px-4 py-3 rounded-2xl border border-input bg-muted text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors text-sm"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {submitMutation.isPending ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4 text-primary-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span aria-live="polite">Đang gửi đơn…</span>
                  </>
                ) : (
                  <>
                    <span>Gửi đơn xin cấp quyền Giảng viên</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
