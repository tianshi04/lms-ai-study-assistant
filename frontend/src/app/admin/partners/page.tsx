"use client";

import { useState } from "react";
import { Plus, Building2, Eye, Pencil, Trash2, PenTool, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { type Partner } from "@/gen/partner/v1/partner_pb";
import {
  usePartnersQuery,
  useCreatePartnerMutation,
  useUpdatePartnerMutation,
  useDeletePartnerMutation,
} from "@/lib/query_hooks";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/Breadcrumb";

interface PartnerAdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

import { useAuth } from "@/components/providers/AuthProvider";

export default function AdminPartnersPage() {
  const router = useRouter();
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin;

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

  // Organization Admins State (keyed by partnerId or slug)
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

  if (partnersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span aria-live="polite">Đang tải danh sách đối tác…</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-destructive/10 border border-destructive/30 rounded-2xl text-center">
        <h2 className="text-xl font-bold text-destructive mb-2">Từ chối truy cập</h2>
        <p className="text-muted-foreground text-sm">
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
      toast.success("Xóa đối tác thành công!");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Không thể xoá đối tác");
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border gap-4">
        <div>
          <Breadcrumb className="mb-1">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="cursor-pointer"
                  onClick={() => router.push("/admin/dashboard")}
                >
                  Trang quản trị
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Đối tác phát hành</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight text-balance">
            Quản lý Đối tác Phát hành
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý danh sách các trường đại học, viện nghiên cứu và doanh nghiệp phát hành chứng
            chỉ số.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-xl px-5 py-2.5 shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2 -ml-1" aria-hidden="true" />
          Thêm đối tác mới
        </Button>
      </div>

      {/* Partners List Table */}
      <div className="mt-8 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {partners.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Building2
              className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50"
              aria-hidden="true"
            />
            <p className="text-lg font-medium text-foreground">Chưa có đối tác nào được tạo</p>
            <p className="text-sm text-muted-foreground mt-1">
              Bấm nút &quot;Thêm đối tác mới&quot; để thiết lập đối tác phát hành chứng chỉ đầu
              tiên.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Đối tác</TableHead>
                <TableHead>Slug URL</TableHead>
                <TableHead>Tên miền xác thực</TableHead>
                <TableHead>Người ký đại diện</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-muted p-1 border border-border flex items-center justify-center overflow-hidden shrink-0">
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
                          <span className="font-bold text-primary text-sm">
                            {partner.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{partner.name}</p>
                        {partner.websiteUrl && (
                          <a
                            href={partner.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            {partner.websiteUrl}
                          </a>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    /partners/{partner.slug}
                  </TableCell>
                  <TableCell>
                    {partner.allowedDomains && partner.allowedDomains.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {partner.allowedDomains.map((domain, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-info/10 text-info border border-info/20"
                          >
                            {domain}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Chưa giới hạn</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground">{partner.signerName || "—"}</p>
                    <p className="text-xs text-muted-foreground">{partner.signerTitle}</p>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/partners/${partner.slug}`)}
                      title="Xem trang công khai"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      Xem
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(partner)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      Sửa
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeletingPartnerId(partner.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      Xoá
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="partnerName"
                className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
              >
                Tên đối tác / Trường học <span className="text-destructive">*</span>
              </label>
              <Input
                id="partnerName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Đại học Bách Khoa TP.HCM"
                required
              />
            </div>
            <div>
              <label
                htmlFor="partnerSlug"
                className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
              >
                Slug URL định danh <span className="text-destructive">*</span>
              </label>
              <Input
                id="partnerSlug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="VD: hcmut"
                className="font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="partnerDesc"
              className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
            >
              Mô tả giới thiệu
            </label>
            <Textarea
              id="partnerDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giới thiệu sơ lược về tổ chức đối tác…"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="partnerLogo"
                className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
              >
                URL Logo đối tác
              </label>
              <Input
                id="partnerLogo"
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div>
              <label
                htmlFor="partnerBanner"
                className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
              >
                URL Banner bìa
              </label>
              <Input
                id="partnerBanner"
                type="text"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://example.com/banner.jpg"
              />
            </div>
            <div>
              <label
                htmlFor="partnerWebsite"
                className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
              >
                Website chính thức
              </label>
              <Input
                id="partnerWebsite"
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://hcmut.edu.vn"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="partnerDomains"
              className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
            >
              Tên miền được phép cấp chứng chỉ (Phân cách bởi dấu phẩy)
            </label>
            <Input
              id="partnerDomains"
              type="text"
              value={allowedDomainsStr}
              onChange={(e) => setAllowedDomainsStr(e.target.value)}
              placeholder="hcmut.edu.vn, vnuhcm.edu.vn"
            />
          </div>

          {/* Section: Thông tin Người ký mặc định */}
          <div className="border-t border-border pt-4">
            <h3 className="text-xs font-bold uppercase text-foreground mb-3 flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-primary" aria-hidden="true" />
              Thông tin Người ký đại diện Mặc định
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="signerName"
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
                >
                  Họ tên người ký (signer_name)
                </label>
                <Input
                  id="signerName"
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="GS.TS. Nguyễn Văn A"
                />
              </div>
              <div>
                <label
                  htmlFor="signerTitle"
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
                >
                  Chức danh (signer_title)
                </label>
                <Input
                  id="signerTitle"
                  type="text"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  placeholder="Hiệu trưởng"
                />
              </div>
              <div>
                <label
                  htmlFor="signatureImg"
                  className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
                >
                  URL Ảnh chữ ký (signature_image_url)
                </label>
                <Input
                  id="signatureImg"
                  type="text"
                  value={signatureImageUrl}
                  onChange={(e) => setSignatureImageUrl(e.target.value)}
                  placeholder="https://example.com/signature.png"
                />
              </div>
            </div>
          </div>

          {/* Section: Quản lý Quản trị viên Tổ chức (Organization Admin) */}
          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" aria-hidden="true" />
              Quản trị viên Tổ chức (Organization Admin)
            </h3>

            {adminErrorMsg && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-lg">
                {adminErrorMsg}
              </div>
            )}

            {/* List of existing organization admins */}
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {currentPartnerAdmins.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Chưa gán Quản trị viên tổ chức nào.
                </p>
              ) : (
                currentPartnerAdmins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-2.5 bg-muted rounded-xl border border-border text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">{admin.name}</span>
                        <span className="text-muted-foreground ml-2 font-mono">
                          ({admin.email})
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => handleRemovePartnerAdmin(admin.id)}
                      className="text-destructive hover:bg-destructive/10"
                      aria-label="Gỡ Quản trị viên"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Add new organization admin inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
              <Input
                type="text"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="Tên quản trị viên"
                className="sm:col-span-2 text-xs"
              />
              <Input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="email@domain.edu.vn"
                className="sm:col-span-2 text-xs font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPartnerAdmin}
                className="sm:col-span-1 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Gán
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <label
              htmlFor="publicKeyPem"
              className="block text-xs font-semibold uppercase text-muted-foreground mb-1"
            >
              Public Key PEM (Khóa công khai ký số)
            </label>
            <Textarea
              id="publicKeyPem"
              value={publicKeyPem}
              onChange={(e) => setPublicKeyPem(e.target.value)}
              placeholder="-----BEGIN PUBLIC KEY-----…"
              spellCheck={false}
              rows={3}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-xl"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingPartner ? "Cập nhật đối tác" : "Thêm đối tác"}
            </Button>
          </div>
        </form>
      </Modal>

      <AlertDialog
        open={!!deletingPartnerId}
        onOpenChange={(open) => {
          if (!open) setDeletingPartnerId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xoá đối tác</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xoá đối tác này khỏi hệ thống? Thao tác này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeletingPartnerId(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={deleteMutation.isPending}
            >
              Xoá đối tác
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
