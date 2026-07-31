"use client";

import { useState, useSyncExternalStore, useEffect } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { IdentityService } from "@/gen/identity/v1/identity_pb";
import { useUserProfileQuery } from "@/lib/query_hooks";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";

import { getAvatarDataUri } from "@/lib/avatar";

const emptySubscribe = () => () => {};

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const userId =
    isMounted && typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
  const { data: user, isLoading: loading } = useUserProfileQuery(userId);
  const { setAuth, userName, userEmail, userRole, userAvatar } = useAuth();

  // Tự động đồng bộ Header (AuthContext) nếu dữ liệu API khác với dữ liệu đang lưu trong localStorage
  useEffect(() => {
    if (user && (user.fullName !== userName || user.avatarUrl !== userAvatar)) {
      if (user.fullName) localStorage.setItem("user_name", user.fullName);
      if (user.avatarUrl) localStorage.setItem("user_avatar", user.avatarUrl);
      
      setAuth({ 
        userName: user.fullName || userName, 
        userEmail: user.email || userEmail, 
        userRole: userRole,
        userAvatar: user.avatarUrl || userAvatar
      });
    }
  }, [user, userName, setAuth, userEmail, userRole, userAvatar]);

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

  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const handleEditProfile = () => {
    setEditFullName(user?.fullName || "");
    setEditAvatarUrl(user?.avatarUrl || "");
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const client = getRpcClient(IdentityService);
      const res = await client.updateUserProfile({
        fullName: editFullName,
        avatarUrl: editAvatarUrl,
      });
      if (res.user) {
        toast.success("Cập nhật hồ sơ thành công!");
        queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
        localStorage.setItem("user_name", editFullName);
        if (editAvatarUrl) {
          localStorage.setItem("user_avatar", editAvatarUrl);
        } else {
          localStorage.removeItem("user_avatar");
        }
        setAuth({ userName: editFullName, userEmail, userRole, userAvatar: editAvatarUrl });
        setIsEditing(false);
      } else {
        toast.error("Cập nhật thất bại.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xảy ra lỗi khi cập nhật hồ sơ.";
      toast.error(msg);
    } finally {
      setSavingProfile(false);
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
          <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
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
          <span className="text-sm font-medium">Đang tải hồ sơ...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 w-full flex-1">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
        {/* User Banner */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="w-full">
              <div className="flex flex-col gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Họ tên</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">URL Ảnh đại diện</label>
                  <input
                    type="url"
                    value={editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" isLoading={savingProfile}>
                  Lưu thay đổi
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Hủy
                </Button>
              </div>
            </form>
          ) : (
            <>
              <Image
                src={(!user?.avatarUrl || user.avatarUrl.includes("api.dicebear.com")) ? getAvatarDataUri(user?.email || "default") : user.avatarUrl}
                alt={user?.fullName || "User Avatar"}
                width={96}
                height={96}
                unoptimized
                className="w-24 h-24 rounded-full border-4 border-blue-500/20 shadow-inner bg-slate-100 dark:bg-slate-800"
              />
              <div className="text-center sm:text-left flex-1">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{user?.fullName}</h1>
                  <Button variant="outline" size="sm" onClick={handleEditProfile}>
                    Chỉnh sửa hồ sơ
                  </Button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{user?.email}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                    Vai trò: {user?.role === 1 ? "Learner (Học viên)" : user?.role === 2 ? "Instructor (Giảng viên)" : "TA / Admin"}
                  </span>
                  {user?.isIdentityVerified ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                      <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      Đã xác minh KYC
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                      Chưa xác minh KYC
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Identity Verification (KYC Mock) Section */}
        <div className="mt-8 pb-8 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Xác minh Danh tính Sinh trắc học (KYC Verification)
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
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
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 cursor-default"
                >
                  Đã xác minh
                </Button>
              ) : (
                <Button
                  onClick={handleVerifyIdentity}
                  isLoading={verifyingIdentity}
                  variant="primary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 border-none shadow-md shadow-emerald-500/20"
                >
                  Giả lập Xác minh KYC (Mock Verification)
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Enterprise Seat Key Section */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Suất học Doanh nghiệp / Đối tác (Enterprise License)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Nhập mã kích hoạt (Enterprise Seat Key) được cấp bởi trường đại học hoặc doanh nghiệp để
            mở khóa 100% tài nguyên học tập trả phí.
          </p>

          <form onSubmit={handleAssignKey} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={enterpriseKey}
              onChange={(e) => setEnterpriseKey(e.target.value)}
              placeholder="Nhập mã Enterprise Key (ví dụ: ENT-UNI-2026-X99)"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-mono"
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
