"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePartnersQuery, useCoursesQuery } from "@/lib/query_hooks";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, ExternalLink, BookOpen, PenTool, Globe, GraduationCap } from "lucide-react";

function PartnerPublicContent() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || "";

  const { data: partners = [], isLoading: partnersLoading } = usePartnersQuery();
  const { data: courses = [], isLoading: coursesLoading } = useCoursesQuery();

  const partner = partners.find((p) => p.slug === slug || p.id === slug);

  const partnerCourses = partner
    ? courses.filter(
        (c) =>
          c.partnerName.toLowerCase() === partner.name.toLowerCase() ||
          (c.partnerLogoUrl && partner.logoUrl && c.partnerLogoUrl === partner.logoUrl),
      )
    : [];

  if (partnersLoading || coursesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-3 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span aria-live="polite">Đang tải thông tin đối tác…</span>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-card border border-border rounded-2xl text-center shadow-sm text-foreground">
        <AlertTriangle
          aria-hidden="true"
          className="w-16 h-16 mx-auto text-muted-foreground mb-4"
        />
        <h1 className="text-2xl font-bold text-foreground mb-2 text-balance">
          Không tìm thấy Đối tác
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Đối tác phát hành với đường dẫn &quot;{slug}&quot; không tồn tại hoặc đã dừng hoạt động.
        </p>
        <Button
          variant="filled"
          onClick={() => router.push("/")}
          className="rounded-xl cursor-pointer"
        >
          Quay lại trang chủ
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full bg-background pb-16 text-foreground">
      {/* Partner Banner Header */}
      <div className="relative w-full bg-card border-b border-border text-foreground">
        {partner.bannerUrl ? (
          <div className="relative h-64 sm:h-80 w-full overflow-hidden">
            <Image
              src={partner.bannerUrl}
              alt={partner.name}
              fill
              className="object-cover opacity-40"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
        ) : (
          <div className="h-48 sm:h-60 w-full" />
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-20 sm:-mt-24 pb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Partner Logo */}
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-card p-3 shadow-xl border-4 border-border flex items-center justify-center overflow-hidden shrink-0">
                {partner.logoUrl ? (
                  <Image
                    src={partner.logoUrl}
                    alt={partner.name}
                    width={120}
                    height={120}
                    className="object-contain max-h-full"
                    unoptimized
                  />
                ) : (
                  <span className="font-extrabold text-3xl text-primary">
                    {partner.name.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    Tổ chức Phát hành Chứng chỉ
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-1 tracking-tight text-balance">
                  {partner.name}
                </h1>
                {partner.websiteUrl && (
                  <a
                    href={partner.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-primary hover:underline mt-2 font-medium"
                  >
                    <ExternalLink aria-hidden="true" className="w-4 h-4 mr-1.5" />
                    {partner.websiteUrl}
                  </a>
                )}
              </div>
            </div>

            {/* Quick Stat Pill */}
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center space-x-6 text-foreground shrink-0 shadow-xs">
              <div>
                <p className="text-2xl font-black">{partnerCourses.length}</p>
                <p className="text-xs text-muted-foreground">Khóa học phát hành</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-2xl font-black">OpenBadges</p>
                <p className="text-xs text-muted-foreground">Chứng chỉ Chuẩn hóa</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left / Main Column: About & Courses */}
          <div className="lg:col-span-2 space-y-10">
            {/* About Section */}
            <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-sm text-foreground">
              <h2 className="text-xl font-bold text-foreground mb-4">Về {partner.name}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                {partner.description || "Tổ chức chưa cung cấp mô tả chi tiết."}
              </p>
            </div>

            {/* Courses List */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Các khóa học do {partner.name} phát hành
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Học viên hoàn thành khóa học sẽ nhận chứng chỉ điện tử được xác thực bởi{" "}
                    {partner.name}.
                  </p>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {partnerCourses.length} Khóa học
                </span>
              </div>

              {partnerCourses.length === 0 ? (
                <div className="bg-card rounded-2xl p-12 text-center border border-border">
                  <BookOpen
                    aria-hidden="true"
                    className="w-12 h-12 mx-auto text-muted-foreground mb-3"
                  />
                  <p className="text-muted-foreground font-medium">
                    Hiện chưa có khóa học nào được phát hành bởi đối tác này.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {partnerCourses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/courses/${course.slug}`}
                      aria-label={`Khóa học ${course.title}`}
                      className="text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/50 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-primary/10 text-primary border border-primary/20">
                            {course.subject || "Khóa học"}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-muted text-muted-foreground border border-border">
                            {course.level || "Cơ bản"}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-foreground min-w-0 line-clamp-2 hover:text-primary transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {course.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                        <div className="flex items-center space-x-1 text-xs font-semibold text-amber-400">
                          <span>
                            ★ {course.averageRating ? course.averageRating.toFixed(1) : "5.0"}
                          </span>
                          <span className="text-muted-foreground font-normal">
                            ({course.reviewCount || 0})
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-primary">
                          Xem khóa học &rarr;
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar Column: Verification & Signer Info */}
          <div className="space-y-6">
            {/* Signer Info Box */}
            {(partner.signerName || partner.signerTitle) && (
              <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider mb-4">
                  Đại diện Phát hành
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                    {partner.signerName ? (
                      partner.signerName.charAt(0).toUpperCase()
                    ) : (
                      <PenTool aria-hidden="true" className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-base">{partner.signerName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{partner.signerTitle}</p>
                  </div>
                </div>

                {partner.signatureImageUrl && (
                  <div className="mt-4 pt-4 border-t border-border text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                      Mẫu chữ ký điện tử đã được xác minh:
                    </p>
                    <div className="inline-block p-2 bg-muted rounded-xl border border-border">
                      <Image
                        src={partner.signatureImageUrl}
                        alt="Chữ ký đại diện"
                        width={120}
                        height={48}
                        className="h-12 object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Allowed Domains Box */}
            {partner.allowedDomains && partner.allowedDomains.length > 0 && (
              <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider mb-3">
                  Tên miền Cấp Chứng chỉ
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Chỉ các chứng chỉ phát hành từ hệ thống thuộc danh sách tên miền dưới đây mới có
                  giá trị pháp lý:
                </p>
                <div className="flex flex-wrap gap-2">
                  {partner.allowedDomains.map((domain, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted text-foreground font-mono text-xs rounded-lg border border-border"
                    >
                      <Globe aria-hidden="true" className="w-3.5 h-3.5 text-primary" />
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* OpenBadges Compliance Badge */}
            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20">
              <div className="flex items-center space-x-3 mb-2">
                <GraduationCap aria-hidden="true" className="w-6 h-6 text-primary shrink-0" />
                <h3 className="font-bold text-foreground text-sm">
                  Tương thích OpenBadges v2.0 / v3.0
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Chứng chỉ được cấp bởi {partner.name} chứa chữ ký số mã hóa PKI công khai, tương
                thích chuẩn toàn cầu OpenBadges và có thể chia sẻ lên LinkedIn, CV điện tử.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartnerPublicPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
          <span aria-live="polite">Đang tải thông tin đối tác…</span>
        </div>
      }
    >
      <PartnerPublicContent />
    </Suspense>
  );
}
