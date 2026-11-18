"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

import { PartnerSelfServiceForm } from "@/components/partner/PartnerSelfServiceForm";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Select } from "@/components/ui/Select";
import { Surface } from "@/components/ui/Surface";
import { useMyOrganizationsQuery, usePartnersQuery } from "@/lib/query_hooks";

export default function PartnerSettingsPage() {
  const router = useRouter();
  const { isSuperAdmin } = useAuth();

  const { data: myOrgs = [], isLoading: myOrgsLoading } = useMyOrganizationsQuery();
  const {
    data: partners = [],
    isLoading: partnersLoading,
    refetch: refetchPartners,
  } = usePartnersQuery();

  const managedOrgs = myOrgs.filter((org) => {
    const roleUpper = (org.roleInOrg || "").toUpperCase();
    return roleUpper.includes("OWNER") || roleUpper.includes("ADMIN");
  });

  const isPartnerAdmin = isSuperAdmin || managedOrgs.length > 0;
  const visiblePartners = isSuperAdmin
    ? partners
    : partners.filter((p) =>
        managedOrgs.some((o) => o.id === p.id || o.slug === p.slug || o.id === p.slug),
      );

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const activePartner =
    visiblePartners.find((p) => p.id === selectedPartnerId) || visiblePartners[0];

  if (partnersLoading || (!isSuperAdmin && myOrgsLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-3 text-muted-foreground">
          <Progress.Circular size="sm" />
          <span aria-live="polite">Đang tải cấu hình đối tác…</span>
        </div>
      </div>
    );
  }

  if (!isPartnerAdmin) {
    return (
      <Surface
        variant="low"
        shape="2xl"
        className="max-w-md mx-auto my-16 p-8 text-center bg-destructive/10 border-destructive/20"
      >
        <h2 className="text-xl font-bold text-destructive mb-2">Từ chối truy cập</h2>
        <p className="text-muted-foreground text-sm">
          Trang này dành riêng cho Quản trị viên Tổ chức.
        </p>
        <Button onClick={() => router.push("/")} className="mt-4" variant="outlined">
          Về trang chủ
        </Button>
      </Surface>
    );
  }

  if (visiblePartners.length === 0 || !activePartner) {
    return (
      <Surface variant="low" shape="2xl" className="max-w-2xl mx-auto my-16 p-8 text-center">
        <Building2 aria-hidden="true" className="w-16 h-16 mx-auto text-muted-foreground/60 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Chưa tìm thấy hồ sơ Đối tác</h2>
        <p className="text-muted-foreground text-sm">
          Tài khoản của bạn chưa gắn liền với thông tin đối tác nào. Vui lòng liên hệ Quản trị viên
          hệ thống để khởi tạo hồ sơ đối tác.
        </p>
      </Surface>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
        {visiblePartners.length > 1 && (
          <Select
            value={selectedPartnerId || activePartner.id}
            onValueChange={(val) => {
              if (val) setSelectedPartnerId(val as string);
            }}
          >
            <Select.Trigger className="w-[220px] text-sm font-medium">
              <Select.Value placeholder="Chọn đối tác">
                {(() => {
                  const currentId = selectedPartnerId || activePartner.id;
                  const found = visiblePartners.find((item) => item.id === currentId);
                  return found ? found.name : currentId;
                })()}
              </Select.Value>
            </Select.Trigger>
            <Select.Content>
              {visiblePartners.map((p) => (
                <Select.Item key={p.id} value={p.id}>
                  {p.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        )}
      </div>

      <PartnerSelfServiceForm
        key={activePartner.id}
        activePartner={activePartner}
        refetchPartners={refetchPartners}
        slugReadOnly={!isSuperAdmin}
      />
    </main>
  );
}
