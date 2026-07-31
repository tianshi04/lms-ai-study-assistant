"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { type Partner } from "@/gen/partner/v1/partner_pb";
import { UserRole } from "@/gen/identity/v1/identity_pb";
import {
  usePartnersQuery,
  useCreatePartnerMutation,
  useUpdatePartnerMutation,
  useDeletePartnerMutation,
  useUserProfileQuery,
} from "@/lib/query_hooks";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface PartnerAdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const emptySubscribe = () => () => {};

export default function AdminPartnersPage() {
  const router = useRouter();

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const userId =
    isMounted && typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
  const { data: userProfile, isLoading: profileLoading } = useUserProfileQuery(userId);
  const isAdmin = userProfile?.role === UserRole.SUPER_ADMIN;

  const {
    data: partners = [],
    isLoading: partnersLoading,
    refetch: refetchPartners,
  } = usePartnersQuery();
  const createMutation = useCreatePartnerMutation();
  const updateMutation = useUpdatePartnerMutation();
  const deleteMutation = useDeletePartnerMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deletingPartnerId, setDeletingPartnerId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [allowedDomainsStr, setAllowedDomainsStr] = useState("");
  const [signatureImageUrl, setSignatureImageUrl] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [publicKeyPem, setPublicKeyPem] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Partner Admins State (keyed by partnerId or slug)
  const [partnerAdminsMap, setPartnerAdminsMap] = useState<Record<string, PartnerAdminUser[]>>({
    "partner-stanford": [
      { id: "pa-1", name: "Stanford Admin", email: "admin@stanford.edu", createdAt: "2026-01-15" },
    ],
    "partner-hcmut": [
      { id: "pa-2", name: "HCMUT Admin", email: "admin@hcmut.edu.vn", createdAt: "2026-02-10" },
    ],
  });

  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adminErrorMsg, setAdminErrorMsg] = useState("");

  if (profileLoading || partnersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Đang tải danh sách đối tác...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl text-center">
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Từ chối truy cập</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Bạn cần quyền Super Admin để truy cập trang quản trị đối tác.
        </p>
        <Button onClick={() => router.push("/")} className="mt-4" variant="outline">
          Về trang chủ
        </Button>
      </div>
    );
  }

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setLogoUrl("");
    setBannerUrl("");
    setWebsiteUrl("");
    setAllowedDomainsStr("");
    setSignatureImageUrl("");
    setSignerName("");
    setSignerTitle("");
    setPublicKeyPem("");
    setErrorMsg("");
    setNewAdminName("");
    setNewAdminEmail("");
    setAdminErrorMsg("");
  };

  const handleOpenCreate = () => {
    setEditingPartner(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setName(partner.name || "");
    setSlug(partner.slug || "");
    setDescription(partner.description || "");
    setLogoUrl(partner.logoUrl || "");
    setBannerUrl(partner.bannerUrl || "");
    setWebsiteUrl(partner.websiteUrl || "");
    setAllowedDomainsStr((partner.allowedDomains || []).join(", "));
    setSignatureImageUrl(partner.signatureImageUrl || "");
    setSignerName(partner.signerName || "");
    setSignerTitle(partner.signerTitle || "");
    setPublicKeyPem(partner.publicKeyPem || "");
    setErrorMsg("");
    setNewAdminName("");
    setNewAdminEmail("");
    setAdminErrorMsg("");
    setIsModalOpen(true);
  };

  const activeKey = editingPartner?.id || editingPartner?.slug || "temp-new-partner";
  const currentPartnerAdmins = partnerAdminsMap[activeKey] || [];

  const handleAddPartnerAdmin = () => {
    setAdminErrorMsg("");
    if (!newAdminEmail.trim() || !newAdminEmail.includes("@")) {
      setAdminErrorMsg("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }

    const emailDomain = newAdminEmail.split("@")[1]?.toLowerCase();
    const allowedDomains = allowedDomainsStr
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (allowedDomains.length > 0 && !allowedDomains.includes(emailDomain)) {
      setAdminErrorMsg(
        `Email domain (${emailDomain}) không thuộc danh sách Tên miền được phép: ${allowedDomains.join(", ")}`,
      );
      return;
    }

    const newAdminObj: PartnerAdminUser = {
      id: `pa-${Date.now()}`,
      name: newAdminName.trim() || newAdminEmail.split("@")[0],
      email: newAdminEmail.trim(),
      createdAt: new Date().toISOString().split("T")[0],
    };

    setPartnerAdminsMap((prev) => ({
      ...prev,
      [activeKey]: [...(prev[activeKey] || []), newAdminObj],
    }));

    setNewAdminName("");
    setNewAdminEmail("");
  };

  const handleRemovePartnerAdmin = (adminId: string) => {
    setPartnerAdminsMap((prev) => ({
      ...prev,
      [activeKey]: (prev[activeKey] || []).filter((a) => a.id !== adminId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const allowedDomains = allowedDomainsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingPartner) {
        await updateMutation.mutateAsync({
          id: editingPartner.id,
          name,
          slug,
          description,
          logoUrl,
          bannerUrl,
          websiteUrl,
          allowedDomains,
          signatureImageUrl,
          signerName,
          signerTitle,
          publicKeyPem,
        });
      } else {
        const res = await createMutation.mutateAsync({
          name,
          slug,
          description,
          logoUrl,
          bannerUrl,
          websiteUrl,
          allowedDomains,
          signatureImageUrl,
          signerName,
          signerTitle,
          publicKeyPem,
        });
        if (res?.id && partnerAdminsMap["temp-new-partner"]) {
          setPartnerAdminsMap((prev) => {
            const temp = [...(prev["temp-new-partner"] || [])];
            const updated = { ...prev, [res.id]: temp };
            delete updated["temp-new-partner"];
            return updated;
          });
        }
      }
      await refetchPartners();
      setIsModalOpen(false);
      resetForm();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Đã xảy ra lỗi khi lưu thông tin đối tác");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPartnerId) return;
    try {
      await deleteMutation.mutateAsync({ id: deletingPartnerId });
      await refetchPartners();
      setDeletingPartnerId(null);
    } catch (err: unknown) {
      alert((err as Error).message || "Không thể xoá đối tác");
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="hover:text-blue-600 transition-colors"
            >
              Trang quản trị
            </button>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">
              Đối tác phát hành
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Quản lý Đối tác Phát hành
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Quản lý danh sách các trường đại học, viện nghiên cứu và doanh nghiệp phát hành chứng
            chỉ số.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-5 py-2.5 shadow-sm"
        >
          <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm đối tác mới
        </Button>
      </div>

      {/* Partners List Table */}
      <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {partners.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <svg
              className="w-12 h-12 mx-auto text-slate-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
              Chưa có đối tác nào được tạo
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Bấm nút &quot;Thêm đối tác mới&quot; để thiết lập đối tác phát hành chứng chỉ đầu
              tiên.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-xs">
                  <th className="py-4 px-6 font-semibold">Đối tác</th>
                  <th className="py-4 px-6 font-semibold">Slug URL</th>
                  <th className="py-4 px-6 font-semibold">Tên miền xác thực</th>
                  <th className="py-4 px-6 font-semibold">Người ký đại diện</th>
                  <th className="py-4 px-6 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {partners.map((partner) => (
                  <tr
                    key={partner.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                          {partner.logoUrl ? (
                            <Image
                              src={partner.logoUrl}
                              alt={partner.name}
                              width={36}
                              height={36}
                              className="object-contain max-h-full"
                              unoptimized
                            />
                          ) : (
                            <span className="font-bold text-blue-600 text-sm">
                              {partner.name.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {partner.name}
                          </p>
                          {partner.websiteUrl && (
                            <a
                              href={partner.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {partner.websiteUrl}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400 font-mono text-xs">
                      /partners/{partner.slug}
                    </td>
                    <td className="py-4 px-6">
                      {partner.allowedDomains && partner.allowedDomains.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {partner.allowedDomains.map((domain, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                            >
                              {domain}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Chưa giới hạn</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {partner.signerName || "—"}
                      </p>
                      <p className="text-xs text-slate-500">{partner.signerTitle}</p>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => router.push(`/partners/${partner.slug}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                        title="Xem trang công khai"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        <span>Xem</span>
                      </button>
                      <button
                        onClick={() => handleOpenEdit(partner)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <span>Sửa</span>
                      </button>
                      <button
                        onClick={() => setDeletingPartnerId(partner.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 hover:bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        <span>Xoá</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Thêm/Sửa Đối tác */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPartner ? "Chỉnh sửa Đối tác Phát hành" : "Thêm Đối tác Phát hành Mới"}
        description="Điền thông tin tổ chức, người ký mặc định và gán quản trị viên đối tác."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-sm rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Tên đối tác / Trường học <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Đại học Bách Khoa TP.HCM"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Slug URL định danh <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="VD: hcmut"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
              Mô tả giới thiệu
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giới thiệu sơ lược về tổ chức đối tác..."
              rows={2}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                URL Logo đối tác
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                URL Banner bìa
              </label>
              <input
                type="text"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Website chính thức
              </label>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://hcmut.edu.vn"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
              Tên miền được phép cấp chứng chỉ (Phân cách bởi dấu phẩy)
            </label>
            <input
              type="text"
              value={allowedDomainsStr}
              onChange={(e) => setAllowedDomainsStr(e.target.value)}
              placeholder="hcmut.edu.vn, vnuhcm.edu.vn"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Section: Thông tin Người ký mặc định */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Thông tin Người ký đại diện Mặc định
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Họ tên người ký (signer_name)
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="GS.TS. Nguyễn Văn A"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Chức danh (signer_title)
                </label>
                <input
                  type="text"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  placeholder="Hiệu trưởng"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  URL Ảnh chữ ký (signature_image_url)
                </label>
                <input
                  type="text"
                  value={signatureImageUrl}
                  onChange={(e) => setSignatureImageUrl(e.target.value)}
                  placeholder="https://example.com/signature.png"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Quản lý Quản trị viên Tổ chức (Organization Admin) */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Quản trị viên Tổ chức (Organization Admin)
            </h3>

            {adminErrorMsg && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs rounded-lg">
                {adminErrorMsg}
              </div>
            )}

            {/* List of existing partner admins */}
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {currentPartnerAdmins.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Chưa gán Quản trị viên đối tác nào.</p>
              ) : (
                currentPartnerAdmins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-[10px]">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {admin.name}
                        </span>
                        <span className="text-slate-400 ml-2 font-mono">({admin.email})</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePartnerAdmin(admin.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Gỡ Quản trị viên"
                    >
                      <svg
                        className="w-4 h-4"
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
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add new partner admin inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
              <input
                type="text"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="Tên quản trị viên"
                className="sm:col-span-2 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="email@domain.edu.vn"
                className="sm:col-span-2 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleAddPartnerAdmin}
                className="sm:col-span-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold py-1.5 px-3 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Gán
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
              Public Key PEM (Khóa công khai ký số)
            </label>
            <textarea
              value={publicKeyPem}
              onChange={(e) => setPublicKeyPem(e.target.value)}
              placeholder="-----BEGIN PUBLIC KEY-----..."
              rows={3}
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingPartner ? "Cập nhật đối tác" : "Thêm đối tác"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog Xoá Đối tác */}
      <ConfirmDialog
        isOpen={!!deletingPartnerId}
        onClose={() => setDeletingPartnerId(null)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xoá đối tác"
        description="Bạn có chắc chắn muốn xoá đối tác này khỏi hệ thống? Thao tác này không thể hoàn tác."
        confirmText="Xoá đối tác"
        cancelText="Hủy"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </main>
  );
}
