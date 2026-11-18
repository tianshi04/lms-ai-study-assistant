"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Building2,
  Eye,
  LayoutDashboard,
  Pencil,
  PenTool,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Progress } from "@/components/ui/Progress";
import { Surface } from "@/components/ui/Surface";
import { Table } from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { type Partner } from "@/gen/partner/v1/partner_pb";
import { mapConnectError } from "@/lib/connect_error_mapper";
import {
  useAddOrganizationMemberMutation,
  useCreatePartnerMutation,
  useDeletePartnerMutation,
  useOrganizationMembersQuery,
  usePartnersQuery,
  useRemoveOrganizationMemberMutation,
  useUpdatePartnerMutation,
} from "@/lib/query_hooks";

interface StagedPartnerAdmin {
  id: string;
  name: string;
  email: string;
}

import { useIsMobile } from "@/lib/hooks/useIsMobile";

function PartnerLogo({ logoUrl, name }: { logoUrl?: string; name: string }) {
  const [hasError, setHasError] = useState(false);

  if (logoUrl && !hasError) {
    return (
      <Image
        src={logoUrl}
        alt={name}
        width={36}
        height={36}
        className="object-contain max-h-full"
        unoptimized
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <span className="font-bold text-primary text-sm">{name.substring(0, 2).toUpperCase()}</span>
  );
}
export default function AdminPartnersPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
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
  const addMemberMutation = useAddOrganizationMemberMutation();
  const removeMemberMutation = useRemoveOrganizationMemberMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deletingPartnerId, setDeletingPartnerId] = useState<string | null>(null);

  const { data: orgMembers = [] } = useOrganizationMembersQuery(editingPartner?.id || "", {
    enabled: isModalOpen && Boolean(editingPartner?.id),
  });

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

  // Staged Organization Admins while creating a brand-new Partner
  const [stagedAdmins, setStagedAdmins] = useState<StagedPartnerAdmin[]>([]);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adminErrorMsg, setAdminErrorMsg] = useState("");

  if (partnersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-3 text-muted-foreground">
          <Progress.Circular size="sm" />
          <span aria-live="polite">Đang tải danh sách đối tác…</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Surface
        variant="low"
        shape="2xl"
        className="max-w-md mx-auto my-16 p-8 text-center bg-destructive/10 border-destructive/30"
      >
        <h2 className="text-xl font-bold text-destructive mb-2">Từ chối truy cập</h2>
        <p className="text-muted-foreground text-sm">
          Bạn cần quyền Quản trị viên hệ thống để truy cập trang quản trị đối tác.
        </p>
        <Button onClick={() => router.push("/")} className="mt-4" variant="outlined">
          Về trang chủ
        </Button>
      </Surface>
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
    setStagedAdmins([]);
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
    setStagedAdmins([]);
    setNewAdminName("");
    setNewAdminEmail("");
    setAdminErrorMsg("");
    setIsModalOpen(true);
  };

  const persistedOrgAdmins = orgMembers
    .filter((m) => {
      const roleVal = `${m.roleId} ${m.roleName}`.toUpperCase();
      return roleVal.includes("OWNER") || roleVal.includes("ADMIN");
    })
    .map((m) => ({
      id: m.userId,
      name: m.fullName || m.email,
      email: m.email,
    }));

  const currentPartnerAdmins = editingPartner ? persistedOrgAdmins : stagedAdmins;

  const handleAddPartnerAdmin = async () => {
    setAdminErrorMsg("");
    const cleanEmail = newAdminEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setAdminErrorMsg("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }

    if (editingPartner) {
      try {
        await addMemberMutation.mutateAsync({
          email: cleanEmail,
          roleId: "OWNER",
          organizationId: editingPartner.id,
        });
        toast.success(`Đã gán quyền Quản trị viên Tổ chức cho ${cleanEmail}.`);
        setNewAdminName("");
        setNewAdminEmail("");
      } catch (err) {
        setAdminErrorMsg(
          mapConnectError(
            err,
            "Không thể gán Quản trị viên Tổ chức (tài khoản email cần tồn tại trên hệ thống).",
          ),
        );
      }
      return;
    }

    setStagedAdmins((prev) => {
      if (prev.some((a) => a.email === cleanEmail)) return prev;
      return [
        ...prev,
        {
          id: `staged-${Date.now()}`,
          name: newAdminName.trim() || cleanEmail.split("@")[0],
          email: cleanEmail,
        },
      ];
    });
    setNewAdminName("");
    setNewAdminEmail("");
  };

  const handleRemovePartnerAdmin = async (adminId: string) => {
    setAdminErrorMsg("");
    if (editingPartner) {
      try {
        await removeMemberMutation.mutateAsync({
          userId: adminId,
          organizationId: editingPartner.id,
        });
        toast.success("Đã gỡ quyền Quản trị viên Tổ chức.");
      } catch (err) {
        setAdminErrorMsg(mapConnectError(err, "Không thể gỡ Quản trị viên Tổ chức."));
      }
      return;
    }
    setStagedAdmins((prev) => prev.filter((a) => a.id !== adminId));
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
        if (res?.id && stagedAdmins.length > 0) {
          for (const admin of stagedAdmins) {
            try {
              await addMemberMutation.mutateAsync({
                email: admin.email,
                roleId: "OWNER",
                organizationId: res.id,
              });
            } catch {
              toast.error(
                `Đã tạo đối tác nhưng chưa thể gán ${admin.email} (email chưa đăng ký tài khoản).`,
              );
            }
          }
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
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-w-0 overflow-x-hidden">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border gap-4">
        <div>
          <Breadcrumb className="mb-1">
            <Breadcrumb.List>
              <Breadcrumb.Item>
                <Breadcrumb.Link
                  className="cursor-pointer"
                  onClick={() => router.push("/admin/dashboard")}
                >
                  Trang quản trị
                </Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Page>Đối tác phát hành</Breadcrumb.Page>
              </Breadcrumb.Item>
            </Breadcrumb.List>
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
      <Surface variant="low" shape="2xl" className="mt-8 p-0 overflow-hidden">
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
        ) : isMobile ? (
          <div className="divide-y divide-border">
            {partners.map((partner) => (
              <div key={partner.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted p-1 border border-border flex items-center justify-center overflow-hidden shrink-0">
                    <PartnerLogo logoUrl={partner.logoUrl} name={partner.name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{partner.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      /partners/{partner.slug}
                    </p>
                    {partner.websiteUrl && (
                      <a
                        href={partner.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline break-all"
                      >
                        {partner.websiteUrl}
                      </a>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">Người ký:</span>{" "}
                    {partner.signerName || "—"}
                    {partner.signerTitle ? ` — ${partner.signerTitle}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {partner.allowedDomains && partner.allowedDomains.length > 0 ? (
                      partner.allowedDomains.map((domain, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-info/10 text-info border border-info/20"
                        >
                          {domain}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">Chưa giới hạn tên miền</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    variant="tonal"
                    size="sm"
                    onClick={() =>
                      router.push(`/organizations/${partner.slug || partner.id}/manage`)
                    }
                    title="Mở Bảng điều khiển Tổ chức"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    Bảng điều khiển
                  </Button>
                  <Button
                    variant="outlined"
                    size="sm"
                    onClick={() => router.push(`/partners/${partner.slug}`)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    Xem
                  </Button>
                  <Button variant="outlined" size="sm" onClick={() => handleOpenEdit(partner)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    Sửa
                  </Button>
                  <Button
                    variant="outlined"
                    className="bg-error/10 text-destructive border-destructive/30 hover:bg-destructive/20"
                    size="sm"
                    onClick={() => setDeletingPartnerId(partner.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    Xoá
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Đối tác</Table.Head>
                  <Table.Head>Slug URL</Table.Head>
                  <Table.Head>Tên miền xác thực</Table.Head>
                  <Table.Head>Người ký đại diện</Table.Head>
                  <Table.Head className="text-right">Thao tác</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {partners.map((partner) => (
                  <Table.Row key={partner.id}>
                    <Table.Cell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-muted p-1 border border-border flex items-center justify-center overflow-hidden shrink-0">
                          <PartnerLogo logoUrl={partner.logoUrl} name={partner.name} />
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
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground font-mono text-xs">
                      /partners/{partner.slug}
                    </Table.Cell>
                    <Table.Cell>
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
                    </Table.Cell>
                    <Table.Cell>
                      <p className="font-medium text-foreground">{partner.signerName || "—"}</p>
                      <p className="text-xs text-muted-foreground">{partner.signerTitle}</p>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <Button
                          variant="tonal"
                          size="sm"
                          onClick={() =>
                            router.push(`/organizations/${partner.slug || partner.id}/manage`)
                          }
                          title="Mở Bảng điều khiển Tổ chức"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                          Bảng điều khiển
                        </Button>
                        <Button
                          variant="outlined"
                          size="sm"
                          onClick={() => router.push(`/partners/${partner.slug}`)}
                          title="Xem trang công khai"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                          Xem
                        </Button>
                        <Button
                          variant="outlined"
                          size="sm"
                          onClick={() => handleOpenEdit(partner)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                          Sửa
                        </Button>
                        <Button
                          variant="outlined"
                          className="bg-error/10 text-destructive border-destructive/30 hover:bg-destructive/20"
                          size="sm"
                          onClick={() => setDeletingPartnerId(partner.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                          Xoá
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}
      </Surface>

      {/* Modal Thêm/Sửa Đối tác */}
      <Dialog open={isModalOpen} onOpenChange={(open) => setIsModalOpen(open)}>
        <Dialog.Content size="2xl" className="max-w-3xl p-0 overflow-hidden">
          <Dialog.Header className="px-6 pt-6 pb-4 pr-14 border-b border-border/70 shrink-0">
            <Dialog.Title className="text-xl font-bold">
              {editingPartner ? "Chỉnh sửa Đối tác Phát hành" : "Thêm Đối tác Phát hành Mới"}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-xs">
              {"Cấu hình hồ sơ thương hiệu, người ký chứng chỉ mặc định và quản trị viên tổ chức."}
            </Dialog.Description>
          </Dialog.Header>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
              {errorMsg && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl">
                  {errorMsg}
                </div>
              )}

              {/* Nhóm 1: Thông tin định danh & Thương hiệu */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <Input
                      id="partnerName"
                      label="Tên đối tác / Trường học *"
                      type="text"
                      autoComplete="organization"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="VD: Đại học Bách Khoa TP.HCM"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      id="partnerSlug"
                      label="Slug định danh *"
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="VD: hcmut"
                      className="font-mono"
                      required
                    />
                  </div>
                </div>

                <Textarea
                  id="partnerDesc"
                  label="Mô tả giới thiệu"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Giới thiệu sơ lược về tổ chức đối tác…"
                  rows={2}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    id="partnerWebsite"
                    label="Website chính thức"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://hcmut.edu.vn"
                  />
                  <Input
                    id="partnerLogo"
                    label="URL Logo đối tác"
                    type="url"
                    inputMode="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <Input
                  id="partnerBanner"
                  label="URL Banner bìa"
                  type="url"
                  inputMode="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                />

                <div>
                  <Input
                    id="partnerDomains"
                    label="Tên miền được phép cấp chứng chỉ"
                    helperText="Nhập nhiều tên miền phân cách bởi dấu phẩy."
                    type="text"
                    value={allowedDomainsStr}
                    onChange={(e) => setAllowedDomainsStr(e.target.value)}
                    placeholder="hcmut.edu.vn, vnuhcm.edu.vn"
                  />
                  {allowedDomainsStr.trim() && (
                    <div className="flex flex-wrap gap-2 pt-2.5">
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
                  )}
                </div>
              </div>

              {/* Nhóm 2: Thông tin Người ký mặc định */}
              <div className="rounded-2xl bg-background/60 border border-border/80 p-4 space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    Thông tin người ký đại diện mặc định
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hiển thị mặc định trên các chứng chỉ số do tổ chức phát hành.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    id="signerName"
                    label="Họ tên người ký"
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="VD: GS.TS. Nguyễn Văn A"
                  />
                  <Input
                    id="signerTitle"
                    label="Chức danh"
                    type="text"
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    placeholder="VD: Hiệu trưởng"
                  />
                </div>

                <Input
                  id="signatureImg"
                  label="URL ảnh chữ ký"
                  type="url"
                  inputMode="url"
                  value={signatureImageUrl}
                  onChange={(e) => setSignatureImageUrl(e.target.value)}
                  placeholder="https://example.com/signature.png"
                />
              </div>

              {/* Nhóm 3: Quản lý Quản trị viên Tổ chức (Organization Admin) */}
              <div className="rounded-2xl bg-background/60 border border-border/80 p-4 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    Quản trị viên tổ chức (Chủ sở hữu)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                    {currentPartnerAdmins.length} tài khoản
                  </span>
                </div>

                {adminErrorMsg && (
                  <div className="p-2.5 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl">
                    {adminErrorMsg}
                  </div>
                )}

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {currentPartnerAdmins.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-1">
                      Chưa gán Quản trị viên tổ chức nào.
                    </p>
                  ) : (
                    currentPartnerAdmins.map((admin) => (
                      <div
                        key={admin.id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-surface-container-low rounded-xl border border-border text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{admin.name}</p>
                            <p className="text-muted-foreground font-mono text-[11px] truncate">
                              {admin.email}
                            </p>
                          </div>
                        </div>
                        <IconButton
                          variant="standard"
                          size="xs"
                          type="button"
                          disabled={removeMemberMutation.isPending}
                          onClick={() => handleRemovePartnerAdmin(admin.id)}
                          className="text-destructive hover:bg-destructive/10 shrink-0"
                          aria-label="Gỡ Quản trị viên"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </IconButton>
                      </div>
                    ))
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.25fr_auto] items-end gap-3 pt-1">
                  <Input
                    id="newAdminName"
                    label="Tên hiển thị (tuỳ chọn)"
                    type="text"
                    value={newAdminName}
                    onChange={(e) => {
                      setNewAdminName(e.target.value);
                      if (adminErrorMsg) setAdminErrorMsg("");
                    }}
                    placeholder="VD: Ban Đào tạo"
                  />
                  <Input
                    id="newAdminEmail"
                    label="Email tài khoản"
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => {
                      setNewAdminEmail(e.target.value);
                      if (adminErrorMsg) setAdminErrorMsg("");
                    }}
                    placeholder="partner@domain.edu.vn"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="tonal"
                    size="sm"
                    disabled={addMemberMutation.isPending}
                    onClick={handleAddPartnerAdmin}
                    className="h-[42px] px-4 rounded-xl text-xs font-semibold shrink-0"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Gán quyền
                  </Button>
                </div>
              </div>

              {/* Nhóm 4: Public Key PEM */}
              <Textarea
                id="publicKeyPem"
                label="Khóa công khai ký số (Public Key PEM)"
                helperText="Dùng để xác thực chữ ký số chuẩn OpenBadges v2.0 trên chứng chỉ."
                value={publicKeyPem}
                onChange={(e) => setPublicKeyPem(e.target.value)}
                placeholder="-----BEGIN PUBLIC KEY-----…"
                spellCheck={false}
                rows={3}
                className="font-mono text-xs leading-relaxed"
              />
            </div>

            <Dialog.Footer className="px-6 py-4 mt-0 border-t border-border/70 bg-surface-container/50 shrink-0">
              <Button type="button" variant="text" onClick={() => setIsModalOpen(false)}>
                {"Hủy"}
              </Button>
              <Button
                type="submit"
                variant="filled"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingPartner ? "Cập nhật đối tác" : "Thêm đối tác"}
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog>

      <Dialog
        open={!!deletingPartnerId}
        onOpenChange={(open) => {
          if (!open) setDeletingPartnerId(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Icon icon={<Trash2 className="w-6 h-6 text-error" aria-hidden="true" />} />
            <Dialog.Title>Xác nhận xoá đối tác</Dialog.Title>
            <Dialog.Description>
              Bạn có chắc chắn muốn xoá đối tác này khỏi hệ thống? Thao tác này không thể hoàn tác.
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button variant="text" onClick={() => setDeletingPartnerId(null)}>
              Hủy
            </Button>
            <Button
              variant="filled"
              className="bg-error text-on-error hover:bg-destructive-hover active:bg-destructive-active"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              Xoá đối tác
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </main>
  );
}
