"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { type Partner } from "@/gen/partner/v1/partner_pb";
import { UserRole } from "@/gen/identity/v1/identity_pb";
import {
  usePartnersQuery,
  useUpdatePartnerMutation,
  useRotatePartnerKeyPairMutation,
  useUserProfileQuery,
} from "@/lib/query_hooks";
import { Button } from "@/components/ui/Button";

const emptySubscribe = () => () => {};

export interface Signatory {
  id: string;
  name: string;
  title: string;
  department: string;
  signatureImageUrl: string;
  isDefault: boolean;
}

function PartnerSettingsForm({
  activePartner,
  refetchPartners,
}: {
  activePartner: Partner;
  refetchPartners: () => void;
}) {
  const updateMutation = useUpdatePartnerMutation();
  const rotateKeyPairMutation = useRotatePartnerKeyPairMutation();

  // Form state initialized directly from activePartner prop
  const [name, setName] = useState(activePartner.name || "");
  const [slug, setSlug] = useState(activePartner.slug || "");
  const [description, setDescription] = useState(activePartner.description || "");
  const [logoUrl, setLogoUrl] = useState(activePartner.logoUrl || "");
  const [bannerUrl, setBannerUrl] = useState(activePartner.bannerUrl || "");
  const [websiteUrl, setWebsiteUrl] = useState(activePartner.websiteUrl || "");
  const [allowedDomainsStr, setAllowedDomainsStr] = useState(
    (activePartner.allowedDomains || []).join(", "),
  );
  const [signatureImageUrl, setSignatureImageUrl] = useState(activePartner.signatureImageUrl || "");
  const [signerName, setSignerName] = useState(activePartner.signerName || "");
  const [signerTitle, setSignerTitle] = useState(activePartner.signerTitle || "");
  const [publicKeyPem, setPublicKeyPem] = useState(activePartner.publicKeyPem || "");

  const [historicalPublicKeys, setHistoricalPublicKeys] = useState<string[]>(
    activePartner.historicalPublicKeys || [],
  );

  // Sync historical keys when activePartner prop updates from backend query refetch
  if (
    activePartner.historicalPublicKeys &&
    activePartner.historicalPublicKeys.length > historicalPublicKeys.length
  ) {
    setHistoricalPublicKeys(activePartner.historicalPublicKeys);
  }

  // Multi-Signers Management State
  const [signatories, setSignatories] = useState<Signatory[]>([
    {
      id: "sig-default",
      name: activePartner.signerName || "GS.TS. Nguyễn Văn A",
      title: activePartner.signerTitle || "Hiệu trưởng",
      department: "Ban Giám hiệu",
      signatureImageUrl: activePartner.signatureImageUrl || "",
      isDefault: true,
    },
    {
      id: "sig-cs",
      name: "TS. Trần Văn B",
      title: "Trưởng Khoa",
      department: "Khoa Khoa học & Kỹ thuật Máy tính",
      signatureImageUrl: activePartner.signatureImageUrl || "",
      isDefault: false,
    },
  ]);

  const [newSigName, setNewSigName] = useState("");
  const [newSigTitle, setNewSigTitle] = useState("");
  const [newSigDept, setNewSigDept] = useState("");
  const [newSigImage, setNewSigImage] = useState("");
  const [sigErrorMsg, setSigErrorMsg] = useState("");

  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleSetDefaultSignatory = (sig: Signatory) => {
    setSignatories((prev) =>
      prev.map((s) => ({
        ...s,
        isDefault: s.id === sig.id,
      })),
    );
    setSignerName(sig.name);
    setSignerTitle(sig.title);
    if (sig.signatureImageUrl) {
      setSignatureImageUrl(sig.signatureImageUrl);
    }
  };

  const handleAddSignatory = () => {
    setSigErrorMsg("");
    if (!newSigName.trim() || !newSigTitle.trim()) {
      setSigErrorMsg("Vui lòng nhập đầy đủ Họ tên và Chức danh người ký.");
      return;
    }

    const newSig: Signatory = {
      id: `sig-${Date.now()}`,
      name: newSigName.trim(),
      title: newSigTitle.trim(),
      department: newSigDept.trim() || "Chưa phân khoa",
      signatureImageUrl: newSigImage.trim() || signatureImageUrl,
      isDefault: signatories.length === 0,
    };

    setSignatories((prev) => [...prev, newSig]);
    if (newSig.isDefault) {
      setSignerName(newSig.name);
      setSignerTitle(newSig.title);
      if (newSig.signatureImageUrl) setSignatureImageUrl(newSig.signatureImageUrl);
    }

    setNewSigName("");
    setNewSigTitle("");
    setNewSigDept("");
    setNewSigImage("");
  };

  const handleRemoveSignatory = (id: string) => {
    const target = signatories.find((s) => s.id === id);
    if (target?.isDefault && signatories.length > 1) {
      setSigErrorMsg("Không thể gỡ người ký mặc định. Vui lòng chọn người ký mặc định khác trước.");
      return;
    }
    setSignatories((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const allowedDomains = allowedDomainsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await updateMutation.mutateAsync({
        id: activePartner.id,
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
      await refetchPartners();
      setStatusMessage({
        type: "success",
        text: "Cập nhật thông tin cấu hình đối tác thành công!",
      });
    } catch (err: unknown) {
      setStatusMessage({ type: "error", text: (err as Error).message || "Cập nhật thất bại" });
    }
  };

  const handleRotateKeyPair = async () => {
    if (!window.confirm("Xác nhận tạo cặp khóa ký số mới? Khóa cũ sẽ bị thay thế.")) return;
    setStatusMessage(null);

    try {
      const oldPem = publicKeyPem;
      const newPem = await rotateKeyPairMutation.mutateAsync({ partnerId: activePartner.id });
      if (oldPem && !historicalPublicKeys.includes(oldPem)) {
        setHistoricalPublicKeys((prev) => [...prev, oldPem]);
      }
      setPublicKeyPem(newPem);
      await refetchPartners();
      setStatusMessage({ type: "success", text: "Đã xoay & tạo cặp khóa ký số mới thành công!" });
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: (err as Error).message || "Tạo khóa ký số thất bại",
      });
    }
  };

  const handleCopyPublicKey = () => {
    if (!publicKeyPem) return;
    navigator.clipboard.writeText(publicKeyPem);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleDownloadOpenBadgesJson = () => {
    const issuerSchema = {
      "@context": "https://w3id.org/openbadges/v2",
      type: "Issuer",
      id: `${websiteUrl || "https://example.edu"}/openbadges-issuer.json`,
      name: name || activePartner.name,
      url: websiteUrl || "https://example.edu",
      description: description || "Tổ chức phát hành chứng chỉ số hợp lệ",
      image: logoUrl || "https://example.edu/logo.png",
      signer: {
        name: signerName || "",
        title: signerTitle || "",
      },
      signatories: signatories.map((s) => ({
        name: s.name,
        title: s.title,
        department: s.department,
      })),
      publicKey: [
        {
          id: `${websiteUrl || "https://example.edu"}/keys/active_key.json`,
          type: "CryptographicKey",
          owner: `${websiteUrl || "https://example.edu"}/openbadges-issuer.json`,
          publicKeyPem: publicKeyPem || "",
        },
        ...historicalPublicKeys.map((hPem, idx) => ({
          id: `${websiteUrl || "https://example.edu"}/keys/historical_key_${idx + 1}.json`,
          type: "CryptographicKey",
          owner: `${websiteUrl || "https://example.edu"}/openbadges-issuer.json`,
          publicKeyPem: hPem,
        })),
      ],
    };

    const jsonString = JSON.stringify(issuerSchema, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "openbadges-issuer.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
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

      <form onSubmit={handleUpdateProfile} className="mt-8 space-y-8">
        {/* Branding Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
            <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm mr-2.5 font-bold">
              1
            </span>
            Thông tin Nhãn hiệu & Tổ chức
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tên Đối tác
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Slug URL
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mô tả Giới thiệu
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                URL Logo Đối tác
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {logoUrl && (
                <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-3">
                  <Image
                    src={logoUrl}
                    alt="Logo Preview"
                    width={40}
                    height={40}
                    className="w-10 h-10 object-contain rounded-lg"
                    unoptimized
                  />
                  <span className="text-xs text-slate-500">Xem trước Logo</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                URL Banner Bìa
              </label>
              <input
                type="text"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {bannerUrl && (
                <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Image
                    src={bannerUrl}
                    alt="Banner Preview"
                    width={160}
                    height={48}
                    className="w-full h-12 object-cover rounded-lg"
                    unoptimized
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Website chính thức
              </label>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://hcmut.edu.vn"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Danh sách Tên miền Được phép Cấp chứng chỉ (Phân cách bởi dấu phẩy)
            </label>
            <input
              type="text"
              value={allowedDomainsStr}
              onChange={(e) => setAllowedDomainsStr(e.target.value)}
              placeholder="hcmut.edu.vn, vnuhcm.edu.vn"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Multi-Signers Management Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm mr-2.5 font-bold">
                  2
                </span>
                Quản lý Nhiều Người Ký (Multi-Signers Management)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Thiết lập danh sách Đại diện ký số cho các Khoa, Viện và Chuyên ngành khác nhau của
                trường.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-full border border-emerald-200 dark:border-emerald-800 w-fit">
              {signatories.length} Người ký
            </span>
          </div>

          {sigErrorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs rounded-xl">
              {sigErrorMsg}
            </div>
          )}

          {/* List of Signatories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {signatories.map((sig) => (
              <div
                key={sig.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  sig.isDefault
                    ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {sig.department}
                    </span>
                    {sig.isDefault ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-blue-600 text-white">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Mặc định
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultSignatory(sig)}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        Đặt làm Mặc định
                      </button>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{sig.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{sig.title}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  {sig.signatureImageUrl ? (
                    <div className="h-6 flex items-center">
                      <Image
                        src={sig.signatureImageUrl}
                        alt={sig.name}
                        width={60}
                        height={24}
                        className="h-6 object-contain"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Chưa có ảnh chữ ký</span>
                  )}
                  {!sig.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSignatory(sig.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Gỡ bỏ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add New Signatory Sub-form */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Thêm Người ký Đại diện mới
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                value={newSigName}
                onChange={(e) => setNewSigName(e.target.value)}
                placeholder="Họ tên người ký (VD: PGS.TS. Lê Văn C)"
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newSigTitle}
                onChange={(e) => setNewSigTitle(e.target.value)}
                placeholder="Chức danh (VD: Phó Hiệu trưởng)"
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newSigDept}
                onChange={(e) => setNewSigDept(e.target.value)}
                placeholder="Khoa / Chuyên ngành (VD: Khoa Điện - Điện tử)"
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newSigImage}
                onChange={(e) => setNewSigImage(e.target.value)}
                placeholder="URL Ảnh chữ ký (tùy chọn)"
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddSignatory}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Thêm Người ký
              </button>
            </div>
          </div>
        </div>

        {/* Digital Key Pair & OpenBadges Management */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm mr-2.5 font-bold">
                  3
                </span>
                Quản lý Khóa Ký số & OpenBadges
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Tạo cặp khóa ký RSA/ED25519 cho chứng chỉ số và tải file cấu hình Issuer cho website
                tổ chức.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={handleRotateKeyPair}
                isLoading={rotateKeyPairMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl text-xs px-4 py-2.5 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Tạo Cặp Khóa Ký số Mới (Rotate Key Pair)
              </Button>
              <Button
                type="button"
                onClick={handleDownloadOpenBadgesJson}
                variant="outline"
                className="font-medium rounded-xl text-xs px-4 py-2.5 border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
              >
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Tải xuống File Xác thực OpenBadges (openbadges-issuer.json)
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">
                Public Key PEM (Khóa Công khai Ký số Hiện tại)
              </label>
              {publicKeyPem && (
                <button
                  type="button"
                  onClick={handleCopyPublicKey}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
                >
                  {copiedKey ? (
                    <>
                      <svg
                        className="w-3.5 h-3.5 text-emerald-600"
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
                      <span>Đã sao chép!</span>
                    </>
                  ) : (
                    <>
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
                          d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                        />
                      </svg>
                      <span>Sao chép Public Key</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <textarea
              value={publicKeyPem}
              readOnly
              rows={4}
              placeholder="Chưa có Public Key PEM. Bấm nút 'Rotate Key Pair' để tạo mới."
              className="w-full px-4 py-3 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-4 pt-4">
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
            Lưu thay đổi Cấu hình Đối tác
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function PartnerSettingsPage() {
  const router = useRouter();

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const userId =
    isMounted && typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
  const { data: userProfile, isLoading: profileLoading } = useUserProfileQuery(userId);
  const isPartnerAdmin = userProfile?.role === UserRole.SUPER_ADMIN || Boolean(userProfile);

  const {
    data: partners = [],
    isLoading: partnersLoading,
    refetch: refetchPartners,
  } = usePartnersQuery();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const activePartner = partners.find((p) => p.id === selectedPartnerId) || partners[0];

  if (profileLoading || partnersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Đang tải cấu hình đối tác...</span>
        </div>
      </div>
    );
  }

  if (!isPartnerAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl text-center">
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Từ chối truy cập</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Trang này dành riêng cho Quản trị viên Tổ chức.
        </p>
        <Button onClick={() => router.push("/")} className="mt-4" variant="outline">
          Về trang chủ
        </Button>
      </div>
    );
  }

  if (partners.length === 0 || !activePartner) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center shadow-sm">
        <svg
          className="w-16 h-16 mx-auto text-slate-300 mb-4"
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
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Chưa tìm thấy hồ sơ Đối tác
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Tài khoản của bạn chưa gắn liền với thông tin đối tác nào. Vui lòng liên hệ Super Admin để
          khởi tạo hồ sơ đối tác.
        </p>
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Cấu hình Self-Service Tổ chức
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Quản lý thương hiệu phát hành, chữ ký số đại diện và thông tin xác thực OpenBadges cho
            tổ chức của bạn.
          </p>
        </div>
        {partners.length > 1 && (
          <select
            value={selectedPartnerId || activePartner.id}
            onChange={(e) => setSelectedPartnerId(e.target.value)}
            className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <PartnerSettingsForm
        key={activePartner.id}
        activePartner={activePartner}
        refetchPartners={refetchPartners}
      />
    </main>
  );
}
