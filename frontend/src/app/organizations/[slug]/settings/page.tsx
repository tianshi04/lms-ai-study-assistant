"use client";

import { use, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  usePartnersQuery,
  useUpdatePartnerMutation,
  useMyOrganizationsQuery,
} from "@/lib/query_hooks";
import { mapConnectError } from "@/lib/connect_error_mapper";
import { OrgHeaderNav } from "../components/OrgHeaderNav";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Settings,
  Building2,
  Save,
  Loader2,
  Globe,
  Shield,
  ImageIcon,
  ShieldAlert,
} from "lucide-react";

function OrgSettingsContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { userRole, isSuperAdmin } = useAuth();
  const { data: myOrgs = [] } = useMyOrganizationsQuery();

  const currentOrg = myOrgs.find((o) => o.slug === slug || o.id === slug);
  const roleUpper = (currentOrg?.roleInOrg || "").toUpperCase();
  const isOwnerOrAdmin =
    isSuperAdmin ||
    userRole === "3" ||
    (userRole || "").toUpperCase().includes("ADMIN") ||
    roleUpper.includes("ADMIN") ||
    roleUpper.includes("OWNER");

  const { data: partners = [], isLoading, refetch } = usePartnersQuery();
  const partner = partners.find((p) => p.slug === slug || p.id === slug);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [allowedDomainsStr, setAllowedDomainsStr] = useState("");

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const orgName =
    partner?.name || (slug === "partner_community" ? "Coursera Project Network" : slug);

  if (!isOwnerOrAdmin) {
    return (
      <div className="w-full flex-1 bg-background min-h-screen">
        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          <OrgHeaderNav
            slug={slug}
            orgName={orgName}
            avatarUrl={partner?.logoUrl}
            activeTab="settings"
            isOwnerOrAdmin={false}
          />
          <Card variant="outlined" className="p-12 text-center space-y-4 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-foreground">Không có quyền quản trị</h3>
            <p className="text-xs text-muted-foreground">
              Bạn đang ở vai trò <strong>{currentOrg?.roleInOrg || "Giảng viên"}</strong>. Bạn không
              có quyền thay đổi thông tin cài đặt của Tổ chức này.
            </p>
            <Link
              href={`/organizations/${slug}/manage`}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs"
            >
              Quay lại Tổng quan
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  useEffect(() => {
    if (partner) {
      setName(partner.name || "");
      setDescription(partner.description || "");
      setLogoUrl(partner.logoUrl || "");
      setBannerUrl(partner.bannerUrl || "");
      setWebsiteUrl(partner.websiteUrl || "");
      setAllowedDomainsStr((partner.allowedDomains || []).join(", "));
    } else if (slug === "partner_community") {
      setName("Coursera Project Network");
      setDescription("Tổ chức Đối tác bảo chứng mặc định toàn sàn.");
    }
  }, [partner, slug]);

  const updateMutation = useUpdatePartnerMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        text: "Đã cập nhật thông tin Tổ chức thành công!",
      });
      refetch();
    },
    onError: (err) => {
      setFeedback({
        type: "error",
        text: mapConnectError(err, "Không thể cập nhật thông tin Tổ chức."),
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner?.id) {
      setFeedback({
        type: "error",
        text: "Không tìm thấy ID Tổ chức để cập nhật.",
      });
      return;
    }
    setFeedback(null);
    const allowedDomains = allowedDomainsStr
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    updateMutation.mutate({
      id: partner.id,
      name: name.trim(),
      slug,
      description: description.trim(),
      logoUrl: logoUrl.trim(),
      bannerUrl: bannerUrl.trim(),
      websiteUrl: websiteUrl.trim(),
      allowedDomains,
      signatureImageUrl: partner.signatureImageUrl || "",
      signerName: partner.signerName || "",
      signerTitle: partner.signerTitle || "",
      publicKeyPem: partner.publicKeyPem || "",
    });
  };

  return (
    <div className="w-full flex-1 bg-background min-h-screen">
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <OrgHeaderNav
          slug={slug}
          orgName={orgName}
          avatarUrl={partner?.logoUrl}
          activeTab="settings"
          isOwnerOrAdmin={isOwnerOrAdmin}
        />

        {/* Settings Form Container */}
        <Card variant="filled" className="p-6 sm:p-8 max-w-3xl">
          <div className="flex items-center space-x-3 pb-6 border-b border-border">
            <Settings className="w-6 h-6 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-bold text-foreground">Cài đặt & Thương hiệu Tổ chức</h2>
              <p className="text-xs text-muted-foreground">
                Cập nhật nhận diện thương hiệu, Logo, Website và Tên miền email bảo chứng
                (`allowed_domains`).
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 text-primary animate-spin" aria-hidden="true" />
              <p className="text-sm">Đang tải thông tin cài đặt...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 pt-6">
              {feedback && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold ${
                    feedback.type === "success"
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="orgNameInput"
                    className="text-xs font-bold text-foreground flex items-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    Tên Tổ chức / Partner
                  </label>
                  <Input
                    id="orgNameInput"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ví dụ: Đại học Bách Khoa TP.HCM"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="orgSlugInput" className="text-xs font-bold text-foreground">
                    Slug định danh (URL)
                  </label>
                  <Input
                    id="orgSlugInput"
                    type="text"
                    disabled
                    value={slug}
                    className="font-mono cursor-not-allowed opacity-70"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="orgWebsiteInput"
                    className="text-xs font-bold text-foreground flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    Website chính thức
                  </label>
                  <Input
                    id="orgWebsiteInput"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.edu.vn"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="orgLogoInput"
                    className="text-xs font-bold text-foreground flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    URL Logo Tổ chức
                  </label>
                  <Input
                    id="orgLogoInput"
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="orgBannerInput"
                    className="text-xs font-bold text-foreground flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    URL Ảnh Banner Tổ chức
                  </label>
                  <Input
                    id="orgBannerInput"
                    type="url"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://example.com/banner.png"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="orgDomainsInput"
                    className="text-xs font-bold text-foreground flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    Domain Email Bảo chứng (`allowed_domains`)
                  </label>
                  <Input
                    id="orgDomainsInput"
                    type="text"
                    value={allowedDomainsStr}
                    onChange={(e) => setAllowedDomainsStr(e.target.value)}
                    placeholder="hcmut.edu.vn, stanford.edu (phân cách bằng dấu phẩy)"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Các tài khoản có email thuộc domain này sẽ được tự động kích hoạt quyền thành
                    viên của Tổ chức.
                  </p>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="orgDescInput" className="text-xs font-bold text-foreground">
                    Mô tả về Tổ chức
                  </label>
                  <Textarea
                    id="orgDescInput"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Giới thiệu về trường đại học hoặc tổ chức đối tác..."
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-border flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending}>
                  <Save className="w-4.5 h-4.5" aria-hidden="true" />
                  Lưu Thay Đổi
                </Button>
              </div>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}

export default function OrgSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
          <span className="text-sm">Đang tải cài đặt tổ chức...</span>
        </div>
      }
    >
      <OrgSettingsContent params={params} />
    </Suspense>
  );
}
