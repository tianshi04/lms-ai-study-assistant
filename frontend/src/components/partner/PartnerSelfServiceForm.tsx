"use client";

import { useState } from "react";
import Image from "next/image";
import { type Partner } from "@/gen/partner/v1/partner_pb";
import { useUpdatePartnerMutation, useRotatePartnerKeyPairMutation } from "@/lib/query_hooks";
import { mapConnectError } from "@/lib/connect_error_mapper";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { Input } from "@/components/ui/Input";
import { SignatureUploadField } from "@/components/ui/SignatureUploadField";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog } from "@/components/ui/Dialog";
import { Check, X, Plus, RefreshCw, Download, Copy, KeyRound } from "lucide-react";

export interface Signatory {
  id: string;
  name: string;
  title: string;
  department: string;
  signatureImageUrl: string;
  isDefault: boolean;
}

export interface PartnerSelfServiceFormProps {
  activePartner: Partner;
  refetchPartners: () => unknown;
  slugReadOnly?: boolean;
}

export function PartnerSelfServiceForm({
  activePartner,
  refetchPartners,
  slugReadOnly = false,
}: PartnerSelfServiceFormProps) {
  const updateMutation = useUpdatePartnerMutation();
  const rotateKeyPairMutation = useRotatePartnerKeyPairMutation();

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

  if (
    activePartner.historicalPublicKeys &&
    activePartner.historicalPublicKeys.length > historicalPublicKeys.length
  ) {
    setHistoricalPublicKeys(activePartner.historicalPublicKeys);
  }

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
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        logoUrl: logoUrl.trim(),
        bannerUrl: bannerUrl.trim(),
        websiteUrl: websiteUrl.trim(),
        allowedDomains,
        signatureImageUrl: signatureImageUrl.trim(),
        signerName: signerName.trim(),
        signerTitle: signerTitle.trim(),
        publicKeyPem,
      });
      await refetchPartners();
      setStatusMessage({
        type: "success",
        text: "Cập nhật thông tin cấu hình đối tác thành công!",
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: mapConnectError(err, "Cập nhật thất bại"),
      });
    }
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
        text: mapConnectError(err, "Tạo khóa ký số thất bại"),
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
    const baseOrigin = (websiteUrl || "https://example.edu").replace(/\/+$/, "");
    const issuerSchema = {
      "@context": "https://w3id.org/openbadges/v2",
      type: "Issuer",
      id: `${baseOrigin}/.well-known/openbadges-issuer.json`,
      name: name || activePartner.name,
      url: baseOrigin,
      description: description || "Tổ chức phát hành chứng chỉ số hợp lệ",
      image: logoUrl || `${baseOrigin}/logo.png`,
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
          id: `${baseOrigin}/keys/active_key.json`,
          type: "CryptographicKey",
          owner: `${baseOrigin}/.well-known/openbadges-issuer.json`,
          publicKeyPem: publicKeyPem || "",
        },
        ...historicalPublicKeys.map((hPem, idx) => ({
          id: `${baseOrigin}/keys/historical_key_${idx + 1}.json`,
          type: "CryptographicKey",
          owner: `${baseOrigin}/.well-known/openbadges-issuer.json`,
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

      <form onSubmit={handleUpdateProfile} className="mt-6 space-y-8">
        {/* 1. Branding Settings */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-6">
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
              autoComplete="organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Slug URL"
              type="text"
              value={slug}
              disabled={slugReadOnly}
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
              <label
                htmlFor="partnerLogoInput"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Logo Đối tác
              </label>
              <ImageUploadField
                id="partnerLogoInput"
                compact
                folder="public/logos"
                itemLabel="logo"
                value={logoUrl}
                onChange={setLogoUrl}
              />
              {logoUrl && (
                <div className="mt-2 p-2.5 bg-muted rounded-xl border border-border flex items-center gap-3">
                  <Image
                    src={logoUrl}
                    alt="Logo Preview"
                    width={140}
                    height={48}
                    className="h-12 w-auto max-w-[140px] object-contain rounded-lg"
                    unoptimized
                  />
                  <span className="text-xs text-muted-foreground">Xem trước Logo</span>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="partnerBannerInput"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Banner Bìa
              </label>
              <ImageUploadField
                id="partnerBannerInput"
                compact
                folder="public/banners"
                itemLabel="banner"
                value={bannerUrl}
                onChange={setBannerUrl}
              />
              {bannerUrl && (
                <div className="mt-2 p-2 bg-muted rounded-xl border border-border overflow-hidden">
                  <Image
                    src={bannerUrl}
                    alt="Banner Preview"
                    width={480}
                    height={160}
                    className="w-full aspect-[3/1] max-h-36 object-cover rounded-lg"
                    unoptimized
                  />
                </div>
              )}
            </div>

            <div>
              <Input
                label="Website chính thức"
                type="url"
                inputMode="url"
                autoComplete="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://hcmut.edu.vn"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Input
              label="Danh sách Tên miền Được phép Cấp chứng chỉ & Tự động gán Seat (Phân cách bởi dấu phẩy)"
              type="text"
              value={allowedDomainsStr}
              onChange={(e) => setAllowedDomainsStr(e.target.value)}
              placeholder="hcmut.edu.vn, vnuhcm.edu.vn"
            />
            <div className="flex flex-wrap gap-2">
              {allowedDomainsStr
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((domain) => (
                  <Chip
                    key={domain}
                    variant="input"
                    onRemove={() => {
                      const updated = allowedDomainsStr
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s && s !== domain)
                        .join(", ");
                      setAllowedDomainsStr(updated);
                    }}
                  >
                    {domain}
                  </Chip>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Học viên đăng ký bằng email thuộc tên miền này sẽ tự động được cấp thành viên và gán
              Suất học Doanh nghiệp nếu tổ chức còn hạn mức khả dụng.
            </p>
          </div>
        </div>

        {/* 2. Multi-Signers & Default Signer Management */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center">
              <span className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center text-sm mr-2.5 font-bold">
                2
              </span>
              Quản lý Chữ ký Đại diện & Nhiều Người Ký
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Thiết lập người ký mặc định và danh sách đại diện ký số cho các Khoa, Viện của tổ
              chức.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Họ tên Người ký Mặc định"
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="GS.TS. Nguyễn Văn A"
            />
            <Input
              label="Chức danh Người ký Mặc định"
              type="text"
              value={signerTitle}
              onChange={(e) => setSignerTitle(e.target.value)}
              placeholder="Hiệu trưởng"
            />
            <div>
              <label
                htmlFor="defaultSignatureUpload"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Ảnh chữ ký Mặc định
              </label>
              <SignatureUploadField
                id="defaultSignatureUpload"
                compact
                value={signatureImageUrl}
                onChange={setSignatureImageUrl}
              />
            </div>
          </div>

          {sigErrorMsg && (
            <p className="text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              {sigErrorMsg}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {signatories.map((sig) => (
              <div
                key={sig.id}
                className="p-4 rounded-xl border border-border bg-background flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-secondary-container text-on-secondary-container">
                      {sig.department}
                    </span>
                    {sig.isDefault ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-primary text-on-primary">
                        <Check aria-hidden="true" className="w-3 h-3" />
                        Mặc định
                      </span>
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
                  {!sig.isDefault ? (
                    <Button
                      type="button"
                      variant="text"
                      size="sm"
                      onClick={() => handleRemoveSignatory(sig.id)}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      Gỡ bỏ
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

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
              <SignatureUploadField compact value={newSigImage} onChange={setNewSigImage} />
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={handleAddSignatory} variant="filled" size="sm">
                <Plus aria-hidden="true" className="w-3.5 h-3.5 mr-1" />
                Thêm Người ký
              </Button>
            </div>
          </div>
        </div>

        {/* 3. Digital Key Pair & OpenBadges Management */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center">
                <span className="w-8 h-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center text-sm mr-2.5 font-bold">
                  3
                </span>
                Quản lý Khóa Ký số & OpenBadges
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Tạo cặp khóa ký ECDSA P-256 cho chứng chỉ số và tải file cấu hình Issuer cho website
                tổ chức ({historicalPublicKeys.length} khóa lịch sử được bảo lưu).
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => setShowRotateConfirm(true)}
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
        <div className="flex items-center justify-end space-x-4 pt-2">
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

      <Dialog.Root
        open={showRotateConfirm}
        onOpenChange={(open: boolean) => {
          if (!open) setShowRotateConfirm(false);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Icon icon={<KeyRound className="w-6 h-6 text-primary" aria-hidden="true" />} />
            <Dialog.Title>Xác nhận tạo cặp khóa ký số mới</Dialog.Title>
            <Dialog.Description>
              Bạn có chắc chắn muốn tạo cặp khóa ký số mới? Khóa cũ sẽ được lưu vào lịch sử
              `historical_public_keys` để các chứng chỉ đã cấp vẫn xác thực hợp lệ 100%.
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button variant="text" onClick={() => setShowRotateConfirm(false)}>
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
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
