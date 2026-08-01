"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { usePartnersQuery, useCoursesQuery } from "@/lib/query_hooks";
import { Button } from "@/components/ui/Button";

export default function PartnerPublicPage() {
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
        <svg
          className="w-16 h-16 mx-auto text-muted-foreground mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h1 className="text-2xl font-bold text-foreground mb-2 text-balance">
          Không tìm thấy Đối tác
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Đối tác phát hành với đường dẫn &quot;{slug}&quot; không tồn tại hoặc đã dừng hoạt động.
        </p>
        <Button
          onClick={() => router.push("/")}
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-xl cursor-pointer"
        >
          Quay lại trang chủ
        </Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-16 text-foreground">
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
                    <svg
                      className="w-4 h-4 mr-1.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
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
                  <svg
                    className="w-12 h-12 mx-auto text-muted-foreground mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <p className="text-muted-foreground font-medium">
                    Hiện chưa có khóa học nào được phát hành bởi đối tác này.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {partnerCourses.map((course) => (
                    <div
                      key={course.id}
                      onClick={() => router.push(`/courses/${course.slug}`)}
                      className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between"
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
                        <h3 className="text-base font-bold text-foreground line-clamp-2 hover:text-primary transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {course.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                        <div className="flex items-center space-x-1 text-warning text-xs font-semibold">
                          <span>
                            ★ {course.averageRating ? course.averageRating.toFixed(1) : "5.0"}
                          </span>
                          <span className="text-muted-foreground font-normal">
                            ({course.reviewCount || 0})
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-primary hover:underline">
                          Xem khóa học &rarr;
                        </span>
                      </div>
                    </div>
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
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
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
                      <svg
                        className="w-3.5 h-3.5 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3.6 9h16.8M3.6 15h16.8"
                        />
                      </svg>
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* OpenBadges Compliance Badge */}
            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20">
              <div className="flex items-center space-x-3 mb-2">
                <svg
                  className="w-6 h-6 text-primary shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 14l9-5-9-5-9 5 9 5z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                  />
                </svg>
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
    </main>
  );
}
