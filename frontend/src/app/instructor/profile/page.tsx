"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UserRole } from "@/gen/identity/v1/identity_pb";
import { useUserProfileQuery, useUpdateInstructorProfileMutation } from "@/lib/query_hooks";
import { Button } from "@/components/ui/Button";

const emptySubscribe = () => () => {};

export default function InstructorProfilePage() {
  const router = useRouter();

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const userId =
    isMounted && typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
  const {
    data: userProfile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useUserProfileQuery(userId);

  const isInstructorOrTA =
    userProfile?.role === UserRole.INSTRUCTOR ||
    userProfile?.role === UserRole.TA ||
    userProfile?.role === UserRole.SUPER_ADMIN;

  const updateMutation = useUpdateInstructorProfileMutation();

  const [titleInput, setTitleInput] = useState<string | null>(null);
  const [signatureInput, setSignatureInput] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const title = titleInput ?? userProfile?.title ?? "";
  const signatureImageUrl = signatureInput ?? userProfile?.signatureImageUrl ?? "";

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span aria-live="polite">Đang tải thông tin hồ sơ…</span>
        </div>
      </div>
    );
  }

  if (!isInstructorOrTA) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl text-center">
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Từ chối truy cập</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Trang này chỉ dành cho Giảng viên (Instructor) hoặc Trợ giảng (TA) thiết lập hồ sơ và chữ
          ký tay điện tử.
        </p>
        <Button onClick={() => router.push("/")} className="mt-4" variant="outline">
          Về trang chủ
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    try {
      await updateMutation.mutateAsync({
        title,
        signatureImageUrl,
      });
      await refetchProfile();
      setTitleInput(null);
      setSignatureInput(null);
      setStatusMessage({
        type: "success",
        text: "Cập nhật chức danh và chữ ký tay điện tử thành công!",
      });
    } catch (err: unknown) {
      setStatusMessage({ type: "error", text: (err as Error).message || "Cập nhật thất bại" });
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
          <button
            onClick={() => router.push("/instructor/courses")}
            className="hover:text-blue-600 transition-colors"
          >
            Giảng dạy
          </button>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium">
            Hồ sơ & Chữ ký Giảng viên
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance">
          Cấu hình Hồ sơ & Chữ ký tay Điện tử
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          Chức danh khoa học và chữ ký điện tử của bạn sẽ tự động hiển thị trên chứng chỉ cấp cho
          Học viên hoàn thành khóa học.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`mt-6 p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <svg
                className="w-5 h-5 text-emerald-600"
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
            ) : (
              <svg
                className="w-5 h-5 text-red-600"
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
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* User General Info Card (Read-only) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-5">
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-md">
            {userProfile?.avatarUrl ? (
              <Image
                src={userProfile.avatarUrl}
                alt={userProfile.fullName}
                width={64}
                height={64}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <span>{userProfile?.fullName?.charAt(0).toUpperCase() || "I"}</span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {userProfile?.fullName}
            </h2>
            <p className="text-xs text-slate-500">{userProfile?.email}</p>
            <span className="inline-block mt-1.5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {userProfile?.role === UserRole.INSTRUCTOR
                ? "Giảng viên"
                : userProfile?.role === UserRole.TA
                  ? "Trợ giảng"
                  : "Quản trị viên"}
            </span>
          </div>
        </div>

        {/* Academic Title & Signature Form */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Chức danh khoa học & Học vị
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="VD: PGS.TS, GS.TS, Giảng viên chính, Thạc sĩ Khoa học Máy tính"
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Chức danh này sẽ xuất hiện bên dưới họ tên của bạn trên tất cả các Giấy chứng nhận
              hoàn thành khóa học.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              URL Ảnh Chữ ký tay Điện tử (PNG / SVG nền trong suốt)
            </label>
            <input
              type="text"
              value={signatureImageUrl}
              onChange={(e) => setSignatureInput(e.target.value)}
              placeholder="https://example.com/signature.png"
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Khuyến nghị tải lên ảnh dạng nét mực chữ ký tay trên nền trong suốt (Format PNG/SVG)
              để hiển thị sắc nét nhất trên bằng cấp.
            </p>
          </div>

          {/* Signature Preview Card */}
          {signatureImageUrl && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase text-slate-400 mb-3 tracking-wider">
                Xem trước Chữ ký hiển thị trên Giấy chứng nhận:
              </p>
              <div className="flex items-center space-x-6">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 inline-block">
                  <Image
                    src={signatureImageUrl}
                    alt="Mẫu chữ ký"
                    width={140}
                    height={56}
                    className="h-14 object-contain"
                    unoptimized
                  />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-base font-serif italic">
                    {title ? `${title} ${userProfile?.fullName}` : userProfile?.fullName}
                  </p>
                  <p className="text-xs text-slate-500">Giảng viên Xác nhận</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-4 pt-2">
          <Button
            type="submit"
            isLoading={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-6 py-3 text-sm shadow-md flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Lưu Hồ sơ Giảng viên
          </Button>
        </div>
      </form>
    </main>
  );
}
