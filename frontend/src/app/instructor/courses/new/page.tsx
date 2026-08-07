"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { IdentityService } from "@/gen/identity/v1/identity_pb";
import { PartnerService, type Partner } from "@/gen/partner/v1/partner_pb";
import { useToast } from "@/components/ui/Toast";
import { revalidateCoursesCache } from "@/app/actions/revalidate";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";

const emptySubscribe = () => () => {};

export default function NewCoursePage() {
  const router = useRouter();
  const toast = useToast();
  const _isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // User details
  const [userName, setUserName] = useState("Giảng viên Cá nhân");
  const [userTitle, setUserTitle] = useState("AI Specialist");
  const [userAvatar, setUserAvatar] = useState(
    "https://api.dicebear.com/7.x/avataaars/svg?seed=instructor",
  );
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("partner_community");
  const [subject, setSubject] = useState("Khoa học Máy tính");
  const [level, setLevel] = useState("Sơ cấp");
  const [financialAidEnabled, setFinancialAidEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadUserData() {
      try {
        const idClient = getRpcClient(IdentityService);
        const userRes = await idClient.getUserProfile({});
        if (!ignore && userRes.user) {
          if (userRes.user.fullName) setUserName(userRes.user.fullName);
          if (userRes.user.title) setUserTitle(userRes.user.title);
          if (userRes.user.avatarUrl) setUserAvatar(userRes.user.avatarUrl);
        }

        // Fetch partners
        const partnerClient = getRpcClient(PartnerService);
        const partnersRes = await partnerClient.listPartners({});
        if (!ignore) {
          setPartners(partnersRes.partners || []);
          setLoadingOrgs(false);
        }
      } catch (err) {
        console.warn("Using default organization setup:", err);
        if (!ignore) setLoadingOrgs(false);
      }
    }
    loadUserData();
    return () => {
      ignore = true;
    };
  }, []);

  // Auto generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    const generatedSlug = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    setSlug(generatedSlug);
  };

  const selectedPartner = partners.find((p) => p.id === selectedOrgId);
  const partnerDisplayName = selectedPartner ? selectedPartner.name : "Coursera Project Network";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Vui lòng nhập Tiêu đề khóa học.");
      return;
    }
    if (!slug.trim()) {
      toast.error("Vui lòng nhập Slug khóa học.");
      return;
    }

    try {
      setSubmitting(true);
      const catalogClient = getRpcClient(CatalogService);
      const res = await catalogClient.createCourse({
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim(),
        partnerName: partnerDisplayName,
        partnerLogoUrl: selectedPartner?.logoUrl || "",
        instructorNames: [userName],
        subject,
        level,
        financialAidEnabled,
        organizationId: selectedOrgId,
      });

      toast.success("Khởi tạo khóa học mới thành công!");
      await revalidateCoursesCache(res.course?.id);
      if (res.course?.id) {
        router.push(`/instructor/courses/${res.course.id}`);
      } else {
        router.push("/instructor/courses");
      }
    } catch (err: unknown) {
      console.error("Create course failed:", err);
      const msg = err instanceof Error ? err.message : "Khởi tạo khóa học thất bại.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Breadcrumbs & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/instructor/courses" className="hover:underline">
                Giao diện Giảng viên
              </Link>
              <span>/</span>
              <span className="font-semibold text-foreground">Soạn khóa học mới</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight text-balance">
              Khởi Tạo Khóa Học Mới
            </h1>
          </div>

          <Link
            href="/instructor/courses"
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            ← Quay lại Danh sách
          </Link>
        </div>

        {/* Live Preview Card */}
        <Card className="rounded-3xl p-6 sm:p-8 border border-border relative overflow-hidden space-y-4">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/20 px-3 py-1 font-bold uppercase tracking-wider"
            >
              Live Badge Preview
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">Bản nháp DRAFT</span>
          </div>

          <div className="space-y-2">
            {/* Offered by Partner Badge */}
            <div className="flex items-center gap-2 text-xs text-primary font-semibold">
              <Building2 className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>
                Offered by{" "}
                <strong className="text-foreground underline decoration-primary decoration-2">
                  {partnerDisplayName}
                </strong>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {title.trim() || "Tiêu đề Khóa học của bạn sẽ hiển thị ở đây…"}
            </h2>
          </div>

          {/* Taught by Instructor */}
          <div className="pt-4 border-t border-border flex items-center gap-3">
            <Image
              src={userAvatar}
              alt={userName}
              width={40}
              height={40}
              unoptimized
              className="w-10 h-10 rounded-full border border-border bg-muted object-cover"
            />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Taught by</p>
              <p className="text-sm font-bold text-foreground">
                {userName}{" "}
                <span className="text-xs font-normal text-muted-foreground">({userTitle})</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Main Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-3xl p-6 sm:p-8 border border-border space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Organization / Partner Scoping Selection */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Partner / Tổ Chức Đại Diện Bảo Chứng <span className="text-destructive">*</span>
              </label>
              {loadingOrgs ? (
                <div className="h-10 bg-muted rounded-xl animate-pulse" />
              ) : (
                <Select
                  value={selectedOrgId}
                  onValueChange={(val) => {
                    if (val) setSelectedOrgId(val as string);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn Partner / Tổ chức">
                      {selectedOrgId === "partner_community"
                        ? "🌐 Coursera Project Network (Mặc định dành cho Giảng viên cá nhân tự do)"
                        : (() => {
                            const p = partners.find((p) => p.id === selectedOrgId);
                            return p ? `🏛️ ${p.name} (${p.slug})` : selectedOrgId;
                          })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partner_community">
                      {"🌐 Coursera Project Network (Mặc định dành cho Giảng viên cá nhân tự do)"}
                    </SelectItem>
                    {partners
                      .filter((p) => p.id !== "partner_community")
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {`🏛️ ${p.name} (${p.slug})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                100% khóa học bắt buộc phải gắn liền với 1 Partner Organization đại diện bảo chứng.
                Nếu bạn là giảng viên tự do, hệ thống tự động gán dưới tên bảo chứng{" "}
                <strong>Coursera Project Network</strong>.
              </p>
            </div>

            {/* Course Title */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Tên Khóa Học <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                required
                value={title}
                onChange={handleTitleChange}
                placeholder="Ví dụ: Lập trình Python Căn Bản Cho Người Mới Bắt Đầu"
                className="py-3 rounded-xl font-semibold bg-card"
              />
            </div>

            {/* Course Slug */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Đường dẫn tĩnh (Slug) <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center rounded-xl bg-card border border-input overflow-hidden">
                <span className="px-4 py-3 text-xs text-muted-foreground bg-muted border-r border-border">
                  /courses/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="lap-trinh-python-can-ban"
                  aria-label="Đường dẫn tĩnh (Slug)"
                  spellCheck={false}
                  className="w-full px-4 py-3 bg-transparent text-sm font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Lĩnh Vực Chuyên Môn
              </label>
              <Select
                value={subject}
                onValueChange={(val) => {
                  if (val) setSubject(val as string);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn lĩnh vực">{subject}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Khoa học Máy tính">{"Khoa học Máy tính"}</SelectItem>
                  <SelectItem value="Trí tuệ Nhân tạo & AI">{"Trí tuệ Nhân tạo & AI"}</SelectItem>
                  <SelectItem value="Khoa học Dữ liệu">{"Khoa học Dữ liệu"}</SelectItem>
                  <SelectItem value="Kinh doanh & Quản trị">{"Kinh doanh & Quản trị"}</SelectItem>
                  <SelectItem value="Thiết kế & Đồ họa">{"Thiết kế & Đồ họa"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Level */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Trình Độ Yêu Cầu
              </label>
              <Select
                value={level}
                onValueChange={(val) => {
                  if (val) setLevel(val as string);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn trình độ">
                    {level === "Sơ cấp"
                      ? "Sơ cấp (Beginner)"
                      : level === "Trung cấp"
                        ? "Trung cấp (Intermediate)"
                        : level === "Nâng cao"
                          ? "Nâng cao (Advanced)"
                          : level}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sơ cấp">{"Sơ cấp (Beginner)"}</SelectItem>
                  <SelectItem value="Trung cấp">{"Trung cấp (Intermediate)"}</SelectItem>
                  <SelectItem value="Nâng cao">{"Nâng cao (Advanced)"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Mô Tả Tổng Quan Khóa Học
              </label>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tóm tắt những kiến thức trọng tâm, mục tiêu đạt được sau khóa học…"
                className="p-3 rounded-xl bg-card"
              />
            </div>

            {/* Financial Aid Switch */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-foreground block">
                  Cho phép Học viên Nộp Đơn Hỗ Trợ Tài Chính (Financial Aid)
                </span>
                <span className="text-xs text-muted-foreground">
                  Học viên có hoàn cảnh khó khăn có thể viết bài luận xin cấp học bổng theo học khóa
                  học này.
                </span>
              </div>
              <Checkbox
                checked={financialAidEnabled}
                onCheckedChange={(checked) => setFinancialAidEnabled(Boolean(checked))}
                aria-label="Cho phép nộp đơn hỗ trợ tài chính"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <Link
              href="/instructor/courses"
              className="px-5 py-2.5 rounded-xl bg-muted text-xs font-bold text-foreground hover:bg-muted/80 transition-colors"
            >
              Hủy bỏ
            </Link>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              isLoading={submitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold"
            >
              <span>🚀 Bắt Đầu Tạo Khóa Học</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
