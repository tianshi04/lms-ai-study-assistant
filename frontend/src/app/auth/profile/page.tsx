"use client";

import { useState } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { IdentityService } from "@/gen/identity/v1/identity_pb";
import { useUserProfileQuery } from "@/lib/query_hooks";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

import { getAvatarDataUri } from "@/lib/avatar";

import { useAuth } from "@/components/providers/AuthProvider";

export default function ProfilePage() {
  const { userId: authUserId } = useAuth();
  const userId = authUserId || "";
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: user, isLoading: loading } = useUserProfileQuery(userId);

  const [enterpriseKey, setEnterpriseKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  const handleAssignKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !enterpriseKey) return;

    setSavingKey(true);

    try {
      const client = getRpcClient(IdentityService);
      const res = await client.assignEnterpriseSeat({
        userId: user.id,
        enterpriseSeatKey: enterpriseKey,
      });

      if (res.success) {
        toast.success(res.message || "Kích hoạt suất học doanh nghiệp thành công!");
        queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
        setEnterpriseKey("");
      } else {
        toast.error(res.message || "Không thể kích hoạt mã này.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xảy ra lỗi khi kích hoạt.";
      toast.error(msg);
    } finally {
      setSavingKey(false);
    }
  };

  const [verifyingIdentity, setVerifyingIdentity] = useState(false);

  const handleVerifyIdentity = async () => {
    if (!user) return;
    setVerifyingIdentity(true);
    try {
      const client = getRpcClient(IdentityService);
      const res = await client.verifyIdentity({
        userId: user.id,
        idCardNumber: "012345678999",
      });
      if (res.success) {
        toast.success(res.message || "Giả lập xác minh danh tính KYC thành công!");
        queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      } else {
        toast.error(res.message || "Xác minh thất bại.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi xác minh danh tính.";
      toast.error(msg);
    } finally {
      setVerifyingIdentity(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
          <span aria-live="polite" className="text-sm font-medium">
            Đang tải hồ sơ…
          </span>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 w-full flex-1">
      <div className="bg-card border border-border rounded-3xl p-8 shadow-xl">
        {/* User Banner */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-border">
          <Image
            src={
              !user?.avatarUrl || user.avatarUrl.includes("api.dicebear.com")
                ? getAvatarDataUri(user?.email || "default")
                : user.avatarUrl
            }
            alt={user?.fullName || "User Avatar"}
            width={96}
            height={96}
            unoptimized
            className="w-24 h-24 rounded-full border-4 border-primary/20 shadow-inner bg-muted"
          />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-foreground mb-1 text-balance">
              {user?.fullName}
            </h1>
            <p className="text-sm text-muted-foreground mb-3">{user?.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-info/10 text-info border border-info/20">
                Vai trò:{" "}
                {user?.role === 1
                  ? "Learner (Học viên)"
                  : user?.role === 2
                    ? "Instructor (Giảng viên)"
                    : "TA / Admin"}
              </span>
              {user?.isIdentityVerified ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20">
                  <svg
                    className="w-3.5 h-3.5 text-success"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Đã xác minh KYC
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-warning/10 text-warning border border-warning/20">
                  Chưa xác minh KYC
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Identity Verification (KYC Mock) Section */}
        <div className="mt-8 pb-8 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">
                Xác minh Danh tính Sinh trắc học (KYC Verification)
              </h2>
              <p className="text-sm text-muted-foreground">
                {user?.isIdentityVerified
                  ? "Tài khoản của bạn đã hoàn tất xác minh danh tính CCCD/Hộ chiếu. Bạn đủ điều kiện cấp Verified Certificate."
                  : "Yêu cầu hoàn tất xác minh danh tính bằng CCCD/Hộ chiếu trước khi nhận Chứng chỉ Verified Certificate lần đầu tiên."}
              </p>
            </div>
            <div>
              {user?.isIdentityVerified ? (
                <Button
                  disabled
                  variant="outline"
                  size="sm"
                  className="bg-success/10 text-success border-success/20 cursor-default"
                >
                  Đã xác minh
                </Button>
              ) : (
                <Button
                  onClick={handleVerifyIdentity}
                  isLoading={verifyingIdentity}
                  variant="primary"
                  size="sm"
                  className="bg-success hover:bg-success-hover text-success-foreground border-none shadow-md"
                >
                  Giả lập Xác minh KYC (Mock Verification)
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Enterprise Seat Key Section */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-foreground mb-2">
            Suất học Doanh nghiệp / Đối tác (Enterprise License)
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Nhập mã kích hoạt (Enterprise Seat Key) được cấp bởi trường đại học hoặc doanh nghiệp để
            mở khóa 100% tài nguyên học tập trả phí.
          </p>

          <form onSubmit={handleAssignKey} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={enterpriseKey}
              onChange={(e) => setEnterpriseKey(e.target.value)}
              placeholder="Nhập mã Enterprise Key (ví dụ: ENT-UNI-2026-X99)"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 px-4 py-3 rounded-xl border border-input bg-muted text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors text-sm font-mono"
            />
            <Button
              type="submit"
              isLoading={savingKey}
              disabled={!enterpriseKey}
              variant="primary"
              size="md"
            >
              Kích hoạt mã
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
