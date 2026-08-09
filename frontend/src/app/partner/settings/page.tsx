"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { type Partner } from "@/gen/partner/v1/partner_pb";

import {
  usePartnersQuery,
  useUpdatePartnerMutation,
  useRotatePartnerKeyPairMutation,
} from "@/lib/query_hooks";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/AlertDialog";
import { useAuth } from "@/components/providers/AuthProvider";
import { Check, X, Plus, RefreshCw, Download, Copy, Building2 } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";

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

  const [showRotateConfirm, setShowRotateConfirm] = useState(false);

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

  const handleRotateKeyPair = () => {
    setShowRotateConfirm(true);
  };

  const executeRotateKeyPair = async () => {
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
    } finally {
      setShowRotateConfirm(false);
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
              ? "bg-success/10 text-success border-success/30"
              : "bg-destructive/10 text-destructive border-destructive/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <Check aria-hidden="true" className="w-5 h-5 text-success" />
            ) : (
              <X aria-hidden="true" className="w-5 h-5 text-destructive" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <IconButton
            type="button"
            variant="standard"
            size="xs"
            onClick={() => setStatusMessage(null)}
            className="opacity-70 hover:opacity-100"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </IconButton>
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="mt-8 space-y-8">
        {/* Branding Settings */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-foreground flex items-center">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm mr-2.5 font-bold">
              1
            </span>
            Thông tin Nhãn hiệu & Tổ chức
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Tên Đối tác"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Slug URL"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="font-mono"
              required
            />
          </div>

          <Textarea
            label="Mô tả Giới thiệu"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Input
                label="URL Logo Đối tác"
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              {logoUrl && (
                <div className="mt-2 p-2 bg-muted rounded-xl border border-border flex items-center space-x-3">
                  <Image
                    src={logoUrl}
                    alt="Logo Preview"
                    width={40}
                    height={40}
                    className="w-10 h-10 object-contain rounded-lg"
                    unoptimized
                  />
                  <span className="text-xs text-muted-foreground">Xem trước Logo</span>
                </div>
              )}
            </div>

            <div>
              <Input
                label="URL Banner Bìa"
                type="text"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://example.com/banner.jpg"
              />
              {bannerUrl && (
                <div className="mt-2 p-2 bg-muted rounded-xl border border-border">
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
              <Input
                label="Website chính thức"
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://hcmut.edu.vn"
              />
            </div>
          </div>

          <Input
            label="Danh sách Tên miền Được phép Cấp chứng chỉ (Phân cách bởi dấu phẩy)"
            type="text"
            value={allowedDomainsStr}
            onChange={(e) => setAllowedDomainsStr(e.target.value)}
            placeholder="hcmut.edu.vn, vnuhcm.edu.vn"
          />
        </div>

        {/* Multi-Signers Management Section */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center">
                <span className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center text-sm mr-2.5 font-bold">
                  2
                </span>
                Quản lý Nhiều Người Ký (Multi-Signers Management)
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Thiết lập danh sách Đại diện ký số cho các Khoa, Viện và Chuyên ngành khác nhau của
                trường.
              </p>
            </div>
            <Badge variant="success" className="w-fit">
              {signatories.length} Người ký
            </Badge>
          </div>

          {sigErrorMsg && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
              {sigErrorMsg}
            </div>
          )}

          {/* List of Signatories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {signatories.map((sig) => (
              <div
                key={sig.id}
                className={`p-4 rounded-xl border transition-colors flex flex-col justify-between ${
                  sig.isDefault
                    ? "bg-primary/10 border-primary/30 shadow-sm"
                    : "bg-muted border-border"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="default" className="text-[10px] uppercase">
                      {sig.department}
                    </Badge>
                    {sig.isDefault ? (
                      <Badge
                        variant="verified"
                        className="text-[10px] uppercase flex items-center gap-1"
                      >
                        <Check aria-hidden="true" className="w-3 h-3" />
                        Mặc định
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="text"
                        size="sm"
                        onClick={() => handleSetDefaultSignatory(sig)}
                        className="text-xs text-primary"
                      >
                        Đặt làm Mặc định
                      </Button>
                    )}
                  </div>
                  <h4 className="font-bold text-foreground text-sm">{sig.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{sig.title}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
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
                    <span className="text-[11px] text-muted-foreground italic">
                      Chưa có ảnh chữ ký
                    </span>
                  )}
                  {!sig.isDefault && (
                    <Button
                      type="button"
                      variant="text"
                      size="sm"
                      onClick={() => handleRemoveSignatory(sig.id)}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      Gỡ bỏ
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add New Signatory Sub-form */}
          <div className="p-4 bg-muted rounded-xl border border-border space-y-4">
            <h4 className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
              <Plus aria-hidden="true" className="w-4 h-4 text-success" />
              Thêm Người ký Đại diện mới
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input
                type="text"
                value={newSigName}
                onChange={(e) => setNewSigName(e.target.value)}
                placeholder="Họ tên người ký (VD: PGS.TS. Lê Văn C)"
              />
              <Input
                type="text"
                value={newSigTitle}
                onChange={(e) => setNewSigTitle(e.target.value)}
                placeholder="Chức danh (VD: Phó Hiệu trưởng)"
              />
              <Input
                type="text"
                value={newSigDept}
                onChange={(e) => setNewSigDept(e.target.value)}
                placeholder="Khoa / Chuyên ngành (VD: Khoa Điện - Điện tử)"
              />
              <Input
                type="text"
                value={newSigImage}
                onChange={(e) => setNewSigImage(e.target.value)}
                placeholder="URL Ảnh chữ ký (tùy chọn)"
              />
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={handleAddSignatory} variant="filled" size="sm">
                <Plus aria-hidden="true" className="w-3.5 h-3.5 mr-1" />
                Thêm Người ký
              </Button>
            </div>
          </div>
        </div>

        {/* Digital Key Pair & OpenBadges Management */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center">
                <span className="w-8 h-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center text-sm mr-2.5 font-bold">
                  3
                </span>
                Quản lý Khóa Ký số & OpenBadges
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Tạo cặp khóa ký RSA/ED25519 cho chứng chỉ số và tải file cấu hình Issuer cho website
                tổ chức.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={handleRotateKeyPair}
                disabled={rotateKeyPairMutation.isPending}
                variant="tonal"
                size="sm"
              >
                <RefreshCw aria-hidden="true" className="w-4 h-4 mr-1.5" />
                Tạo Cặp Khóa Ký số Mới (Rotate Key Pair)
              </Button>
              <Button
                type="button"
                onClick={handleDownloadOpenBadgesJson}
                variant="outlined"
                size="sm"
              >
                <Download aria-hidden="true" className="w-4 h-4 text-primary mr-1.5" />
                Tải xuống File Xác thực OpenBadges (openbadges-issuer.json)
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="publicKeyPem"
                className="block text-xs font-semibold uppercase text-muted-foreground"
              >
                Public Key PEM (Khóa Công khai Ký số Hiện tại)
              </label>
              {publicKeyPem && (
                <Button type="button" variant="text" size="sm" onClick={handleCopyPublicKey}>
                  {copiedKey ? (
                    <>
                      <Check aria-hidden="true" className="w-3.5 h-3.5 text-success mr-1" />
                      <span>Đã sao chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy aria-hidden="true" className="w-3.5 h-3.5 mr-1" />
                      <span>Sao chép Public Key</span>
                    </>
                  )}
                </Button>
              )}
            </div>
            <Textarea
              id="publicKeyPem"
              value={publicKeyPem}
              readOnly
              rows={4}
              placeholder="Chưa có Public Key PEM. Bấm nút 'Rotate Key Pair' để tạo mới."
              className="font-mono text-xs"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-4 pt-4">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-xl px-6 py-3 text-sm shadow-md flex items-center gap-2"
          >
            <Check aria-hidden="true" className="w-4 h-4" />
            Lưu thay đổi Cấu hình Đối tác
          </Button>
        </div>
      </form>

      <AlertDialog
        open={showRotateConfirm}
        onOpenChange={(open) => {
          if (!open) setShowRotateConfirm(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận tạo cặp khóa ký số mới</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn tạo cặp khóa ký số mới? Cặp khóa cũ sẽ bị xoay và thay thế.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outlined" onClick={() => setShowRotateConfirm(false)}>
              Hủy
            </Button>
            <Button
              variant="filled"
              className="bg-error text-on-error hover:bg-destructive-hover active:bg-destructive-active"
              onClick={executeRotateKeyPair}
              disabled={rotateKeyPairMutation.isPending}
            >
              Tạo khóa mới
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function PartnerSettingsPage() {
  const router = useRouter();

  const { isSuperAdmin } = useAuth();
  const isPartnerAdmin = isSuperAdmin;

  const {
    data: partners = [],
    isLoading: partnersLoading,
    refetch: refetchPartners,
  } = usePartnersQuery();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const activePartner = partners.find((p) => p.id === selectedPartnerId) || partners[0];

  if (partnersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span aria-live="polite">Đang tải cấu hình đối tác…</span>
        </div>
      </div>
    );
  }

  if (!isPartnerAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-destructive/10 border border-destructive/20 rounded-2xl text-center">
        <h2 className="text-xl font-bold text-destructive mb-2">Từ chối truy cập</h2>
        <p className="text-muted-foreground text-sm">
          Trang này dành riêng cho Quản trị viên Tổ chức.
        </p>
        <Button onClick={() => router.push("/")} className="mt-4" variant="outlined">
          Về trang chủ
        </Button>
      </div>
    );
  }

  if (partners.length === 0 || !activePartner) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-card border border-border rounded-2xl text-center shadow-sm">
        <Building2 aria-hidden="true" className="w-16 h-16 mx-auto text-muted-foreground/60 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Chưa tìm thấy hồ sơ Đối tác</h2>
        <p className="text-muted-foreground text-sm">
          Tài khoản của bạn chưa gắn liền với thông tin đối tác nào. Vui lòng liên hệ Super Admin để
          khởi tạo hồ sơ đối tác.
        </p>
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="pb-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight text-balance">
            Cấu hình Self-Service Tổ chức
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý thương hiệu phát hành, chữ ký số đại diện và thông tin xác thực OpenBadges cho
            tổ chức của bạn.
          </p>
        </div>
        {partners.length > 1 && (
          <Select
            value={selectedPartnerId || activePartner.id}
            onValueChange={(val) => {
              if (val) setSelectedPartnerId(val as string);
            }}
          >
            <SelectTrigger className="w-[200px] text-sm font-medium">
              <SelectValue placeholder="Chọn đối tác">
                {(() => {
                  const currentId = selectedPartnerId || activePartner.id;
                  const p = partners.find((item) => item.id === currentId);
                  return p ? p.name : currentId;
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {partners.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
