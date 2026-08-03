"use client";

import { useState } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { IdentityService } from "@/gen/identity/v1/identity_pb";
import { useUserProfileQuery } from "@/lib/query_hooks";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getAvatarDataUri } from "@/lib/avatar";

import { useAuth } from "@/components/providers/AuthProvider";
import { Check, Loader2, ShieldCheck, KeyRound, UserCheck, AlertCircle } from "lucide-react";

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
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <Loader2 className="animate-spin h-6 w-6 text-primary" aria-hidden="true" />
          <span aria-live="polite" className="text-sm font-bold">
            Đang tải hồ sơ…
          </span>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 w-full flex-1 bg-surface text-on-surface">
      <div className="rounded-3xl p-6 sm:p-8 bg-surface-container-low border border-outline-variant shadow-xs">
        {/* User Banner */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-outline-variant">
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
            className="w-24 h-24 rounded-full border-4 border-primary-container bg-surface-container-high shadow-xs object-cover"
          />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-on-surface mb-1 text-balance">
              {user?.fullName}
            </h1>
            <p className="text-sm font-medium text-on-surface-variant mb-3">{user?.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary-container border border-primary/20 text-on-primary-container text-xs font-bold shadow-xs">
                <UserCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>
                  Vai trò:{" "}
                  {user?.role === 1
                    ? "Learner (Học viên)"
                    : user?.role === 2
                      ? "Instructor (Giảng viên)"
                      : "TA / Admin"}
                </span>
              </span>

              {user?.isIdentityVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-success/15 border border-success/30 text-success text-xs font-bold shadow-xs">
                  <Check className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                  <span>Đã xác minh KYC</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-warning/15 border border-warning/30 text-warning text-xs font-bold shadow-xs">
                  <AlertCircle className="w-3.5 h-3.5 text-warning" aria-hidden="true" />
                  <span>Chưa xác minh KYC</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Identity Verification (KYC Mock) Section */}
        <div className="mt-8 pb-8 border-b border-outline-variant">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-on-surface mb-1 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
                <span>Xác minh Danh tính Sinh trắc học (KYC Verification)</span>
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {user?.isIdentityVerified
                  ? "Tài khoản của bạn đã hoàn tất xác minh danh tính CCCD/Hộ chiếu. Bạn đủ điều kiện nhận Chứng chỉ Verified Certificate."
                  : "Yêu cầu hoàn tất xác minh danh tính bằng CCCD/Hộ chiếu trước khi nhận Chứng chỉ Verified Certificate lần đầu tiên."}
              </p>
            </div>
            <div className="shrink-0">
              {user?.isIdentityVerified ? (
                <Button
                  disabled
                  variant="outline"
                  size="sm"
                  className="rounded-full bg-success/10 text-success border-success/20 font-bold cursor-default px-4"
                >
                  <Check className="w-4 h-4 mr-1.5 text-success" aria-hidden="true" />
                  <span>Đã xác minh</span>
                </Button>
              ) : (
                <Button
                  onClick={handleVerifyIdentity}
                  isLoading={verifyingIdentity}
                  variant="primary"
                  size="sm"
                  className="rounded-full px-6 py-2.5 bg-primary hover:bg-primary-hover text-on-primary font-bold shadow-xs hover:shadow-md transition-all"
                >
                  Giả lập Xác minh KYC (Mock Verification)
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Enterprise Seat Key Section */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-on-surface mb-2 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" aria-hidden="true" />
            <span>Suất học Doanh nghiệp / Đối tác (Enterprise License)</span>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
            Nhập mã kích hoạt (Enterprise Seat Key) được cấp bởi trường đại học hoặc doanh nghiệp để
            mở khóa 100% tài nguyên học tập trả phí.
          </p>

          <form
            onSubmit={handleAssignKey}
            className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
          >
            <Input
              type="text"
              value={enterpriseKey}
              onChange={(e) => setEnterpriseKey(e.target.value)}
              placeholder="Nhập mã Enterprise Key (ví dụ: ENT-UNI-2026-X99)"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 py-3 px-4 rounded-2xl text-sm font-mono bg-surface-container-lowest border border-outline-variant text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <Button
              type="submit"
              isLoading={savingKey}
              disabled={!enterpriseKey}
              variant="primary"
              size="md"
              className="rounded-full px-8 font-bold shadow-xs hover:shadow-md transition-all"
            >
              Kích hoạt mã
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
