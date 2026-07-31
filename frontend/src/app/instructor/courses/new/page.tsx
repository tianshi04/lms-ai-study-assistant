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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Breadcrumbs & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Link href="/instructor/courses" className="hover:underline">
                Giao diện Giảng viên
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Soạn khóa học mới
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance">
              Khởi Tạo Khóa Học Mới
            </h1>
          </div>

          <Link
            href="/instructor/courses"
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ← Quay lại Danh sách
          </Link>
        </div>

        {/* Live Preview Card */}
        <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-4">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider border border-blue-400/20">
              Live Badge Preview
            </span>
            <span className="text-xs text-slate-400 font-mono">Bản nháp DRAFT</span>
          </div>

          <div className="space-y-2">
            {/* Offered by Partner Badge */}
            <div className="flex items-center gap-2 text-xs text-blue-200 font-semibold">
              <svg
                className="w-4 h-4 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v12a2 2 0 01-2 2"
                />
              </svg>
              <span>
                Offered by{" "}
                <strong className="text-white underline decoration-blue-400 decoration-2">
                  {partnerDisplayName}
                </strong>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {title.trim() || "Tiêu đề Khóa học của bạn sẽ hiển thị ở đây…"}
            </h2>
          </div>

          {/* Taught by Instructor */}
          <div className="pt-4 border-t border-white/10 flex items-center gap-3">
            <Image
              src={userAvatar}
              alt={userName}
              width={40}
              height={40}
              unoptimized
              className="w-10 h-10 rounded-full border border-white/20 bg-slate-800 object-cover"
            />
            <div>
              <p className="text-xs text-slate-300 font-medium">Taught by</p>
              <p className="text-sm font-bold text-white">
                {userName} <span className="text-xs font-normal text-slate-400">({userTitle})</span>
              </p>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-200 dark:border-slate-800 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Organization / Partner Scoping Selection */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Partner / Tổ Chức Đại Diện Bảo Chứng <span className="text-rose-500">*</span>
              </label>
              {loadingOrgs ? (
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                >
                  <option value="partner_community">
                    🌐 Coursera Project Network (Mặc định dành cho Giảng viên cá nhân tự do)
                  </option>
                  {partners
                    .filter((p) => p.id !== "partner_community")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        🏛️ {p.name} ({p.slug})
                      </option>
                    ))}
                </select>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                100% khóa học bắt buộc phải gắn liền với 1 Partner Organization đại diện bảo chứng.
                Nếu bạn là giảng viên tự do, hệ thống tự động gán dưới tên bảo chứng{" "}
                <strong>Coursera Project Network</strong>.
              </p>
            </div>

            {/* Course Title */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Tên Khóa Học <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={handleTitleChange}
                placeholder="Ví dụ: Lập trình Python Căn Bản Cho Người Mới Bắt Đầu"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              />
            </div>

            {/* Course Slug */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Đường dẫn tĩnh (Slug) <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
                <span className="px-4 py-3 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-700">
                  /courses/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="lap-trinh-python-can-ban"
                  className="w-full px-4 py-3 bg-transparent text-sm font-mono text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Lĩnh Vực Chuyên Môn
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                <option value="Khoa học Máy tính">Khoa học Máy tính</option>
                <option value="Trí tuệ Nhân tạo & AI">Trí tuệ Nhân tạo & AI</option>
                <option value="Khoa học Dữ liệu">Khoa học Dữ liệu</option>
                <option value="Kinh doanh & Quản trị">Kinh doanh & Quản trị</option>
                <option value="Thiết kế & Đồ họa">Thiết kế & Đồ họa</option>
              </select>
            </div>

            {/* Level */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Trình Độ Yêu Cầu
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                <option value="Sơ cấp">Sơ cấp (Beginner)</option>
                <option value="Trung cấp">Trung cấp (Intermediate)</option>
                <option value="Nâng cao">Nâng cao (Advanced)</option>
              </select>
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Mô Tả Tổng Quan Khóa Học
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tóm tắt những kiến thức trọng tâm, mục tiêu đạt được sau khóa học…"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              />
            </div>

            {/* Financial Aid Switch */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  Cho phép Học viên Nộp Đơn Hỗ Trợ Tài Chính (Financial Aid)
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Học viên có hoàn cảnh khó khăn có thể viết bài luận xin cấp học bổng theo học khóa
                  học này.
                </span>
              </div>
              <input
                type="checkbox"
                checked={financialAidEnabled}
                onChange={(e) => setFinancialAidEnabled(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded border-slate-300 focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Link
              href="/instructor/courses"
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            >
              Hủy bỏ
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span aria-live="polite">Đang khởi tạo…</span>
                </>
              ) : (
                <span>🚀 Bắt Đầu Tạo Khóa Học</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
