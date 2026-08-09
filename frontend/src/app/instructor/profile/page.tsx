"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UserRole } from "@/gen/identity/v1/identity_pb";
import { useUserProfileQuery, useUpdateInstructorProfileMutation } from "@/lib/query_hooks";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";

import { useAuth } from "@/components/providers/AuthProvider";
import { Check, X } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/Breadcrumb";

export default function InstructorProfilePage() {
  const router = useRouter();
  const { userId: authUserId } = useAuth();
  const userId = authUserId || "";

  const {
    data: userProfile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useUserProfileQuery(userId);

  const { isInstructorOrAdmin } = useAuth();
  const isInstructorOrTA = isInstructorOrAdmin;

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
        <div className="flex items-center space-x-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span aria-live="polite">Đang tải thông tin hồ sơ…</span>
        </div>
      </div>
    );
  }

  if (!isInstructorOrTA) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-destructive/10 border border-destructive/30 rounded-2xl text-center">
        <h2 className="text-xl font-bold text-destructive mb-2">Từ chối truy cập</h2>
        <p className="text-muted-foreground text-sm">
          Trang này chỉ dành cho Giảng viên (Instructor) thiết lập hồ sơ và chữ ký tay điện tử.
        </p>
        <Button onClick={() => router.push("/")} className="mt-4" variant="outlined">
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
      <div className="pb-6 border-b border-border">
        <Breadcrumb className="mb-1">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                className="cursor-pointer"
                onClick={() => router.push("/instructor/courses")}
              >
                Giảng dạy
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Hồ sơ & Chữ ký Giảng viên</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight text-balance">
          Cấu hình Hồ sơ & Chữ ký tay Điện tử
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Chức danh khoa học và chữ ký điện tử của bạn sẽ tự động hiển thị trên chứng chỉ cấp cho
          Học viên hoàn thành khóa học.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`mt-6 p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-success/10 text-success border-success/30"
              : "bg-destructive/10 text-destructive border-destructive/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <Check className="w-5 h-5 text-success" aria-hidden="true" />
            ) : (
              <X className="w-5 h-5 text-destructive" aria-hidden="true" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <IconButton
            type="button"
            variant="standard"
            size="xs"
            onClick={() => setStatusMessage(null)}
            aria-label="Đóng thông báo"
            className="opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </IconButton>
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* User General Info Card (Read-only) */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex items-center space-x-5">
          <Avatar
            name={userProfile?.fullName || "Giảng viên"}
            src={userProfile?.avatarUrl}
            size="lg"
          />
          <div>
            <h2 className="text-xl font-bold text-foreground">{userProfile?.fullName}</h2>
            <p className="text-xs text-muted-foreground">{userProfile?.email}</p>
            <span className="inline-block mt-1.5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-md bg-info/10 text-info border border-info/20">
              {userProfile?.role === UserRole.INSTRUCTOR ? "Giảng viên" : "Quản trị viên / Nhân sự"}
            </span>
          </div>
        </div>

        {/* Academic Title & Signature Form */}
        <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-sm space-y-6">
          <div>
            <label
              htmlFor="academicTitle"
              className="block text-sm font-semibold text-muted-foreground mb-1.5"
            >
              Chức danh khoa học & Học vị
            </label>
            <Input
              id="academicTitle"
              type="text"
              value={title}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="VD: PGS.TS, GS.TS, Giảng viên chính, Thạc sĩ Khoa học Máy tính"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Chức danh này sẽ xuất hiện bên dưới họ tên của bạn trên tất me Giấy chứng nhận hoàn
              thành khóa học.
            </p>
          </div>

          <div>
            <label
              htmlFor="signatureImageUrl"
              className="block text-sm font-semibold text-muted-foreground mb-1.5"
            >
              URL Ảnh Chữ ký tay Điện tử (PNG / SVG nền trong suốt)
            </label>
            <Input
              id="signatureImageUrl"
              type="text"
              value={signatureImageUrl}
              onChange={(e) => setSignatureInput(e.target.value)}
              placeholder="https://example.com/signature.png"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Khuyến nghị tải lên ảnh dạng nét mực chữ ký tay trên nền trong suốt (Format PNG/SVG)
              để hiển thị sắc nét nhất trên bằng cấp.
            </p>
          </div>

          {/* Signature Preview Card */}
          {signatureImageUrl && (
            <div className="p-4 bg-muted rounded-2xl border border-border">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider">
                Xem trước Chữ ký hiển thị trên Giấy chứng nhận:
              </p>
              <div className="flex items-center space-x-6">
                <div className="p-3 bg-card rounded-xl border border-border inline-block">
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
                  <p className="font-bold text-foreground text-base font-serif italic">
                    {title ? `${title} ${userProfile?.fullName}` : userProfile?.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">Giảng viên Xác nhận</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-4 pt-2">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-xl px-6 py-3 text-sm shadow-md flex items-center gap-2"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            Lưu Hồ sơ Giảng viên
          </Button>
        </div>
      </form>
    </main>
  );
}
